import { useEffect, useRef, useState } from 'react';
import { api } from '../utils/api.js';
import { findActiveMention } from '../utils/mentions.js';

/**
 * Hook: attaches @-mention autocomplete to a textarea/input ref.
 *
 * Usage:
 *   const inputRef = useRef(null);
 *   useMentionAutocomplete(inputRef);
 *   <textarea ref={inputRef} />
 */
export function useMentionAutocomplete(inputRef) {
  const [suggestions, setSuggestions] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 200 });
  const debounceRef = useRef(null);
  const lastQueryRef = useRef(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    function updatePos() {
      const rect = el.getBoundingClientRect();
      setPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.min(rect.width, 280)
      });
    }

    async function fetchSuggestions(q) {
      try {
        const res = await api.get(`/api/search?q=${encodeURIComponent(q)}`);
        const list = (res?.success && Array.isArray(res.data?.users))
          ? res.data.users
          : [];
        setSuggestions(list.slice(0, 6).map((u) => ({
          _id: u._id || u.id,
          username: u.username,
          profilePic: u.profilePic
        })).filter((u) => u.username));
        setActiveIdx(0);
      } catch { /* ignore */ }
    }

    function onInput() {
      const cursor = el.selectionStart || 0;
      const ctx = findActiveMention(el.value, cursor);
      if (!ctx || ctx.match.length < 1) {
        setOpen(false);
        return;
      }
      if (ctx.match === lastQueryRef.current) return;
      lastQueryRef.current = ctx.match;
      updatePos();
      setOpen(true);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(ctx.match), 200);
    }

    function onKeydown(e) {
      if (!open || suggestions.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySelection(activeIdx);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    }

    function applySelection(idx) {
      const u = suggestions[idx];
      if (!u) return;
      const cursor = el.selectionStart || 0;
      const ctx = findActiveMention(el.value, cursor);
      if (!ctx) return;
      const before = el.value.slice(0, ctx.start);
      const after = el.value.slice(ctx.end);
      const insertion = `@${u.username} `;
      el.value = before + insertion + after;
      // Trigger change for React-controlled input compatibility
      const event = new Event('input', { bubbles: true });
      el.dispatchEvent(event);
      const newPos = (before + insertion).length;
      el.setSelectionRange(newPos, newPos);
      el.focus();
      setOpen(false);
    }

    el.addEventListener('input', onInput);
    el.addEventListener('keydown', onKeydown);
    el.addEventListener('blur', () => setTimeout(() => setOpen(false), 100));

    return () => {
      el.removeEventListener('input', onInput);
      el.removeEventListener('keydown', onKeydown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputRef, open, suggestions, activeIdx]);

  function handleItemClick(idx, e) {
    e.preventDefault();
    const el = inputRef.current;
    if (!el) return;
    const u = suggestions[idx];
    if (!u) return;
    const cursor = el.selectionStart || 0;
    const ctx = findActiveMention(el.value, cursor);
    if (!ctx) return;
    const before = el.value.slice(0, ctx.start);
    const after = el.value.slice(ctx.end);
    const insertion = `@${u.username} `;
    el.value = before + insertion + after;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    const newPos = (before + insertion).length;
    el.setSelectionRange(newPos, newPos);
    el.focus();
    setOpen(false);
  }

  if (!open || suggestions.length === 0) return null;

  return (
    <div
      className="mention-autocomplete open"
      style={{ position: 'absolute', top: pos.top, left: pos.left, minWidth: pos.width }}
    >
      {suggestions.map((u, i) => (
        <div
          key={u._id}
          className={`mention-item ${i === activeIdx ? 'active' : ''}`}
          onMouseDown={(e) => handleItemClick(i, e)}
        >
          <div className="mention-item-avatar">
            {u.profilePic
              ? <img src={u.profilePic} alt="" />
              : (u.username || '?').charAt(0).toUpperCase()
            }
          </div>
          <span className="mention-item-name">@{u.username}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Convenience: render the autocomplete UI by calling the hook from a parent.
 * Just import this default and embed it after your textarea, passing the ref.
 */
export default function MentionAutocomplete({ inputRef }) {
  return useMentionAutocomplete(inputRef);
}
