import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { bikeApi } from '../utils/bikeApi.js';

const TYPES = ['sport', 'cruiser', 'adventure', 'naked', 'tourer', 'off-road', 'scooter', 'other'];

export default function AddBike() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const blobUrlRef = useRef(null);

  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [type, setType] = useState('');
  const [cc, setCc] = useState('');
  const [color, setColor] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function pickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setPreviewUrl(url);
  }

  const canSave = photo && brand && model && year && type && cc && color;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSave) {
      setError('Photo and all fields except nickname are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('photo', photo);
      fd.append('brand', brand.trim());
      fd.append('model', model.trim());
      fd.append('year', year);
      fd.append('type', type);
      fd.append('engineCC', cc);
      fd.append('color', color.trim());
      if (nickname.trim()) fd.append('nickname', nickname.trim());

      const res = await bikeApi.create(fd);
      if (res?.success) {
        navigate('/profile');
      } else {
        setError(res?.error?.message || 'Failed to add bike.');
        setBusy(false);
      }
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
        <div className="app-header-title">Add bike</div>
        <div className="app-header-actions">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSave || busy}
            style={{
              background: 'transparent', border: 'none',
              color: canSave ? '#E53935' : 'rgba(229,57,53,0.4)',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
              padding: '8px 12px', cursor: canSave ? 'pointer' : 'default'
            }}
          >
            {busy ? '…' : 'Save'}
          </button>
        </div>
      </header>

      <section style={{ padding: '18px 16px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            width: '100%', maxWidth: 320, aspectRatio: '4/3',
            borderRadius: 12, background: '#1E1E1E',
            border: '1px dashed rgba(243,243,243,0.18)',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(243,243,243,0.5)'
          }}
        >
          {previewUrl
            ? <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 32 }}>📷</span>
                <span style={{ fontSize: 13 }}>Tap to add photo</span>
              </div>
          }
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={pickPhoto}
        />
      </section>

      {error && (
        <div style={{ margin: '0 16px 8px', padding: 10, background: 'rgba(229,57,53,0.10)', color: '#E53935', borderRadius: 10, fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Field label="Brand" value={brand} onChange={setBrand} maxLength={50} />
        <Field label="Model" value={model} onChange={setModel} maxLength={50} />
        <Field label="Year" value={year} onChange={setYear} type="number" min={1900} max={new Date().getFullYear() + 1} />

        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(243,243,243,0.06)' }}>
          <div style={{ fontSize: 11, color: 'rgba(243,243,243,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Type</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 8 }}>
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                style={{
                  background: type === t ? '#E53935' : 'transparent',
                  borderColor: type === t ? '#E53935' : 'rgba(243,243,243,0.18)',
                  color: type === t ? '#fff' : 'rgba(243,243,243,0.85)',
                  border: '1px solid', borderRadius: 999,
                  fontSize: 12, fontWeight: 500,
                  padding: '7px 12px', cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontFamily: 'inherit'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <Field label="Engine CC" value={cc} onChange={setCc} type="number" min={50} max={3000} />
        <Field label="Color" value={color} onChange={setColor} maxLength={30} />
        <Field label="Nickname (optional)" value={nickname} onChange={setNickname} maxLength={40} />
      </form>
    </div>
  );
}

function Field({ label, value, onChange, ...inputProps }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(243,243,243,0.06)' }}>
      <label style={{ fontSize: 11, color: 'rgba(243,243,243,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...inputProps}
        style={{
          background: 'transparent', border: 'none', outline: 'none',
          padding: '6px 0', color: '#F3F3F3', fontSize: 16, fontWeight: 500,
          width: '100%', fontFamily: 'inherit', display: 'block'
        }}
      />
    </div>
  );
}
