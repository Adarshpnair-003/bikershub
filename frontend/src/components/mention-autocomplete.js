/**
 * Mention autocomplete — attach to a textarea/input.
 * When user types `@xyz`, fetch matching usernames and show a dropdown.
 *
 * Usage:
 *   const detach = attachMentionAutocomplete(textareaEl);
 *   // later: detach() to clean up
 */

import { api } from '../utils/api.js';
import { findActiveMention } from '../utils/mentions.js';

let activeDropdown = null;

function escape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function attachMentionAutocomplete(input) {
  if (!input || input.dataset.mentionBound === '1') return () => {};
  input.dataset.mentionBound = '1';

  const dropdown = document.createElement('div');
  dropdown.className = 'mention-autocomplete';
  document.body.appendChild(dropdown);

  let users = [];
  let activeIdx = 0;
  let currentQuery = null;
  let abortCtl = null;
  let debounceTimer = null;

  function close() {
    dropdown.classList.remove('open');
    users = [];
    activeIdx = 0;
    currentQuery = null;
  }

  function positionDropdown() {
    const rect = input.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.minWidth = `${Math.min(rect.width, 280)}px`;
  }

  function renderItems() {
    if (users.length === 0) {
      close();
      return;
    }
    dropdown.innerHTML = users.map((u, i) => {
      const initial = (u.username || '?').charAt(0).toUpperCase();
      const avatar = u.profilePic
        ? `<div class="mention-item-avatar"><img src="${escape(u.profilePic)}" alt=""></div>`
        : `<div class="mention-item-avatar">${escape(initial)}</div>`;
      return `<div class="mention-item ${i === activeIdx ? 'active' : ''}" data-idx="${i}">${avatar}<span class="mention-item-name">@${escape(u.username)}</span></div>`;
    }).join('');
    positionDropdown();
    dropdown.classList.add('open');
    activeDropdown = dropdown;

    dropdown.querySelectorAll('.mention-item').forEach((el) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent textarea blur
        applySelection(Number(el.dataset.idx));
      });
    });
  }

  function applySelection(idx) {
    const u = users[idx];
    if (!u) return;
    const cursor = input.selectionStart || 0;
    const ctx = findActiveMention(input.value, cursor);
    if (!ctx) { close(); return; }
    const before = input.value.slice(0, ctx.start);
    const after = input.value.slice(ctx.end);
    const insertion = `@${u.username} `;
    input.value = before + insertion + after;
    const newPos = (before + insertion).length;
    input.setSelectionRange(newPos, newPos);
    input.focus();
    close();
  }

  async function fetchSuggestions(q) {
    if (abortCtl) abortCtl.abort();
    abortCtl = new AbortController();
    try {
      const res = await api.get(`/api/search?q=${encodeURIComponent(q)}&type=users`);
      const list = (res?.success && Array.isArray(res.data?.users))
        ? res.data.users
        : (res?.success && Array.isArray(res.data) ? res.data : []);
      users = list.slice(0, 6).map((u) => ({
        _id: u._id || u.id,
        username: u.username,
        profilePic: u.profilePic
      })).filter((u) => u.username);
      activeIdx = 0;
      renderItems();
    } catch {
      // silently swallow
    }
  }

  function onInput() {
    const cursor = input.selectionStart || 0;
    const ctx = findActiveMention(input.value, cursor);
    if (!ctx || ctx.match.length < 1) {
      close();
      return;
    }
    if (ctx.match === currentQuery) return;
    currentQuery = ctx.match;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchSuggestions(ctx.match), 200);
  }

  function onKeydown(e) {
    if (!dropdown.classList.contains('open') || users.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = (activeIdx + 1) % users.length;
      renderItems();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = (activeIdx - 1 + users.length) % users.length;
      renderItems();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      applySelection(activeIdx);
    } else if (e.key === 'Escape') {
      close();
    }
  }

  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeydown);
  input.addEventListener('blur', () => setTimeout(close, 100));
  window.addEventListener('scroll', close, true);
  window.addEventListener('resize', close);

  return function detach() {
    input.removeEventListener('input', onInput);
    input.removeEventListener('keydown', onKeydown);
    window.removeEventListener('scroll', close, true);
    window.removeEventListener('resize', close);
    dropdown.remove();
    if (activeDropdown === dropdown) activeDropdown = null;
  };
}
