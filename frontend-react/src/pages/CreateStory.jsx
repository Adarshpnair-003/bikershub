import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storyApi } from '../utils/storyApi.js';

export default function CreateStory() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const blobRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); };
  }, []);

  function pickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const url = URL.createObjectURL(f);
    blobRef.current = url;
    setPreviewUrl(url);
    setIsVideo(f.type.startsWith('video'));
  }

  async function handleSubmit() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('media', file);
      if (caption.trim()) fd.append('caption', caption.trim());
      const res = await storyApi.create(fd);
      if (res?.success) navigate('/home');
      else { setError(res?.error?.message || 'Failed.'); setBusy(false); }
    } catch {
      setError('Network error.');
      setBusy(false);
    }
  }

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-left">
          <button className="app-header-btn" onClick={() => navigate('/home')}>←</button>
        </div>
        <div className="app-header-title">New Story</div>
        <div className="app-header-actions">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || busy}
            style={{ background: 'transparent', border: 'none', color: file ? '#E53935' : 'rgba(229,57,53,0.4)', fontSize: 14, fontWeight: 700, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {busy ? 'Sharing…' : 'Share'}
          </button>
        </div>
      </header>

      <section style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            width: '100%', maxWidth: 360, aspectRatio: '9/16',
            borderRadius: 14, background: '#1E1E1E',
            border: '1px dashed rgba(243,243,243,0.18)',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(243,243,243,0.5)'
          }}
        >
          {previewUrl
            ? (isVideo
                ? <video src={previewUrl} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)
            : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 32 }}>📷</span>
                <span style={{ fontSize: 13 }}>Tap to choose a photo</span>
              </div>
          }
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={pickFile} />
      </section>

      {error && <div style={{ margin: '0 16px', padding: 10, background: 'rgba(229,57,53,0.10)', color: '#E53935', borderRadius: 10, fontSize: 13 }}>{error}</div>}

      <div style={{ padding: '10px 16px' }}>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={200}
          placeholder="Add a caption (optional)"
          style={{ width: '100%', boxSizing: 'border-box', background: '#1E1E1E', border: '1px solid rgba(243,243,243,0.08)', borderRadius: 12, color: '#F3F3F3', padding: '12px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
        />
      </div>
      <div style={{ padding: '4px 16px', fontSize: 12, color: 'rgba(243,243,243,0.5)' }}>Stories disappear after 24 hours.</div>
    </div>
  );
}
