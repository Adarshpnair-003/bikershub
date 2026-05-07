import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { bikeApi } from '../utils/bikeApi.js';
import { getCurrentUser } from '../utils/auth.js';
import TabBar from '../components/TabBar.jsx';

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = getCurrentUser();

  const [profile, setProfile] = useState(null);
  const [bikes, setBikes] = useState([]);
  const [following, setFollowing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [pRes, bRes] = await Promise.all([
          api.get(`/api/users/${id}`),
          bikeApi.listByUser(id)
        ]);
        if (cancelled) return;
        if (pRes?.success) {
          setProfile(pRes.data);
          const followers = pRes.data.followers || [];
          setFollowing(followers.some((f) => String(f._id || f) === String(me?.id)));
        } else {
          setError(pRes?.error?.message || 'User not found');
        }
        if (bRes?.success) setBikes(bRes.data || []);
      } catch {
        if (!cancelled) setError('Network error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, me?.id]);

  async function toggleFollow() {
    const next = !following;
    setFollowing(next);
    try {
      const path = next ? `/api/users/follow/${id}` : `/api/users/unfollow/${id}`;
      await api.put(path);
    } catch {
      setFollowing(!next); // rollback
    }
  }

  if (error) return <div className="page-dark" style={{ padding: 60, textAlign: 'center', color: '#E53935' }}>{error}</div>;
  if (!profile) return <div className="page-dark" style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>Loading…</div>;

  const isMe = String(profile._id) === String(me?.id);
  const username = profile.username || 'rider';
  const bio = profile.bio || '';
  const avatarUrl = profile.profilePic?.url || profile.profilePic;

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-left">
          <button className="app-header-btn" onClick={() => navigate(-1)}>←</button>
        </div>
        <div className="app-header-title">{username}</div>
        <div className="app-header-actions" />
      </header>

      <section style={{ padding: '24px 20px 8px', textAlign: 'center' }}>
        {avatarUrl
          ? <img src={avatarUrl} alt={username} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }} />
          : <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#343434', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700 }}>{username.charAt(0).toUpperCase()}</div>
        }
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '12px 0 2px' }}>{username}</h1>
        {bio && <div style={{ fontSize: 14, color: '#cbd5e1', marginTop: 8, padding: '0 16px' }}>{bio}</div>}
      </section>

      {!isMe && (
        <div style={{ padding: '8px 16px' }}>
          <button
            onClick={toggleFollow}
            style={{
              width: '100%', height: 44, borderRadius: 10,
              background: following ? 'transparent' : '#E53935',
              color: following ? '#F3F3F3' : '#fff',
              border: following ? '1px solid rgba(243,243,243,0.18)' : '1px solid #E53935',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            {following ? 'Following' : 'Follow'}
          </button>
        </div>
      )}

      {bikes.length > 0 && (
        <section style={{ padding: '16px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(243,243,243,0.6)', textTransform: 'uppercase', marginBottom: 10 }}>
            Garage · {bikes.length}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {bikes.map((b) => (
              <Link
                key={b._id}
                to={`/garage/${id}/${b._id}`}
                style={{
                  position: 'relative', aspectRatio: '4/3',
                  background: '#1E1E1E', borderRadius: 8,
                  overflow: 'hidden', textDecoration: 'none', color: '#F3F3F3'
                }}
              >
                {b.photo?.url && <img src={b.photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '8px 10px', background: 'rgba(0,0,0,0.55)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {b.isPrimary && '★ '}{b.brand} {b.model}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <TabBar />
    </div>
  );
}
