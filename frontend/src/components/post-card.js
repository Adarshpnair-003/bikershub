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

function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function pollClosesText(poll) {
  if (poll.closed) return 'Poll closed';
  if (!poll.closesAt) return null;
  const ms = new Date(poll.closesAt).getTime() - Date.now();
  if (ms <= 0) return 'Poll closed';
  const min = Math.floor(ms / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day >= 1) return `Closes in ${day} day${day > 1 ? 's' : ''}`;
  if (hr >= 1) return `Closes in ${hr} hour${hr > 1 ? 's' : ''}`;
  return `Closes in ${min} min`;
}

/**
 * Render a poll block. Used inside post cards and post-detail.
 * Caller is responsible for wiring click handlers on `.poll-option[data-option-id]`.
 */
export function renderPollBlock(post) {
  if (!post || !post.poll || !Array.isArray(post.poll.options) || post.poll.options.length === 0) return '';
  const poll = post.poll;
  const currentUser = getCurrentUser();
  const myId = currentUser?.id ? String(currentUser.id) : null;

  const isExpired = poll.closed || (poll.closesAt && new Date(poll.closesAt).getTime() <= Date.now());

  const totalVotes = poll.options.reduce((sum, o) => sum + (Array.isArray(o.votes) ? o.votes.length : 0), 0);

  const optionsHtml = poll.options.map((opt) => {
    const count = Array.isArray(opt.votes) ? opt.votes.length : 0;
    const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
    const myVote = myId && Array.isArray(opt.votes) && opt.votes.some((v) => String(v?._id || v) === myId);
    const optId = String(opt._id || opt.id || '');
    return `
      <button type="button"
        class="poll-option ${myVote ? 'voted' : ''} ${isExpired ? 'closed' : ''}"
        data-post-id="${escapeAttr(post._id)}"
        data-option-id="${escapeAttr(optId)}"
        ${isExpired ? 'disabled' : ''}>
        <div class="poll-option-fill" style="width:${pct}%"></div>
        <div class="poll-option-row">
          <span class="poll-option-label">${myVote ? '★ ' : ''}${escapeAttr(opt.label)}</span>
          <span class="poll-option-pct">${pct}%</span>
        </div>
      </button>
    `;
  }).join('');

  const meta = [
    `${totalVotes} vote${totalVotes === 1 ? '' : 's'}`,
    poll.multiSelect ? 'multi-choice' : null,
    pollClosesText(poll)
  ].filter(Boolean).join(' · ');

  return `
    <div class="poll-block">
      ${optionsHtml}
      <div class="poll-meta">${meta}</div>
    </div>
  `;
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
    : (post.poll ? '' : `<div class="post-card-image"></div>`);

  const content = post.content || '';
  const truncated = content.length > 150 ? content.slice(0, 150) + '...' : content;
  const readMore = content.length > 150 ? ' <span class="read-more">read more...</span>' : '';

  const avatarHtml = avatarUrl
    ? `<img class="post-card-avatar" src="${avatarUrl}" alt="${username}">`
    : `<div class="post-card-avatar"></div>`;

  const pollHtml = renderPollBlock(post);

  return `
    <div class="post-card-dark" data-post-id="${post._id}">
      <div class="post-card-header">
        <a class="post-card-author-link" href="#/user/${author._id || ''}" style="display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit;">
          ${avatarHtml}
          <span class="post-card-author">${username}</span>
        </a>
        <span class="post-card-time">&middot; ${time}</span>
      </div>
      ${imageHtml}
      ${pollHtml}
      <div class="post-card-actions">
        <button class="post-action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post._id}">
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
      ${content ? `<div class="post-card-caption"><strong>${username}</strong> ${truncated}${readMore}</div>` : ''}
      ${commentsCount > 0 ? `<a href="#/posts/${post._id}" class="post-card-comments-link" style="text-decoration: none; color: #6b7280; cursor: pointer;">View all ${formatCount(commentsCount)} comments</a>` : ''}
    </div>
  `;
}
