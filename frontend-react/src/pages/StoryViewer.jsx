import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { storyApi } from '../utils/storyApi.js';
import { getCurrentUser } from '../utils/auth.js';

const STORY_DURATION_MS = 5000;

export default function StoryViewer() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const me = getCurrentUser();
  const [stories, setStories] = useState([]);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const fillRefs = useRef([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await storyApi.byUser(userId);
        if (cancelled) return;
        const list = res?.success && Array.isArray(res.data) ? res.data : [];
        setStories(list);
      } catch { /* */ }
    }
    load();
    return () => { cancelled = true; clearTimeout(timerRef.current); };
  }, [userId]);

  // Animate progress bar + advance after duration for current story
  useEffect(() => {
    if (stories.length === 0) return;
    const story = stories[idx];
    if (!story) return;

    storyApi.markViewed(story._id).catch(() => {});

    // Force the active fill to animate from 0 → 100%
    const activeFill = fillRefs.current[idx];
    if (activeFill) {
      activeFill.style.transition = 'none';
      activeFill.style.width = '0%';
      // Force reflow
      void activeFill.offsetWidth;
      activeFill.style.transition = `width ${STORY_DURATION_MS}ms linear`;
      activeFill.style.width = '100%';
    }

    timerRef.current = setTimeout(advance, STORY_DURATION_MS);
    return () => clearTimeout(timerRef.current);
  }, [idx, stories]);

  function advance() {
    if (idx < stories.length - 1) setIdx(idx + 1);
    else navigate('/home');
  }

  function goBack() {
    if (idx > 0) setIdx(idx - 1);
  }

  async function handleDelete() {
    const story = stories[idx];
    if (!story || !confirm('Delete this story?')) return;
    await storyApi.remove(story._id);
    const next = stories.filter((s) => s._id !== story._id);
    if (next.length === 0) { navigate('/home'); return; }
    setStories(next);
    if (idx >= next.length) setIdx(next.length - 1);
  }

  if (stories.length === 0) {
    return <div style={{ position: 'fixed', inset: 0, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No stories.</div>;
  }

  const story = stories[idx];
  const u = story.user || {};
  const isMine = String(u._id || u.id) === String(me?.id);
  const isVideo = story.media?.type === 'video';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000', color: '#F3F3F3', display: 'flex', flexDirection: 'column', fontFamily: 'Poppins, sans-serif' }}>
      {/* Progress bars */}
      <div style={{ display: 'flex', gap: 4, padding: '12px 12px 4px', position: 'relative', zIndex: 3 }}>
        {stories.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'hidden' }}>
            <div
              ref={(el) => { fillRefs.current[i] = el; }}
              style={{
                height: '100%',
                width: i < idx ? '100%' : (i === idx ? '0%' : '0%'),
                background: '#fff'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 14px 10px', position: 'relative', zIndex: 3 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#343434', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
          {u.profilePic
            ? <img src={u.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (u.username || '?').charAt(0).toUpperCase()
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{u.username || 'rider'}</div>
        </div>
        {isMine && (
          <button onClick={handleDelete} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>🗑️</button>
        )}
        <button onClick={() => navigate('/home')} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', padding: '0 8px' }}>×</button>
      </div>

      {/* Stage */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isVideo
            ? <video src={story.media.url} autoPlay playsInline muted style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            : <img src={story.media.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          }
        </div>
        {story.caption && (
          <div style={{ position: 'absolute', bottom: 26, left: 14, right: 14, fontSize: 14, lineHeight: 1.4, background: 'rgba(0,0,0,0.4)', padding: '10px 14px', borderRadius: 10 }}>
            {story.caption}
          </div>
        )}
        {/* Tap zones */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 2 }}>
          <button onClick={goBack} style={{ width: '30%', background: 'transparent', border: 'none' }} aria-label="Previous" />
          <button onClick={advance} style={{ flex: 1, background: 'transparent', border: 'none' }} aria-label="Next" />
        </div>
      </div>
    </div>
  );
}
