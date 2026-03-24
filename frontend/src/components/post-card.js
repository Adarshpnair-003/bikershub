/**
 * Post card component for Bikers Hub
 * Renders an Instagram-style post card in dark theme
 */

import { getCurrentUser } from '../utils/auth.js';

const HEART_OUTLINE = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
const HEART_FILLED = `<svg width="22" height="22" viewBox="0 0 24 24" fill="#E53935" stroke="#E53935" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
const COMMENT_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const SHARE_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

/**
 * Calculate relative time from a date string
 * @param {string} dateStr - ISO date string
 * @returns {string} relative time like "2 hr", "3d", "just now"
 */
export function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr} hr`;
  if (diffDay < 7) return `${diffDay}d`;

  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a number for display (e.g. 10100 -> "10.1 K")
 * @param {number} n
 * @returns {string}
 */
export function formatCount(n) {
  if (n == null) return '0';
  if (n < 1000) return String(n);
  if (n < 1000000) return (n / 1000).toFixed(1) + ' K';
  return (n / 1000000).toFixed(1) + ' M';
}

/**
 * Render a post card HTML string
 * @param {object} post - Post object from API
 * @returns {string} HTML string
 */
export function renderPostCard(post) {
  const author = post.author || {};
  const username = author.username || 'unknown';
  const rawPic = author.profilePic;
  const avatarUrl = rawPic ? (typeof rawPic === 'string' ? rawPic : rawPic.url || '') : '';
  const time = timeAgo(post.createdAt);

  const currentUser = getCurrentUser();
  const isLiked = currentUser && Array.isArray(post.likes) && post.likes.includes(currentUser.id);
  const heartIcon = isLiked ? HEART_FILLED : HEART_OUTLINE;

  const likesCount = post.likesCount != null ? post.likesCount : (Array.isArray(post.likes) ? post.likes.length : 0);
  const commentsCount = post.commentsCount || 0;

  const mediaItem = Array.isArray(post.media) && post.media.length > 0 ? post.media[0] : null;
  const imageHtml = mediaItem
    ? `<img class="post-card-image" src="${mediaItem.url}" alt="Post image" loading="lazy">`
    : `<div class="post-card-image"></div>`;

  const content = post.content || '';
  const truncated = content.length > 150 ? content.slice(0, 150) + '...' : content;
  const readMore = content.length > 150 ? ' <span class="read-more">read more...</span>' : '';

  const avatarHtml = avatarUrl
    ? `<img class="post-card-avatar" src="${avatarUrl}" alt="${username}">`
    : `<div class="post-card-avatar"></div>`;

  return `
    <div class="post-card-dark" data-post-id="${post._id}">
      <div class="post-card-header">
        ${avatarHtml}
        <span class="post-card-author">${username}</span>
        <span class="post-card-time">&middot; ${time}</span>
      </div>
      ${imageHtml}
      <div class="post-card-actions">
        <button class="post-action-btn like-btn" data-post-id="${post._id}">
          ${heartIcon}
        </button>
        <button class="post-action-btn comment-btn" data-post-id="${post._id}">
          ${COMMENT_ICON}
        </button>
        <button class="post-action-btn share-btn" data-post-id="${post._id}">
          ${SHARE_ICON}
        </button>
      </div>
      <div class="post-card-likes">${formatCount(likesCount)} likes</div>
      <div class="post-card-caption">
        <strong>${username}</strong> ${truncated}${readMore}
      </div>
      ${commentsCount > 0 ? `<div class="post-card-comments-link">View all ${formatCount(commentsCount)} comments</div>` : ''}
    </div>
  `;
}
