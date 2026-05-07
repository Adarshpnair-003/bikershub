/**
 * Post detail page for Bikers Hub
 * Shows full post with inline comments, edit/delete for owners
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser } from '../utils/auth.js';
import { renderPollBlock } from '../components/post-card.js';
import { linkifyMentions } from '../utils/mentions.js';
import { attachMentionAutocomplete } from '../components/mention-autocomplete.js';

const BACK_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;
const EDIT_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const DELETE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
const HEART_OUTLINE = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
const HEART_FILLED = `<svg width="22" height="22" viewBox="0 0 24 24" fill="#E53935" stroke="#E53935" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
const COMMENT_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const SEND_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
const HEART_SMALL = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
const HEART_SMALL_FILLED = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#E53935" stroke="#E53935" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

let postId = null;
let postData = null;
let replyTarget = null; // { commentId, username }
let isEditing = false;

/**
 * Escape HTML to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Calculate relative time from a date string
 * @param {string} dateStr - ISO date string
 * @returns {string}
 */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function render(context = {}) {
  postId = context.params?.id || null;

  return `
    <div class="page-dark" id="post-detail-page">
      <style>
        .pd-header {
          display: flex; align-items: center; padding: 12px 16px;
          background: #0d1117; border-bottom: 1px solid #1f2937;
          position: sticky; top: 0; z-index: 10;
        }
        .pd-header-title {
          font-family: 'Exo 2', sans-serif; font-weight: 700;
          font-size: 18px; color: #f9fafb; flex: 1; text-align: center;
        }
        .pd-header-btn {
          background: none; border: none; cursor: pointer; padding: 4px;
          display: flex; align-items: center; justify-content: center;
        }
        .pd-header-actions { display: flex; gap: 8px; }
        .pd-scroll {
          flex: 1; overflow-y: auto;
          padding-bottom: 80px;
        }
        .pd-author-row {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px;
        }
        .pd-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: #374151; flex-shrink: 0; object-fit: cover;
        }
        .pd-username {
          font-family: 'Exo 2', sans-serif; font-weight: 700;
          font-size: 14px; color: #f9fafb; cursor: pointer;
        }
        .pd-username:hover { text-decoration: underline; }
        .pd-time {
          font-size: 12px; color: #6b7280; margin-left: auto;
        }
        .pd-media {
          width: 100%; max-height: 500px; object-fit: cover;
          background: #1f2937; display: block;
        }
        .pd-media-video {
          width: 100%; max-height: 500px; background: #1f2937; display: block;
        }
        .pd-actions {
          display: flex; align-items: center; gap: 16px;
          padding: 10px 16px;
        }
        .pd-action-btn {
          background: none; border: none; cursor: pointer;
          color: #9ca3af; display: flex; align-items: center; gap: 4px;
          font-size: 13px; padding: 0; transition: color 0.2s;
        }
        .pd-action-btn:hover { color: #f9fafb; }
        .pd-action-btn.liked { color: #E53935; }
        .pd-likes {
          padding: 0 16px; font-size: 13px; font-weight: 700;
          color: #f9fafb; font-family: 'Nunito', sans-serif;
        }
        .pd-content {
          padding: 8px 16px 16px; font-size: 14px; color: #d1d5db;
          line-height: 1.5; font-family: 'Nunito', sans-serif;
          white-space: pre-wrap; word-break: break-word;
        }
        .pd-edit-area {
          width: 100%; background: #1f2937; border: 1px solid #374151;
          border-radius: 8px; color: #f9fafb; font-family: 'Nunito', sans-serif;
          font-size: 14px; padding: 12px; resize: vertical; min-height: 80px;
          outline: none;
        }
        .pd-edit-area:focus { border-color: #E53935; }
        .pd-edit-actions {
          display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end;
        }
        .pd-edit-btn {
          padding: 6px 16px; border-radius: 6px; border: none; cursor: pointer;
          font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 600;
        }
        .pd-edit-save { background: #E53935; color: #fff; }
        .pd-edit-save:disabled { opacity: 0.5; cursor: default; }
        .pd-edit-cancel { background: #374151; color: #d1d5db; }

        /* Comments section */
        .pd-comments-divider {
          border: none; border-top: 1px solid #1f2937; margin: 0;
        }
        .pd-comments-title {
          font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 14px;
          color: #9ca3af; padding: 14px 16px 8px; text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .pd-comment {
          display: flex; gap: 10px; padding: 10px 16px;
        }
        .pd-comment.reply {
          padding-left: 56px;
        }
        .pd-comment-avatar {
          width: 30px; height: 30px; border-radius: 50%; background: #374151;
          flex-shrink: 0; object-fit: cover;
        }
        .pd-comment-body { flex: 1; min-width: 0; }
        .pd-comment-author {
          font-weight: 700; font-size: 13px; color: #f9fafb; cursor: pointer;
        }
        .pd-comment-author:hover { text-decoration: underline; }
        .pd-comment-text {
          font-size: 14px; color: #d1d5db; line-height: 1.4;
          word-break: break-word;
        }
        .pd-comment-meta {
          display: flex; align-items: center; gap: 12px;
          font-size: 11px; color: #6b7280; margin-top: 4px;
        }
        .pd-comment-action {
          background: none; border: none; cursor: pointer;
          color: #6b7280; font-size: 11px; padding: 0;
          display: flex; align-items: center; gap: 3px;
        }
        .pd-comment-action:hover { color: #f9fafb; }
        .pd-comment-action.liked { color: #E53935; }
        .pd-comment-deleted {
          font-style: italic; color: #6b7280; font-size: 13px;
        }
        .pd-comments-empty {
          text-align: center; padding: 24px 16px; color: #6b7280;
          font-size: 14px;
        }

        /* Fixed comment input */
        .pd-input-bar {
          position: fixed; bottom: 0; left: 0; right: 0;
          background: #0d1117; border-top: 1px solid #1f2937;
          padding: 10px 16px; padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 10px);
          z-index: 20;
        }
        .pd-reply-indicator {
          display: flex; align-items: center; justify-content: space-between;
          padding: 6px 0 8px; font-size: 12px; color: #9ca3af;
        }
        .pd-reply-cancel {
          background: none; border: none; cursor: pointer;
          color: #E53935; font-size: 12px; font-weight: 700; padding: 0;
        }
        .pd-input-row {
          display: flex; gap: 8px; align-items: center;
        }
        .pd-comment-input {
          flex: 1; background: #1f2937; border: none; border-radius: 24px;
          padding: 10px 16px; color: #f9fafb; font-family: 'Nunito', sans-serif;
          font-size: 14px; outline: none;
        }
        .pd-comment-input::placeholder { color: #6b7280; }
        .pd-send-btn {
          width: 40px; height: 40px; border-radius: 50%; background: #E53935;
          border: none; cursor: pointer; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0;
        }
        .pd-send-btn:disabled { opacity: 0.5; cursor: default; }

        /* Confirm dialog */
        .pd-confirm-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.6); display: flex;
          align-items: center; justify-content: center;
        }
        .pd-confirm-box {
          background: #1f2937; border-radius: 12px; padding: 24px;
          max-width: 300px; width: 90%; text-align: center;
        }
        .pd-confirm-title {
          font-family: 'Exo 2', sans-serif; font-weight: 700;
          font-size: 16px; color: #f9fafb; margin-bottom: 8px;
        }
        .pd-confirm-msg {
          font-size: 14px; color: #9ca3af; margin-bottom: 20px;
        }
        .pd-confirm-actions { display: flex; gap: 12px; justify-content: center; }
        .pd-confirm-yes {
          padding: 8px 24px; border-radius: 8px; border: none;
          background: #E53935; color: #fff; font-weight: 700;
          font-size: 14px; cursor: pointer;
        }
        .pd-confirm-no {
          padding: 8px 24px; border-radius: 8px; border: none;
          background: #374151; color: #d1d5db; font-weight: 700;
          font-size: 14px; cursor: pointer;
        }

        .pd-loading {
          text-align: center; padding: 60px 20px; color: #6b7280;
          font-size: 14px;
        }
        .pd-error {
          text-align: center; padding: 60px 20px; color: #ef4444;
          font-size: 14px;
        }
      </style>

      <div class="pd-header">
        <button class="pd-header-btn" id="pd-back-btn">${BACK_ICON}</button>
        <div class="pd-header-title">Post</div>
        <div class="pd-header-actions" id="pd-owner-actions"></div>
      </div>

      <div class="pd-scroll" id="pd-scroll">
        <div class="pd-loading">Loading post...</div>
      </div>

      <div class="pd-input-bar" id="pd-input-bar" style="display:none;">
        <div class="pd-reply-indicator" id="pd-reply-indicator" style="display:none;">
          <span id="pd-reply-text"></span>
          <button class="pd-reply-cancel" id="pd-reply-cancel">Cancel</button>
        </div>
        <div class="pd-input-row">
          <input class="pd-comment-input" id="pd-comment-input" placeholder="Add a comment..." autocomplete="off">
          <button class="pd-send-btn" id="pd-send-btn">${SEND_ICON}</button>
        </div>
      </div>
    </div>
  `;
}

