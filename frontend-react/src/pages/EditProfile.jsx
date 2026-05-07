import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';

export default function EditProfile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const blobRef = useRef(null);

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await api.get('/api/users/me');
      if (cancelled || !res?.success) return;
      const u = res.data;
      setUsername(u.username || '');
      setBio(u.bio || '');
      const pic = u.profilePic?.url || u.profilePic;
      if (pic) setPreviewUrl(pic);
    }
    load();
    return () => {
      cancelled = true;
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, []);

  function pickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const url = URL.createObjectURL(file);
    blobRef.current = url;
    setPreviewUrl(url);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      // Upload photo first if changed
      let profilePicData;
      if (photo) {
        const fd = new FormData();
        fd.append('file', photo);
        const upRes = await api.upload('/api/upload/profile', fd);
        if (upRes?.success && upRes.data) {
          profilePicData = upRes.data?.url || upRes.data;
        }
      }

      const body = { username: username.trim(), bio: bio.trim() };
      if (profilePicData) body.profilePic = profilePicData;

      const res = await api.put('/api/users/me', body);
      if (res?.success) navigate('/profile');
      else { setError(res?.error?.message || 'Failed to save.'); setBusy(false); }
    } catch {
      setError('Network error.');
      setBusy(false);
    }
  }

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-left">
          <button className="app-header-btn" onClick={() => navigate('/profile')}>←</button>
        </div>
        <div className="app-header-title">Edit profile</div>
        <div className="app-header-actions">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            style={{ background: 'transparent', border: 'none', color: '#E53935', fontSize: 14, fontWeight: 700, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {busy ? '…' : 'Save'}
          </button>
        </div>
      </header>

      <section style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            width: 96, height: 96, borderRadius: '50%',
            background: '#343434', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          {previewUrl
            ? <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 36, fontWeight: 700 }}>{(username || '?').charAt(0).toUpperCase()}</span>
          }
        </div>
        <button type="button" onClick={() => fileRef.current?.click()} style={{ background: 'transparent', border: 'none', color: '#E53935', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Change photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickPhoto} />
      </section>

      {error && (
        <div style={{ margin: '0 16px 8px', padding: 10, background: 'rgba(229,57,53,0.10)', color: '#E53935', borderRadius: 10, fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(243,243,243,0.06)' }}>
          <label style={{ fontSize: 11, color: 'rgba(243,243,243,0.5)', textTransform: 'uppercase', fontWeight: 600 }}>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={30}
            style={{ background: 'transparent', border: 'none', outline: 'none', padding: '6px 0', color: '#F3F3F3', fontSize: 16, width: '100%', fontFamily: 'inherit', display: 'block' }}
          />
        </div>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(243,243,243,0.06)' }}>
          <label style={{ fontSize: 11, color: 'rgba(243,243,243,0.5)', textTransform: 'uppercase', fontWeight: 600 }}>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            style={{ background: 'transparent', border: 'none', outline: 'none', padding: '6px 0', color: '#F3F3F3', fontSize: 15, width: '100%', fontFamily: 'inherit', resize: 'vertical', display: 'block' }}
          />
        </div>
      </form>
    </div>
  );
}
