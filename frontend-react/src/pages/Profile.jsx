import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { getCurrentUser, logout } from '../utils/auth.js';
import TabBar from '../components/TabBar.jsx';

export default function Profile() {
  const navigate = useNavigate();
  const me = getCurrentUser();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get('/api/users/me');
        if (cancelled) return;
        if (res.success && res.data) {
          setProfile(res.data);
        } else {
          setError(res.error?.message || 'Failed to load profile.');
        }
      } catch {
        if (!cancelled) setError('Network error.');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function handleLogout() {
    logout();
    // logout() navigates via the shim; React Router will react to the hash change
  }

  if (!profile && !error) {
    return (
      <div className="page-dark" style={{ padding: 40, color: '#6b7280', textAlign: 'center' }}>
        Loading profile…
      </div>
    );
  }
  if (error) {
    return (
      <div className="page-dark" style={{ padding: 40, color: '#E53935', textAlign: 'center' }}>
        {error}
      </div>
    );
  }

  const username = profile.username || me?.username || 'rider';
  const email = profile.email || '';
  const bio = profile.bio || '';
  const avatarUrl = profile.profilePic?.url || profile.profilePic;
  const initial = username.charAt(0).toUpperCase();

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-left" />
        <div className="app-header-title">{username}</div>
        <div className="app-header-actions">
          <button
            className="app-header-btn"
            onClick={() => navigate('/edit-profile')}
            aria-label="Edit profile"
          >
            ✏️
          </button>
        </div>
      </header>

      <section style={{ padding: '24px 20px 8px', textAlign: 'center' }}>
        {avatarUrl
          ? <img src={avatarUrl} alt={username} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }} />
          : <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#343434', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700 }}>{initial}</div>
        }
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '12px 0 2px' }}>{username}</h1>
        {email && <div style={{ fontSize: 13, color: '#9ca3af' }}>{email}</div>}
        {bio && <div style={{ fontSize: 14, color: '#cbd5e1', marginTop: 10, padding: '0 16px' }}>{bio}</div>}
      </section>

      <div style={{ display: 'flex', gap: 8, padding: 16 }}>
        <button
          onClick={() => navigate('/edit-profile')}
          style={{ flex: 1, height: 44, background: 'transparent', border: '1px solid rgba(243,243,243,0.18)', borderRadius: 10, color: '#F3F3F3', fontFamily: 'Poppins, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Edit Profile
        </button>
        <button
          onClick={handleLogout}
          style={{ flex: 1, height: 44, background: 'transparent', border: '1px solid rgba(229,57,53,0.35)', borderRadius: 10, color: '#E53935', fontFamily: 'Poppins, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Log Out
        </button>
      </div>

      <div style={{ padding: '12px 20px', fontSize: 13, color: '#9ca3af' }}>
        <p style={{ marginBottom: 8 }}>👋 This is the React playground version of the profile page.</p>
        <p style={{ marginBottom: 8 }}>The full vanilla version has tabs (Posts / Garage), an Achievements row, and bike management — those are not ported here.</p>
        <p>The point of this playground is to <strong>compare the code</strong>, not to be feature-complete. Open <code>Profile.jsx</code> next to <code>profile.js</code> and see the difference.</p>
      </div>

      <TabBar />
    </div>
  );
}
