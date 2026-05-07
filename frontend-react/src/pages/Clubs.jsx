import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import ClubCard from '../components/ClubCard.jsx';
import TabBar from '../components/TabBar.jsx';

export default function Clubs() {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get('/api/clubs');
        if (cancelled) return;
        const list = res?.success
          ? (Array.isArray(res.data) ? res.data : (res.data?.clubs || []))
          : [];
        setClubs(list);
      } catch {
        if (!cancelled) setClubs([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleJoin(clubId) {
    try {
      await api.post(`/api/clubs/${clubId}/join`);
      // Refetch to update counts/state
      const res = await api.get('/api/clubs');
      if (res?.success) {
        setClubs(Array.isArray(res.data) ? res.data : (res.data?.clubs || []));
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-title">Clubs</div>
        <div className="app-header-actions">
          <button
            className="app-header-btn"
            onClick={() => navigate('/create-club')}
            aria-label="Create club"
            style={{ fontSize: 22 }}
          >
            +
          </button>
        </div>
      </header>

      <div style={{ padding: '12px 16px' }}>
        {clubs === null && <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Loading…</div>}
        {clubs && clubs.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
            No clubs yet — <Link to="/create-club" style={{ color: '#E53935' }}>create one</Link>?
          </div>
        )}
        {clubs && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {clubs.map((c) => (
              <ClubCard key={c._id} club={c} mode="discover" onJoin={handleJoin} />
            ))}
          </div>
        )}
      </div>

      <TabBar />
    </div>
  );
}
