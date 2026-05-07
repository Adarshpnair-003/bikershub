import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bikeApi } from '../utils/bikeApi.js';
import { getCurrentUser } from '../utils/auth.js';
import PostCard from '../components/PostCard.jsx';

export default function BikeDetail() {
  const navigate = useNavigate();
  const { userId, bikeId } = useParams();
  const [bike, setBike] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const me = getCurrentUser();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [bRes, pRes] = await Promise.all([
          bikeApi.get(bikeId),
          bikeApi.listPosts(bikeId)
        ]);
        if (cancelled) return;
        if (bRes?.success) setBike(bRes.data);
        else setError(bRes?.error?.message || 'Bike not found');
        if (pRes?.success) setPosts(pRes.data?.posts || []);
      } catch {
        if (!cancelled) setError('Network error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [bikeId]);

  if (error) {
    return (
      <div className="page-dark" style={{ padding: 60, textAlign: 'center', color: '#E53935' }}>
        {error}
      </div>
    );
  }
  if (!bike) {
    return (
      <div className="page-dark" style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
        Loading…
      </div>
    );
  }

  const isOwner = me && bike.owner && String(me.id) === String(bike.owner._id || bike.owner);
  const titleText = `${bike.brand || ''} ${bike.model || ''}`.trim();

  async function handleSetPrimary() {
    try {
      await bikeApi.setPrimary(bike._id);
      navigate('/profile');
    } catch {
      alert('Failed to set as current ride.');
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this bike?')) return;
    try {
      const r = await bikeApi.remove(bike._id);
      if (r.success) navigate('/profile');
      else alert(r.error?.message || 'Failed to delete.');
    } catch {
      alert('Network error.');
    }
  }

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-left">
          <button className="app-header-btn" onClick={() => navigate(userId ? `/user/${userId}` : '/profile')}>←</button>
        </div>
        <div className="app-header-title">{titleText}</div>
        <div className="app-header-actions" />
      </header>

      <div style={{ width: '100%', aspectRatio: '4/3', background: '#1E1E1E' }}>
        {bike.photo?.url && <img src={bike.photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, padding: '16px 20px 4px', margin: 0 }}>{titleText}</h1>
      {bike.nickname && <div style={{ padding: '0 20px 12px', fontSize: 14, color: 'rgba(243,243,243,0.6)' }}>"{bike.nickname}"</div>}

      <Row label="Year" value={bike.year} />
      <Row label="Type" value={bike.type} />
      <Row label="Engine" value={`${bike.engineCC || ''} cc`} />
      <Row label="Color" value={bike.color} />

      {isOwner && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '18px 20px' }}>
          <button onClick={() => navigate(`/edit-bike/${bike._id}`)} style={btnStyle('primary')}>Edit</button>
          {!bike.isPrimary && <button onClick={handleSetPrimary} style={btnStyle('outline')}>Set as current ride</button>}
          <button onClick={handleDelete} style={btnStyle('danger')}>Delete</button>
        </div>
      )}

      <section style={{ padding: '22px 0 8px' }}>
        <div style={{ padding: '0 20px 12px', fontSize: 15, fontWeight: 700 }}>Posts featuring this bike</div>
        {posts.length === 0
          ? <div style={{ padding: 24, textAlign: 'center', color: 'rgba(243,243,243,0.4)', fontSize: 13 }}>No posts yet.</div>
          : posts.map((p) => <PostCard key={p._id} post={p} />)
        }
      </section>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(243,243,243,0.06)' }}>
      <span style={{ fontSize: 12, color: 'rgba(243,243,243,0.5)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</span>
      <span style={{ fontSize: 14.5, color: '#F3F3F3', fontWeight: 600, textTransform: 'capitalize' }}>{value || ''}</span>
    </div>
  );
}

function btnStyle(variant) {
  const base = {
    width: '100%', height: 44, borderRadius: 10,
    fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', border: '1px solid transparent'
  };
  if (variant === 'primary') return { ...base, background: '#E53935', color: '#fff', borderColor: '#E53935' };
  if (variant === 'outline') return { ...base, background: 'transparent', color: '#F3F3F3', borderColor: 'rgba(243,243,243,0.18)' };
  return { ...base, background: 'transparent', color: '#E53935', borderColor: 'rgba(229,57,53,0.35)' };
}