export function mount(context = {}) {
  postId = context.params?.id || postId;

  document.getElementById('pd-back-btn')?.addEventListener('click', () => {
    window.history.back();
  });

  loadPost();
  setupCommentInput();
}

async function loadPost() {
  const scroll = document.getElementById('pd-scroll');
  if (!scroll || !postId) return;

  try {
    const res = await api.get(`/api/posts/${postId}`);
    if (!res.success || !res.data) {
      scroll.innerHTML = '<div class="pd-error">Post not found</div>';
      return;
    }

    postData = res.data;
    renderPost();
    loadComments();
    showInputBar();
  } catch {
    scroll.innerHTML = '<div class="pd-error">Failed to load post</div>';
  }
}

function renderPost() {
  const scroll = document.getElementById('pd-scroll');
  if (!scroll || !postData) return;

  const author = postData.author || {};
  const rawPic = author.profilePic;
  const avatarUrl = rawPic ? (typeof rawPic === 'string' ? rawPic : rawPic.url || '') : '';
  const username = escapeHtml(author.username || 'Unknown');
  const time = timeAgo(postData.createdAt);

  const currentUser = getCurrentUser();
  const isOwner = currentUser && (author._id === currentUser.id);
  const isLiked = currentUser && Array.isArray(postData.likes) && postData.likes.includes(currentUser.id);
  const likesCount = postData.likesCount != null
    ? postData.likesCount
    : (Array.isArray(postData.likes) ? postData.likes.length : 0);
  const commentsCount = postData.commentsCount || 0;

  const avatarHtml = avatarUrl
    ? `<img class="pd-avatar" src="${escapeHtml(avatarUrl)}" alt="${username}">`
    : `<div class="pd-avatar"></div>`;

  // Media
  let mediaHtml = '';
  if (Array.isArray(postData.media) && postData.media.length > 0) {
    mediaHtml = postData.media.map((m) => {
      if (m.type === 'video') {
        return `<video class="pd-media-video" src="${escapeHtml(m.url)}" controls preload="metadata"></video>`;
      }
      return `<img class="pd-media" src="${escapeHtml(m.url)}" alt="Post media" loading="lazy">`;
    }).join('');
  }

  // Content
  const contentHtml = isEditing
    ? `<div style="padding: 8px 16px 16px;">
        <textarea class="pd-edit-area" id="pd-edit-textarea">${escapeHtml(postData.content || '')}</textarea>
        <div class="pd-edit-actions">
          <button class="pd-edit-btn pd-edit-cancel" id="pd-edit-cancel-btn">Cancel</button>
          <button class="pd-edit-btn pd-edit-save" id="pd-edit-save-btn">Save</button>
        </div>
      </div>`
    : `<div class="pd-content">${linkifyMentions(postData.content || '', postData.mentions)}</div>`;

  // Poll block (if poll exists on this post)
  const pollHtml = (postData.poll && Array.isArray(postData.poll.options))
    ? renderPollBlock(postData)
    : '';

  scroll.innerHTML = `
    <div class="pd-author-row">
      ${avatarHtml}
      <span class="pd-username" id="pd-author-link">${username}</span>
      <span class="pd-time">${time}</span>
    </div>
    ${mediaHtml}
    ${pollHtml}
    <div class="pd-actions">
      <button class="pd-action-btn ${isLiked ? 'liked' : ''}" id="pd-like-btn">
        ${isLiked ? HEART_FILLED : HEART_OUTLINE}
      </button>
      <button class="pd-action-btn" id="pd-comment-focus-btn">
        ${COMMENT_ICON}
        <span>${commentsCount}</span>
      </button>
    </div>
    <div class="pd-likes" id="pd-likes-count">${likesCount} likes</div>
    ${contentHtml}
    <hr class="pd-comments-divider">
    <div class="pd-comments-title">Comments</div>
    <div id="pd-comments-list">
      <div class="pd-comments-empty">Loading comments...</div>
    </div>
  `;

  // (Re)wire poll option clicks when block is rendered/replaced
  function wirePollOptions() {
    scroll.querySelectorAll('.poll-option').forEach((b) => {
      if (b.dataset.bound === '1') return;
      b.dataset.bound = '1';
      b.addEventListener('click', async () => {
        if (b.disabled) return;
        const optionId = b.dataset.optionId;
        b.disabled = true;
        try {
          const res = await api.post(`/api/posts/${postData._id}/poll/vote`, { optionId });
          if (res?.success && res.data) {
            postData.poll = res.data;
            const block = scroll.querySelector('.poll-block');
            if (block) {
              const tmp = document.createElement('div');
              tmp.innerHTML = renderPollBlock(postData);
              const fresh = tmp.querySelector('.poll-block');
              if (fresh) {
                block.replaceWith(fresh);
                wirePollOptions();
              }
            }
          }
        } finally { b.disabled = false; }
      });
    });
  }
  wirePollOptions();

  // Owner actions in header
  const ownerActions = document.getElementById('pd-owner-actions');
  if (ownerActions) {
    if (isOwner) {
      ownerActions.innerHTML = `
        <button class="pd-header-btn" id="pd-edit-btn">${EDIT_ICON}</button>
        <button class="pd-header-btn" id="pd-delete-btn">${DELETE_ICON}</button>
      `;
      document.getElementById('pd-edit-btn')?.addEventListener('click', startEditing);
      document.getElementById('pd-delete-btn')?.addEventListener('click', confirmDelete);
    } else {
      ownerActions.innerHTML = '';
    }
  }

  // Author profile link
  document.getElementById('pd-author-link')?.addEventListener('click', () => {
    if (author._id) navigate(`/user/${author._id}`);
  });

  // Like button
  document.getElementById('pd-like-btn')?.addEventListener('click', handleLikePost);

  // Focus comment input
  document.getElementById('pd-comment-focus-btn')?.addEventListener('click', () => {
    document.getElementById('pd-comment-input')?.focus();
  });

  // Edit mode handlers
  if (isEditing) {
    document.getElementById('pd-edit-cancel-btn')?.addEventListener('click', cancelEditing);
    document.getElementById('pd-edit-save-btn')?.addEventListener('click', saveEdit);
  }
}

