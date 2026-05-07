import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api.js';
import { getCurrentUser } from '../utils/auth.js';
import { linkifyMentions } from '../utils/mentions.js';
import Comments from '../components/Comments.jsx';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diffMs / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m`;
  if (hr < 24) return `${hr}h`;
  if (day < 7) return `${day}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = getCurrentUser();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  async function load() {
    try {
      const res = await api.get(`/api/posts/${id}`);
      if (res?.success) setPost(res.data);
      else setError(res?.error?.message || 'Post not found');
    } catch { setError('Network error'); }
  }

  useEffect(() => { load(); }, [id]);

  async function handleLike() {
    if (!post || !me) return;
    const optimisticLikes = (post.likes || []).includes(me.id)
      ? post.likes.filter((u) => u !== me.id)
      : [...(post.likes || []), me.id];
    setPost({ ...post, likes: optimisticLikes });
    try {
      await api.put(`/api/posts/like/${post._id}`);
    } catch { load(); /* re-sync if failed */ }
  }

  async function handleVote(optionId) {
    if (!post?.poll) return;
    try {
      const res = await api.post(`/api/posts/${post._id}/poll/vote`, { optionId });
      if (res?.success && res.data) setPost({ ...post, poll: res.data });
    } catch { /* ignore */ }
  }

  async function handleDelete() {
    if (!confirm('Delete this post?')) return;
    const res = await api.delete(`/api/posts/${id}`);
    if (res?.success) navigate('/home');
  }

  async function saveEdit() {
    const fd = new FormData();
    fd.append('content', editContent);
    const res = await api.upload(`/api/posts/${id}`, fd, 'PUT');
    if (res?.success) {
      setEditing(false);
      load();
    }
  }

  if (error) return <div className="page-dark" style={{ padding: 60, textAlign: 'center', color: '#E53935' }}>{error}</div>;
  if (!post) return <div className="page-dark" style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>Loading…</div>;

  const author = post.author || {};
  const username = author.username || 'rider';
  const isLiked = me && (post.likes || []).includes(me.id);
  const isOwner = String(author._id) === String(me?.id);
  const totalVotes = post.poll
    ? (post.poll.options || []).reduce((s, o) => s + (o.votes?.length || 0), 0)
    : 0;

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-left">
          <button className="app-header-btn" onClick={() => navigate(-1)}>←</button>
        </div>
        <div className="app-header-title">Post</div>
        <div className="app-header-actions">
          {isOwner && !editing && (
            <>
              <button
                className="app-header-btn"
                onClick={() => { setEditing(true); setEditContent(post.content || ''); }}
              >✏️</button>
              <button className="app-header-btn" onClick={handleDelete}>🗑️</button>
            </>
          )}
        </div>
      </header>

      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(243,243,243,0.04)' }}>
        <Link to={author._id ? `/user/${author._id}` : '#'} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'inherit', textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#343434', overflow: 'hidden' }}>
            {author.profilePic && <img src={author.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <strong>{username}</strong>
        </Link>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>· {timeAgo(post.createdAt)}</span>
      </div>

      {Array.isArray(post.media) && post.media.length > 0 && (
        <div>
          {post.media.map((m, i) => (
            <img key={i} src={m.url} alt="" style={{ width: '100%', display: 'block' }} loading="lazy" />
          ))}
        </div>
      )}

      {post.bike && (post.bike._id || post.bike.id) && (
        <div style={{ padding: '4px 16px 6px' }}>
          <Link
            to={`/garage/${author._id || ''}/${post.bike._id || post.bike.id}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(229,57,53,0.10)', color: '#E53935',
              fontSize: 12, fontWeight: 600, textDecoration: 'none',
              border: '1px solid rgba(229,57,53,0.25)'
            }}
          >
            🏍 {post.bike.nickname || `${post.bike.brand || ''} ${post.bike.model || ''}`.trim()}
          </Link>
        </div>
      )}

      {post.poll && Array.isArray(post.poll.options) && (
        <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {post.poll.options.map((opt) => {
            const count = opt.votes?.length || 0;
            const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
            const myVote = me && (opt.votes || []).some((v) => String(v._id || v) === String(me.id));
            const closed = post.poll.closed || (post.poll.closesAt && new Date(post.poll.closesAt).getTime() <= Date.now());
            return (
              <button
                key={opt._id}
                onClick={() => !closed && handleVote(opt._id)}
                disabled={closed}
                style={{
                  position: 'relative',
                  width: '100%',
                  background: '#1E1E1E',
                  border: myVote ? '1px solid #E53935' : '1px solid rgba(243,243,243,0.08)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  cursor: closed ? 'default' : 'pointer',
                  textAlign: 'left',
                  overflow: 'hidden',
                  color: '#F3F3F3',
                  fontFamily: 'inherit'
                }}
              >
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: myVote ? 'rgba(229,57,53,0.32)' : 'rgba(229,57,53,0.18)', zIndex: 0 }} />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{myVote && '★ '}{opt.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{pct}%</span>
                </div>
              </button>
            );
          })}
          <div style={{ fontSize: 11.5, color: 'rgba(243,243,243,0.45)' }}>
            {totalVotes} vote{totalVotes === 1 ? '' : 's'}
            {post.poll.multiSelect && ' · multi-choice'}
            {post.poll.closed && ' · closed'}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, padding: '12px 16px', alignItems: 'center' }}>
        <button onClick={handleLike} style={{ background: 'none', border: 'none', color: isLiked ? '#E53935' : '#F3F3F3', fontSize: 22, cursor: 'pointer' }}>
          {isLiked ? '❤️' : '🤍'}
        </button>
        <span style={{ fontSize: 13 }}>💬 {post.commentsCount || 0}</span>
      </div>
      <div style={{ padding: '0 16px 4px', fontWeight: 600, fontSize: 14 }}>
        {(post.likes || []).length} likes
      </div>

      {editing ? (
        <div style={{ padding: '8px 16px 16px' }}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            style={{ width: '100%', boxSizing: 'border-box', background: '#1E1E1E', border: '1px solid rgba(243,243,243,0.1)', borderRadius: 10, color: '#F3F3F3', padding: 12, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setEditing(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: 'transparent', border: '1px solid rgba(243,243,243,0.18)', color: '#F3F3F3', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={saveEdit} style={{ flex: 1, padding: 10, borderRadius: 8, background: '#E53935', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Save</button>
          </div>
        </div>
      ) : (
        post.content && (
          <div
            style={{ padding: '8px 16px 16px', fontSize: 14, lineHeight: 1.5 }}
            dangerouslySetInnerHTML={{ __html: linkifyMentions(post.content, post.mentions) }}
          />
        )
      )}

      <Comments postId={id} />
    </div>
  );
}
