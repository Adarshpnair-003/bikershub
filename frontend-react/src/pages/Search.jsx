import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import TabBar from '../components/TabBar.jsx';

export default function Search() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState({ users: [], clubs: [], rides: [], posts: [] });
  const [busy, setBusy] = useState(false);

  // Debounced search as user types
  useEffect(() => {
    if (!q.trim()) {
      setResults({ users: [], clubs: [], rides: [], posts: [] });
      return;
    }
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/search?q=${encodeURIComponent(q.trim())}`);
        if (res?.success && res.data) setResults(res.data);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-title">Search</div>
      </header>

      <div style={{ padding: '12px 16px' }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Riders, clubs, rides, posts…"
          autoFocus
          style={{
            width: '100%',
            background: '#1E1E1E',
            border: '1px solid rgba(243,243,243,0.1)',
            borderRadius: 24,
            color: '#F3F3F3',
            padding: '12px 18px',
            fontSize: 15,
            fontFamily: 'inherit',
            outline: 'none'
          }}
        />
      </div>

      <div style={{ padding: '0 16px 80px' }}>
        {busy && <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Searching…</div>}

        {results.users?.length > 0 && (
          <Section title="Riders">
            {results.users.map((u) => (
              <Link key={u._id} to={`/user/${u._id}`} className="search-row">
                <div className="search-row-avatar">{(u.username || '?').charAt(0).toUpperCase()}</div>
                <span>{u.username}</span>
              </Link>
            ))}
          </Section>
        )}

        {results.clubs?.length > 0 && (
          <Section title="Clubs">
            {results.clubs.map((c) => (
              <Link key={c._id} to={`/clubs/${c._id}`} className="search-row">
                <span>{c.name}</span>
              </Link>
            ))}
          </Section>
        )}

        {results.rides?.length > 0 && (
          <Section title="Rides">
            {results.rides.map((r) => (
              <Link key={r._id} to={`/rides/${r._id}`} className="search-row">
                <span>{r.title}</span>
              </Link>
            ))}
          </Section>
        )}

        {results.posts?.length > 0 && (
          <Section title="Posts">
            {results.posts.map((p) => (
              <Link key={p._id} to={`/posts/${p._id}`} className="search-row">
                <span>{p.content?.slice(0, 80)}…</span>
              </Link>
            ))}
          </Section>
        )}

        {q && !busy &&
          !results.users?.length && !results.clubs?.length && !results.rides?.length && !results.posts?.length && (
          <div style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>
            No results for "{q}"
          </div>
        )}
      </div>

      <TabBar />

      <style>{`
        .search-row {
          display: flex; align-items: center; gap: 10px;
          padding: 12px;
          border-bottom: 1px solid rgba(243,243,243,0.04);
          color: #F3F3F3;
          text-decoration: none;
        }
        .search-row-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: #343434; display: flex;
          align-items: center; justify-content: center;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
