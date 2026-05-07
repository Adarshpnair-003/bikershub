import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import TabBar from '../components/TabBar.jsx';

function timeAgo(d) {
  const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

const TYPE_ICONS = {
  like: '❤️',
  comment: '💬',
  follow: '👥',
  mention: '📣',
  achievement: '🏆',
  club_request: '🏍',
  club_approved: '✅',
  club_rejected: '❌',
  ride_invite: '🛵',
  ride_join: '🛵'
};

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get('/api/notifications');
        if (cancelled) return;
        const list = res?.success
          ? (Array.isArray(res.data) ? res.data : (res.data?.notifications || []))
          : [];
        setItems(list);
        // Mark all as read
        api.put('/api/notifications/read-all').catch(() => {});
      } catch {
        if (!cancelled) { setError('Failed to load.'); setItems([]); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-left">
          <button className="app-header-btn" onClick={() => navigate('/home')} aria-label="Back">←</button>
        </div>
        <div className="app-header-title">Notifications</div>
        <div className="app-header-actions" />
      </header>

      <div>
        {items === null && <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Loading…</div>}
        {items && items.length === 0 && !error && (
          <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>No notifications yet</div>
        )}
        {items && error && <div style={{ padding: 24, textAlign: 'center', color: '#E53935' }}>{error}</div>}
        {items && items.map((n) => {
          const sender = n.sender || {};
          const senderName = sender.username || 'Someone';
          const text = (() => {
            switch (n.type) {
              case 'like': return `${senderName} liked your post`;
              case 'comment': return `${senderName} commented on your post`;
              case 'follow': return `${senderName} started following you`;
              case 'mention': return `${senderName} mentioned you`;
              case 'achievement': return `You earned a new achievement`;
              case 'club_request': return `${senderName} requested to join your club`;
              case 'club_approved': return `Your join request was approved`;
              case 'club_rejected': return `Your join request was declined`;
              case 'ride_invite': return `${senderName} invited you to a ride`;
              case 'ride_join': return `${senderName} joined your ride`;
              default: return n.type;
            }
          })();

          let to = '/home';
          if (n.post) to = `/posts/${n.post}`;
          else if (n.ride) to = `/rides/${n.ride}`;
          else if (n.club) to = `/clubs/${n.club}`;
          else if (n.type === 'follow' && sender._id) to = `/user/${sender._id}`;
          else if (n.type === 'achievement') to = '/profile';

          return (
            <Link
              key={n._id}
              to={to}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                borderBottom: '1px solid rgba(243,243,243,0.04)',
                textDecoration: 'none', color: '#F3F3F3',
                background: n.isRead ? 'transparent' : 'rgba(229,57,53,0.05)'
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: '#1E1E1E', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0
              }}>
                {TYPE_ICONS[n.type] || '🔔'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, lineHeight: 1.3 }}>{text}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{timeAgo(n.createdAt)}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <TabBar />
    </div>
  );
}
