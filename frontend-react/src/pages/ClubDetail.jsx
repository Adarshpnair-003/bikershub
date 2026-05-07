import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api.js';
import { getCurrentUser } from '../utils/auth.js';
import PostCard from '../components/PostCard.jsx';

export default function ClubDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = getCurrentUser();

  const [club, setClub] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [cRes, pRes] = await Promise.all([
        api.get(`/api/clubs/${id}`),
        api.get(`/api/clubs/${id}/posts`)
      ]);
      if (cRes?.success) setClub(cRes.data);
      else setError(cRes?.error?.message || 'Club not found');
      if (pRes?.success) {
        setPosts(Array.isArray(pRes.data) ? pRes.data : (pRes.data?.posts || []));
      }
    } catch { setError('Network error'); }
  }

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) load();
    return () => { cancelled = true; };
  }, [id]);

  async function handleJoin() {
    setBusy(true);
    try {
      await api.post(`/api/clubs/${id}/join`);
      load();
    } finally { setBusy(false); }
  }

  async function handleLeave() {
    if (!confirm('Leave this club?')) return;
    setBusy(true);
    try {
      await api.put(`/api/clubs/${id}/leave`);
      load();
    } finally { setBusy(false); }
  }

  if (error) return <div className="page-dark" style={{ padding: 60, textAlign: 'center', color: '#E53935' }}>{error}</div>;
  if (!club) return <div className="page-dark" style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>Loading…</div>;

  const isMember = (club.members || []).some((m) => String(m._id || m) === String(me?.id));
  const isOwner = String(club.owner?._id || club.owner) === String(me?.id);

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-left">
          <button className="app-header-btn" onClick={() => navigate('/clubs')}>←</button>
        </div>
        <div className="app-header-title">{club.name}</div>
        <div className="app-header-actions" />
      </header>

      <div style={{ padding: '20px', borderBottom: '1px solid rgba(243,243,243,0.06)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>{club.name}</h1>
        {club.description && <p style={{ color: '#cbd5e1', fontSize: 14, margin: '0 0 12px' }}>{club.description}</p>}
        <div style={{ fontSize: 13, color: '#9ca3af' }}>
          {club.privacy || (club.isPrivate ? 'private' : 'public')} · {(club.members || []).length} members
        </div>

        {!isMember && (
          <button
            onClick={handleJoin}
            disabled={busy}
            style={{ marginTop: 14, width: '100%', height: 44, borderRadius: 10, background: '#E53935', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {busy ? '…' : (club.isPrivate ? 'Request to join' : 'Join club')}
          </button>
        )}
        {isMember && !isOwner && (
          <button
            onClick={handleLeave}
            disabled={busy}
            style={{ marginTop: 14, width: '100%', height: 44, borderRadius: 10, background: 'transparent', color: '#E53935', border: '1px solid rgba(229,57,53,0.35)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {busy ? '…' : 'Leave club'}
          </button>
        )}
      </div>

      <section>
        <div style={{ padding: '16px 20px 8px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(243,243,243,0.6)' }}>
          Posts
        </div>
        {posts.length === 0
          ? <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>No posts yet</div>
          : posts.map((p) => <PostCard key={p._id} post={p} />)
        }
      </section>
    </div>
  );
}
