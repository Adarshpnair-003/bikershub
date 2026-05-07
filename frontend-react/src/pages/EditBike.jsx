import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bikeApi } from '../utils/bikeApi.js';

const TYPES = ['sport', 'cruiser', 'adventure', 'naked', 'tourer', 'off-road', 'scooter', 'other'];

export default function EditBike() {
  const navigate = useNavigate();
  const { id } = useParams();
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await bikeApi.get(id);
      if (cancelled || !res?.success) return;
      const b = res.data;
      setBrand(b.brand || '');
      setModel(b.model || '');
      setYear(b.year || '');
      setType(b.type || '');
      setCc(b.engineCC || '');
      setColor(b.color || '');
      setNickname(b.nickname || '');
      if (b.photo?.url) setPreviewUrl(b.photo.url);
    }
    load();
    return () => {
      cancelled = true;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, [id]);

  function pickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setPreviewUrl(url);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      if (photo) fd.append('photo', photo);
      fd.append('brand', brand.trim());
      fd.append('model', model.trim());
      fd.append('year', year);
      fd.append('type', type);
      fd.append('engineCC', cc);
      fd.append('color', color.trim());
      fd.append('nickname', nickname.trim());

      const res = await bikeApi.update(id, fd);
      if (res?.success) navigate('/profile');
      else { setError(res?.error?.message || 'Failed to update.'); setBusy(false); }
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
        <div className="app-header-title">Edit bike</div>
        <div className="app-header-actions">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            style={{
              background: 'transparent', border: 'none',
              color: '#E53935', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
              padding: '8px 12px', cursor: busy ? 'default' : 'pointer'
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
            cursor: 'pointer'
          }}
        >
          {previewUrl
            ? <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: 'rgba(243,243,243,0.5)', fontSize: 13 }}>Loading…</span>
          }
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{ background: 'transparent', border: 'none', color: '#E53935', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Replace photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickPhoto} />
      </section>

      {error && (
        <div style={{ margin: '0 16px 8px', padding: 10, background: 'rgba(229,57,53,0.10)', color: '#E53935', borderRadius: 10, fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Field label="Brand" value={brand} onChange={setBrand} maxLength={50} />
        <Field label="Model" value={model} onChange={setModel} maxLength={50} />
        <Field label="Year" value={year} onChange={setYear} type="number" />
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(243,243,243,0.06)' }}>
          <div style={{ fontSize: 11, color: 'rgba(243,243,243,0.5)', textTransform: 'uppercase', fontWeight: 600 }}>Type</div>
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
                  fontSize: 12, padding: '7px 12px', cursor: 'pointer',
                  textTransform: 'capitalize', fontFamily: 'inherit'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <Field label="Engine CC" value={cc} onChange={setCc} type="number" />
        <Field label="Color" value={color} onChange={setColor} maxLength={30} />
        <Field label="Nickname" value={nickname} onChange={setNickname} maxLength={40} />
      </form>
    </div>
  );
}

function Field({ label, value, onChange, ...inputProps }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(243,243,243,0.06)' }}>
      <label style={{ fontSize: 11, color: 'rgba(243,243,243,0.5)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...inputProps}
        style={{ background: 'transparent', border: 'none', outline: 'none', padding: '6px 0', color: '#F3F3F3', fontSize: 16, width: '100%', fontFamily: 'inherit', display: 'block' }}
      />
    </div>
  );
}
