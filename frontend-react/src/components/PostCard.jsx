import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { getCurrentUser } from '../utils/auth.js';
import { linkifyMentions } from '../utils/mentions.js';

const HEART_OUTLINE = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const HEART_FILLED = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#E53935" stroke="#E53935" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const COMMENT_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

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

function formatCount(n) {
  if (n == null) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(1) + 'K';
  return (n / 1_000_000).toFixed(1) + 'M';
}

export default function PostCard({ post }) {
  const me = getCurrentUser();
  const [likes, setLikes] = useState(Array.isArray(post.likes) ? post.likes : []);
  const [busy, setBusy] = useState(false);

  const author = post.author || {};
  const username = author.username || 'unknown';
  const isLiked = me && likes.includes(me.id);
  const mediaItem = Array.isArray(post.media) && post.media.length > 0 ? post.media[0] : null;

  async function handleLike() {
    if (busy || !me) return;
    setBusy(true);
    // Optimistic update
    const optimistic = isLiked
      ? likes.filter((id) => id !== me.id)
      : [...likes, me.id];
    setLikes(optimistic);
    try {
      const res = await api.put(`/api/posts/like/${post._id}`);
      // Trust server count if returned
      if (res?.success && typeof res.data?.likesCount === 'number') {
        // Reconcile: rebuild a likes-stub array of correct length so UI stays consistent
        // (simpler than re-fetching the post)
        setLikes((curr) => {
          if (curr.length === res.data.likesCount) return curr;
          return res.data.liked ? Array(res.data.likesCount).fill(me.id) : Array(res.data.likesCount).fill('x');
        });
      }
    } catch {
      // rollback
      setLikes(likes);
    } finally {
      setBusy(false);
    }
  }

  const captionHtml = linkifyMentions(post.content || '', post.mentions);

  return (
    <article className="post-card-dark" data-post-id={post._id}>
      <div className="post-card-header">
        <Link
          to={author._id ? `/user/${author._id}` : '#'}
          className="post-card-author-link"
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}
        >
          {author.profilePic
            ? <img className="post-card-avatar" src={author.profilePic} alt={username} />
            : <div className="post-card-avatar"></div>
          }
          <span className="post-card-author">{username}</span>
        </Link>
        <span className="post-card-time">· {timeAgo(post.createdAt)}</span>
      </div>

      {post.bike && (post.bike._id || post.bike.id) && (
        <div className="post-bike-chip-row">
          <Link
            className="post-bike-chip"
            to={`/garage/${author._id || ''}/${post.bike._id || post.bike.id}`}
          >
            🏍 {post.bike.nickname || `${post.bike.brand || ''} ${post.bike.model || ''}`.trim()}
          </Link>
        </div>
      )}

      {mediaItem
        ? <img className="post-card-image" src={mediaItem.url} alt="Post" loading="lazy" />
        : !post.poll && <div className="post-card-image"></div>
      }

      <div className="post-card-actions">
        <button
          className={`post-action-btn like-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
          disabled={busy}
        >
          {isLiked ? HEART_FILLED : HEART_OUTLINE}
        </button>
        <Link to={`/posts/${post._id}`} className="post-action-btn comment-btn">
          {COMMENT_ICON}
        </Link>
      </div>

      <div className="post-card-likes">{formatCount(likes.length)} likes</div>

      {post.content && (
        <div className="post-card-caption">
          <strong>{username}</strong>{' '}
          <span dangerouslySetInnerHTML={{ __html: captionHtml }} />
        </div>
      )}

      {(post.commentsCount || 0) > 0 && (
        <Link to={`/posts/${post._id}`} className="post-card-comments-link">
          View all {formatCount(post.commentsCount)} comments
        </Link>
      )}
    </article>
  );
}
