import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { getCurrentUser } from '../utils/auth.js';
import TabBar from '../components/TabBar.jsx';

function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

export default function Conversations() {
  const navigate = useNavigate();
  const me = getCurrentUser();
  const [convs, setConvs] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get('/api/conversations');
        if (cancelled) return;
        const list = res?.success
          ? (Array.isArray(res.data) ? res.data : (res.data?.conversations || []))
          : [];
        setConvs(list);
      } catch {
        if (!cancelled) setConvs([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-left">
          <button className="app-header-btn" onClick={() => navigate('/home')}>←</button>
        </div>
        <div className="app-header-title">Messages</div>
        <div className="app-header-actions" />
      </header>

      <div>
        {convs === null && <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Loading…</div>}
        {convs && convs.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>No conversations yet</div>
        )}
        {convs && convs.map((c) => {
          // Find the "other" participant
          const other = (c.participants || []).find((p) => String(p._id || p) !== String(me?.id));
          const otherId = other?._id || other;
          const username = other?.username || 'Rider';
          return (
            <Link
              key={c._id}
              to={`/chat/${c._id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                borderBottom: '1px solid rgba(243,243,243,0.04)',
                textDecoration: 'none', color: '#F3F3F3'
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: '#343434',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 18
              }}>
                {username.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 15 }}>{username}</strong>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(c.lastMessageAt || c.updatedAt)}</span>
                </div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.lastMessage || 'Tap to chat'}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <TabBar />
    </div>
  );
}
