import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { bikeApi } from '../utils/bikeApi.js';
import { getCurrentUser } from '../utils/auth.js';
import MentionAutocomplete from '../components/MentionAutocomplete.jsx';

export default function CreatePost() {
  const navigate = useNavigate();
  const me = getCurrentUser();
  const fileRef = useRef(null);
  const textareaRef = useRef(null);
  const blobUrlsRef = useRef([]);

  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [multiSelect, setMultiSelect] = useState(false);
  const [closesIn, setClosesIn] = useState('');
  const [bikes, setBikes] = useState([]);
  const [selectedBikeId, setSelectedBikeId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (me?.id) {
      bikeApi.listByUser(me.id).then((res) => {
        if (!cancelled && res?.success) setBikes(res.data || []);
      });
    }
    return () => {
      cancelled = true;
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  function pickFiles(e) {
    const newFiles = Array.from(e.target.files || []).slice(0, 5 - files.length);
    if (newFiles.length === 0) return;
    const nextFiles = [...files, ...newFiles].slice(0, 5);
    setFiles(nextFiles);
    const newUrls = newFiles.map((f) => URL.createObjectURL(f));
    blobUrlsRef.current.push(...newUrls);
    setPreviews([...previews, ...newUrls]);
    e.target.value = '';
  }

  function removeFile(idx) {
    const nextFiles = [...files]; nextFiles.splice(idx, 1); setFiles(nextFiles);
    const nextPreviews = [...previews];
    URL.revokeObjectURL(nextPreviews[idx]);
    nextPreviews.splice(idx, 1);
    setPreviews(nextPreviews);
  }

  async function handleSubmit() {
    if (!content.trim() && files.length === 0 && !pollOpen) {
      alert('Write something, add a photo, or create a poll.');
      return;
    }

    let pollPayload = null;
    if (pollOpen) {
      const cleaned = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (cleaned.length < 2) { alert('Poll needs at least 2 non-empty options.'); return; }
      const lower = cleaned.map((s) => s.toLowerCase());
      if (new Set(lower).size !== lower.length) { alert('Poll options must be unique.'); return; }
      const days = parseInt(closesIn, 10);
      let closesAt = null;
      if (Number.isFinite(days) && days > 0) {
        closesAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }
      pollPayload = {
        options: cleaned.map((label) => ({ label })),
        multiSelect,
        closesAt
      };
    }

    setBusy(true);
    try {
      const fd = new FormData();
      if (content.trim()) fd.append('content', content.trim());
      files.forEach((f) => fd.append('media', f));
      if (pollPayload) fd.append('poll', JSON.stringify(pollPayload));
      if (selectedBikeId) fd.append('bike', selectedBikeId);

      const res = await api.upload('/api/posts', fd);
      if (res?.success) navigate('/home');
      else { alert(res?.error?.message || 'Failed.'); setBusy(false); }
    } catch {
      alert('Network error.');
      setBusy(false);
    }
  }

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-left">
          <button className="app-header-btn" onClick={() => navigate('/home')}>←</button>
        </div>
        <div className="app-header-title">New Post</div>
        <div className="app-header-actions" />
      </header>

      <div style={{ padding: '16px 20px', position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          placeholder="Share your ride experience…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#1f2937', border: '1px solid #374151', borderRadius: 16,
            color: '#f9fafb', padding: 16, minHeight: 120, fontSize: 15,
            resize: 'vertical', outline: 'none', fontFamily: 'inherit'
          }}
        />
        <MentionAutocomplete inputRef={textareaRef} />

        {previews.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 0' }}>
            {previews.map((url, i) => (
              <img
                key={url}
                src={url}
                onClick={() => removeFile(i)}
                alt=""
                style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }}
              />
            ))}
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={pickFiles} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={files.length >= 5}
          style={{
            background: 'none', border: '1px solid #374151', borderRadius: 12,
            color: '#9ca3af', padding: '10px 16px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontFamily: 'inherit',
            width: '100%', justifyContent: 'center', marginTop: 8
          }}
        >
          📷 Add photos ({files.length}/5)
        </button>

        <button
          type="button"
          onClick={() => { setPollOpen(!pollOpen); if (!pollOpen) { setPollOptions(['', '']); } }}
          style={{
            background: 'none',
            border: pollOpen ? '1px solid #E53935' : '1px solid #374151', borderRadius: 12,
            color: pollOpen ? '#E53935' : '#9ca3af',
            padding: '10px 16px', cursor: 'pointer',
            fontSize: 14, fontFamily: 'inherit', marginTop: 8,
            width: '100%'
          }}
        >
          📊 {pollOpen ? 'Remove poll' : 'Add a poll'}
        </button>

        {pollOpen && (
          <div style={{ marginTop: 12, border: '1px solid #374151', borderRadius: 14, padding: 14, background: '#1E1E1E', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pollOptions.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8 }}>
                <input
                  value={opt}
                  onChange={(e) => {
                    const next = [...pollOptions]; next[idx] = e.target.value; setPollOptions(next);
                  }}
                  placeholder={`Option ${idx + 1}`}
                  maxLength={60}
                  style={{ flex: 1, background: '#0C0C0C', border: '1px solid #374151', borderRadius: 10, color: '#F3F3F3', padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                />
                {pollOptions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                    style={{ background: 'transparent', border: '1px solid #374151', borderRadius: 999, width: 30, height: 30, color: '#9ca3af', cursor: 'pointer' }}
                  >×</button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPollOptions([...pollOptions, ''])}
              disabled={pollOptions.length >= 4}
              style={{ background: 'transparent', border: '1px dashed #374151', borderRadius: 10, color: '#9ca3af', padding: 10, cursor: pollOptions.length >= 4 ? 'default' : 'pointer', fontSize: 13, fontFamily: 'inherit', opacity: pollOptions.length >= 4 ? 0.4 : 1 }}
            >
              + Add option
            </button>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={multiSelect}
                  onChange={(e) => setMultiSelect(e.target.checked)}
                  style={{ accentColor: '#E53935' }}
                />
                Multi-choice
              </label>
              <span style={{ fontSize: 11, color: 'rgba(243,243,243,0.55)', textTransform: 'uppercase' }}>Closes</span>
              <select
                value={closesIn}
                onChange={(e) => setClosesIn(e.target.value)}
                style={{ background: '#0C0C0C', border: '1px solid #374151', borderRadius: 10, color: '#F3F3F3', padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
              >
                <option value="">Never</option>
                <option value="1">In 1 day</option>
                <option value="3">In 3 days</option>
                <option value="7">In 1 week</option>
              </select>
            </div>
          </div>
        )}

        {bikes.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: 'rgba(243,243,243,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 8 }}>
              Tag a bike (optional)
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {bikes.map((b) => {
                const sel = String(b._id) === String(selectedBikeId);
                const label = b.nickname || `${b.brand || ''} ${b.model || ''}`.trim() || 'Bike';
                return (
                  <button
                    key={b._id}
                    type="button"
                    onClick={() => setSelectedBikeId(sel ? null : b._id)}
                    style={{
                      flexShrink: 0, padding: '7px 12px', borderRadius: 999,
                      background: sel ? 'rgba(229,57,53,0.15)' : 'transparent',
                      border: sel ? '1px solid #E53935' : '1px solid #374151',
                      color: sel ? '#E53935' : 'rgba(243,243,243,0.85)',
                      fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500,
                      cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >
                    🏍 {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          style={{
            background: '#ef4444', color: '#fff', border: 'none', borderRadius: 12,
            padding: 14, width: '100%', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', letterSpacing: 1, marginTop: 16, fontFamily: 'inherit',
            opacity: busy ? 0.5 : 1
          }}
        >
          {busy ? 'POSTING…' : 'POST'}
        </button>
      </div>
    </div>
  );
}
