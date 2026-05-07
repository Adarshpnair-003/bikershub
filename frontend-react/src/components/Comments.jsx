import { useEffect, useRef, useState } from 'react';
import { api } from '../utils/api.js';
import { getCurrentUser } from '../utils/auth.js';
import { linkifyMentions } from '../utils/mentions.js';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diffMs / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m`;
  if (hr < 24) return `${hr}h`;
  if (day < 7) return `${day}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Comments({ postId }) {
  const [comments, setComments] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const me = getCurrentUser();

  async function load() {
    try {
      const res = await api.get(`/api/comments/${postId}`);
      // Endpoint returns array directly in vanilla — already normalized to {data: [...]}
      const list = res?.success
        ? (Array.isArray(res.data) ? res.data : (res.data?.comments || []))
        : [];
      setComments(list);
    } catch {
      setComments([]);
    }
  }

  useEffect(() => { load(); }, [postId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const res = await api.post(`/api/comments/${postId}`, { content: trimmed });
      if (res?.success) {
        setText('');
        load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="comments-section">
      <h3 style={{ padding: '12px 16px', fontSize: 15, fontWeight: 700, borderBottom: '1px solid rgba(243,243,243,0.06)' }}>
        Comments
      </h3>

      <div>
        {comments === null && (
          <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Loading…</div>
        )}
        {comments && comments.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>Be the first to comment</div>
        )}
        {comments && comments.map((c) => {
          const author = c.author || {};
          const username = author.username || 'rider';
          return (
            <div
              key={c._id}
              style={{ padding: '10px 16px', borderBottom: '1px solid rgba(243,243,243,0.04)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <strong style={{ fontSize: 13 }}>{username}</strong>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(c.createdAt)}</span>
              </div>
              <div
                style={{ fontSize: 14, lineHeight: 1.5 }}
                dangerouslySetInnerHTML={{ __html: linkifyMentions(c.content || '', c.mentions) }}
              />
            </div>
          );
        })}
      </div>

      {me && (
        <form
          onSubmit={handleSubmit}
          style={{
            position: 'sticky',
            bottom: 0,
            background: '#0C0C0C',
            display: 'flex',
            gap: 8,
            padding: 12,
            borderTop: '1px solid rgba(243,243,243,0.06)'
          }}
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            style={{
              flex: 1,
              background: '#1E1E1E',
              border: '1px solid rgba(243,243,243,0.08)',
              borderRadius: 24,
              color: '#F3F3F3',
              padding: '10px 16px',
              fontSize: 14,
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            style={{
              background: text.trim() ? '#E53935' : '#343434',
              color: '#fff',
              border: 'none',
              borderRadius: 24,
              padding: '0 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: text.trim() ? 'pointer' : 'default'
            }}
          >
            {busy ? '…' : 'Send'}
          </button>
        </form>
      )}
    </div>
  );
}
