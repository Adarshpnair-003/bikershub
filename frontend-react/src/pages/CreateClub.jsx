import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';

export default function CreateClub() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/api/clubs', {
        name: name.trim(),
        description: description.trim(),
        isPrivate
      });
      if (res?.success) navigate(`/clubs/${res.data._id}`);
      else { setError(res?.error?.message || 'Failed to create.'); setBusy(false); }
    } catch {
      setError('Network error.');
      setBusy(false);
    }
  }

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-left">
          <button className="app-header-btn" onClick={() => navigate('/clubs')}>←</button>
        </div>
        <div className="app-header-title">New club</div>
        <div className="app-header-actions">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || !name.trim()}
            style={{ background: 'transparent', border: 'none', color: name.trim() ? '#E53935' : 'rgba(229,57,53,0.4)', fontSize: 14, fontWeight: 700, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {busy ? '…' : 'Create'}
          </button>
        </div>
      </header>

      {error && (
        <div style={{ margin: '12px 16px', padding: 10, background: 'rgba(229,57,53,0.10)', color: '#E53935', borderRadius: 10, fontSize: 13 }}>{error}</div>
      )}

      <form onSubmit={handleSubmit} style={{ padding: 8 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(243,243,243,0.06)' }}>
          <label style={{ fontSize: 11, color: 'rgba(243,243,243,0.5)', textTransform: 'uppercase', fontWeight: 600 }}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            style={{ background: 'transparent', border: 'none', outline: 'none', padding: '6px 0', color: '#F3F3F3', fontSize: 16, width: '100%', fontFamily: 'inherit', display: 'block' }}
          />
        </div>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(243,243,243,0.06)' }}>
          <label style={{ fontSize: 11, color: 'rgba(243,243,243,0.5)', textTransform: 'uppercase', fontWeight: 600 }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={4}
            style={{ background: 'transparent', border: 'none', outline: 'none', padding: '6px 0', color: '#F3F3F3', fontSize: 15, width: '100%', fontFamily: 'inherit', resize: 'vertical', display: 'block' }}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            style={{ accentColor: '#E53935', width: 18, height: 18 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Private club</div>
            <div style={{ fontSize: 12, color: 'rgba(243,243,243,0.55)' }}>Members must be approved to join</div>
          </div>
        </label>
      </form>
    </div>
  );
}
