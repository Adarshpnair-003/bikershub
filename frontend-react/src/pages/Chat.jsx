import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api.js';
import { socketManager } from '../utils/socket.js';
import { getCurrentUser } from '../utils/auth.js';

function timeShort(d) {
  if (!d) return '';
  const t = new Date(d);
  return t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const me = getCurrentUser();
  const [convo, setConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [cRes, mRes] = await Promise.all([
          api.get(`/api/conversations/${conversationId}`),
          api.get(`/api/chat/conversation/${conversationId}`)
        ]);
        if (cancelled) return;
        if (cRes?.success) setConvo(cRes.data);
        const list = mRes?.success
          ? (Array.isArray(mRes.data) ? mRes.data : (mRes.data?.messages || []))
          : [];
        setMessages(list);
      } catch { /* */ }
    }
    load();
    api.put(`/api/chat/read/${conversationId}`).catch(() => {});

    // Socket — best-effort, may not work without proper auth setup
    let socket;
    try {
      socket = socketManager?.connect?.();
      if (socket && socket.on) {
        const handler = (msg) => {
          if (msg?.conversationId === conversationId || msg?.conversation === conversationId) {
            setMessages((prev) => [...prev, msg]);
          }
        };
        socket.on('newMessage', handler);
        return () => {
          cancelled = true;
          socket.off?.('newMessage', handler);
        };
      }
    } catch { /* socket optional */ }

    return () => { cancelled = true; };
  }, [conversationId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const res = await api.post('/api/chat/send', { conversationId, content: trimmed });
      if (res?.success) {
        setMessages((prev) => [...prev, res.data]);
        setText('');
      }
    } finally { setBusy(false); }
  }

  const other = convo
    ? (convo.participants || []).find((p) => String(p._id || p) !== String(me?.id))
    : null;
  const otherName = other?.username || 'Rider';

  return (
    <div className="page-dark" style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <header className="app-header">
        <div className="app-header-left">
          <button className="app-header-btn" onClick={() => navigate('/conversations')}>←</button>
        </div>
        <div className="app-header-title">{otherName}</div>
        <div className="app-header-actions" />
      </header>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {messages.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Say hi 👋</div>}
        {messages.map((m, i) => {
          const senderId = m.sender?._id || m.sender;
          const mine = String(senderId) === String(me?.id);
          return (
            <div
              key={m._id || i}
              style={{
                display: 'flex',
                justifyContent: mine ? 'flex-end' : 'flex-start',
                padding: '4px 12px'
              }}
            >
              <div style={{
                maxWidth: '75%',
                background: mine ? '#E53935' : '#1E1E1E',
                color: mine ? '#fff' : '#F3F3F3',
                padding: '10px 14px',
                borderRadius: mine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                fontSize: 14, lineHeight: 1.4
              }}>
                {m.content}
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2, textAlign: 'right' }}>
                  {timeShort(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={sendMessage}
        style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid rgba(243,243,243,0.06)', background: '#0C0C0C' }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          style={{ flex: 1, background: '#1E1E1E', border: '1px solid rgba(243,243,243,0.08)', borderRadius: 24, color: '#F3F3F3', padding: '10px 16px', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
        />
        <button
          type="submit"
          disabled={!text.trim() || busy}
          style={{ background: text.trim() ? '#E53935' : '#343434', color: '#fff', border: 'none', borderRadius: 24, padding: '0 18px', fontSize: 13, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