function showInputBar() {
  const bar = document.getElementById('pd-input-bar');
  if (bar) bar.style.display = 'block';
}

async function handleLikePost() {
  if (!postId) return;
  try {
    const res = await api.put(`/api/posts/like/${postId}`);
    if (res.success && res.data) {
      // Update local state
      if (postData) {
        const currentUser = getCurrentUser();
        if (res.data.liked) {
          if (currentUser && Array.isArray(postData.likes) && !postData.likes.includes(currentUser.id)) {
            postData.likes.push(currentUser.id);
          }
        } else {
          if (currentUser && Array.isArray(postData.likes)) {
            postData.likes = postData.likes.filter((id) => id !== currentUser.id);
          }
        }
        if (res.data.likesCount != null) {
          postData.likesCount = res.data.likesCount;
        }
      }
      // Re-render post section only
      renderPost();
      loadComments();
    }
  } catch {
    // silently fail
  }
}

// --- Editing ---

function startEditing() {
  isEditing = true;
  renderPost();
  loadComments();
}

function cancelEditing() {
  isEditing = false;
  renderPost();
  loadComments();
}

async function saveEdit() {
  const textarea = document.getElementById('pd-edit-textarea');
  const saveBtn = document.getElementById('pd-edit-save-btn');
  if (!textarea || !postId) return;

  const content = textarea.value.trim();
  if (!content) return;

  if (saveBtn) saveBtn.disabled = true;

  try {
    const res = await api.put(`/api/posts/${postId}`, { content });
    if (res.success && res.data) {
      postData.content = res.data.content || content;
    }
    isEditing = false;
    renderPost();
    loadComments();
  } catch {
    if (saveBtn) saveBtn.disabled = false;
  }
}

// --- Delete ---

function confirmDelete() {
  const overlay = document.createElement('div');
  overlay.className = 'pd-confirm-overlay';
  overlay.id = 'pd-confirm-overlay';
  overlay.innerHTML = `
    <div class="pd-confirm-box">
      <div class="pd-confirm-title">Delete Post</div>
      <div class="pd-confirm-msg">Are you sure you want to delete this post? This action cannot be undone.</div>
      <div class="pd-confirm-actions">
        <button class="pd-confirm-no" id="pd-confirm-no">Cancel</button>
        <button class="pd-confirm-yes" id="pd-confirm-yes">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.getElementById('pd-confirm-no')?.addEventListener('click', () => overlay.remove());
  document.getElementById('pd-confirm-yes')?.addEventListener('click', async () => {
    const yesBtn = document.getElementById('pd-confirm-yes');
    if (yesBtn) { yesBtn.disabled = true; yesBtn.textContent = '...'; }

    try {
      const res = await api.delete(`/api/posts/${postId}`);
      overlay.remove();
      if (res.success) {
        navigate('/home');
      }
    } catch {
      overlay.remove();
    }
  });
}

// --- Comments ---

async function loadComments() {
  const container = document.getElementById('pd-comments-list');
  if (!container || !postId) return;

  try {
    const res = await api.get(`/api/comments/${postId}?page=1&limit=50`);

    let comments = [];
    if (res.success && Array.isArray(res.data)) {
      comments = res.data;
    } else if (res.success && res.data && Array.isArray(res.data.comments)) {
      comments = res.data.comments;
    }

    if (comments.length === 0) {
      container.innerHTML = '<div class="pd-comments-empty">No comments yet. Be the first!</div>';
      return;
    }

    const currentUser = getCurrentUser();

    // Separate top-level and replies
    const topLevel = [];
    const repliesMap = {};
    for (const c of comments) {
      const parentId = c.parentComment?._id || c.parentComment;
      if (parentId) {
        if (!repliesMap[parentId]) repliesMap[parentId] = [];
        repliesMap[parentId].push(c);
      } else {
        topLevel.push(c);
      }
    }

    let html = '';
    for (const c of topLevel) {
      html += renderCommentItem(c, currentUser, false);
      const replies = repliesMap[c._id] || [];
      for (const r of replies) {
        html += renderCommentItem(r, currentUser, true);
      }
    }

    container.innerHTML = html;
    attachCommentHandlers();
  } catch {
    container.innerHTML = '<div class="pd-comments-empty" style="color:#ef4444;">Failed to load comments</div>';
  }
}

function renderCommentItem(comment, currentUser, isReply) {
  if (comment.isDeleted) {
    return `
      <div class="pd-comment ${isReply ? 'reply' : ''}">
        <div class="pd-comment-avatar"></div>
        <div class="pd-comment-body">
          <span class="pd-comment-deleted">[deleted]</span>
        </div>
      </div>
    `;
  }

  const author = comment.author || {};
  const rawPic = author.profilePic;
  const pic = rawPic ? (typeof rawPic === 'string' ? rawPic : rawPic.url || '') : '';
  const avatarHtml = pic
    ? `<img class="pd-comment-avatar" src="${escapeHtml(pic)}" alt="${escapeHtml(author.username || '')}">`
    : `<div class="pd-comment-avatar"></div>`;

  const username = escapeHtml(author.username || 'Unknown');
  const time = timeAgo(comment.createdAt);
  const likesCount = Array.isArray(comment.likes) ? comment.likes.length : 0;
  const isLiked = currentUser && Array.isArray(comment.likes) && comment.likes.includes(currentUser.id);
  const isOwn = currentUser && (author._id === currentUser.id);

  const deleteBtn = isOwn
    ? `<button class="pd-comment-action comment-delete-btn" data-comment-id="${comment._id}">Delete</button>`
    : '';

  return `
    <div class="pd-comment ${isReply ? 'reply' : ''}" data-comment-id="${comment._id}">
      ${avatarHtml}
      <div class="pd-comment-body">
        <span class="pd-comment-author" data-user-id="${author._id || ''}">${username}</span>
        <span class="pd-comment-text">${linkifyMentions(comment.content || '', comment.mentions)}</span>
        <div class="pd-comment-meta">
          <span>${time}</span>
          <button class="pd-comment-action comment-like-btn ${isLiked ? 'liked' : ''}" data-comment-id="${comment._id}">
            ${isLiked ? HEART_SMALL_FILLED : HEART_SMALL}
            ${likesCount > 0 ? likesCount : ''}
          </button>
          <button class="pd-comment-action comment-reply-btn" data-comment-id="${comment._id}" data-username="${username}">Reply</button>
          ${deleteBtn}
        </div>
      </div>
    </div>
  `;
}

function attachCommentHandlers() {
  // Like comment
  document.querySelectorAll('.comment-like-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const commentId = btn.dataset.commentId;
      if (!commentId) return;
      try {
        const res = await api.put(`/api/comments/like/${commentId}`);
        if (res.success) {
          loadComments();
        }
      } catch {
        // silently fail
      }
    });
  });

  // Reply to comment
  document.querySelectorAll('.comment-reply-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const commentId = btn.dataset.commentId;
      const username = btn.dataset.username;
      setReplyTarget(commentId, username);
    });
  });

  // Delete comment
  document.querySelectorAll('.comment-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const commentId = btn.dataset.commentId;
      if (!commentId) return;
      try {
        const res = await api.delete(`/api/comments/${commentId}`);
        if (res.success) {
          loadComments();
        }
      } catch {
        // silently fail
      }
    });
  });

  // Comment author profile links
  document.querySelectorAll('.pd-comment-author').forEach((el) => {
    el.addEventListener('click', () => {
      const userId = el.dataset.userId;
      if (userId) navigate(`/user/${userId}`);
    });
  });
}

// --- Reply target ---

function setReplyTarget(commentId, username) {
  replyTarget = { commentId, username };
  const indicator = document.getElementById('pd-reply-indicator');
  const replyText = document.getElementById('pd-reply-text');
  if (indicator) indicator.style.display = 'flex';
  if (replyText) replyText.textContent = `Replying to @${username}`;

  const input = document.getElementById('pd-comment-input');
  if (input) input.focus();
}

function clearReplyTarget() {
  replyTarget = null;
  const indicator = document.getElementById('pd-reply-indicator');
  if (indicator) indicator.style.display = 'none';
}

// --- Comment input ---

function setupCommentInput() {
  const sendBtn = document.getElementById('pd-send-btn');
  const input = document.getElementById('pd-comment-input');
  const cancelReply = document.getElementById('pd-reply-cancel');

  if (input) attachMentionAutocomplete(input);

  sendBtn?.addEventListener('click', submitComment);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitComment();
    }
  });
  cancelReply?.addEventListener('click', clearReplyTarget);
}

async function submitComment() {
  const input = document.getElementById('pd-comment-input');
  const sendBtn = document.getElementById('pd-send-btn');
  if (!input || !postId) return;

  const content = input.value.trim();
  if (!content) return;

  input.value = '';
  if (sendBtn) sendBtn.disabled = true;

  const body = { content };
  if (replyTarget) {
    body.parentComment = replyTarget.commentId;
  }

  try {
    const res = await api.post(`/api/comments/${postId}`, body);
    if (res.success) {
      clearReplyTarget();
      loadComments();
    }
  } catch {
    input.value = content; // Restore on error
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    input.focus();
  }
}
