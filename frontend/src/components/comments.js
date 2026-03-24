/**
 * Comments modal component for Bikers Hub
 * Shows threaded comments for a post with ability to add new ones
 */

import { api } from '../utils/api.js';
import { getCurrentUser } from '../utils/auth.js';

let currentPostId = null;

/**
 * Open comments modal for a post
 * @param {string} postId
 */
export function openComments(postId) {
  currentPostId = postId;

  // Remove existing modal if any
  closeComments();

  const overlay = document.createElement('div');
  overlay.id = 'comments-overlay';
  overlay.innerHTML = `
    <style>
      #comments-overlay {
        position: fixed; inset: 0; z-index: 200;
        background: rgba(0,0,0,0.6); display: flex;
        flex-direction: column; justify-content: flex-end;
      }
      .comments-sheet {
        background: #0d1117; border-radius: 20px 20px 0 0;
        max-height: 70vh; display: flex; flex-direction: column;
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }
      .comments-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 20px; border-bottom: 1px solid #1f2937;
      }
      .comments-title {
        font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 16px; color: #f9fafb;
      }
      .comments-close {
        background: none; border: none; color: #9ca3af; cursor: pointer;
        font-size: 24px; padding: 0 4px; line-height: 1;
      }
      .comments-list {
        flex: 1; overflow-y: auto; padding: 12px 20px;
        min-height: 120px;
      }
      .comment-item {
        display: flex; gap: 10px; margin-bottom: 16px;
      }
      .comment-avatar {
        width: 32px; height: 32px; border-radius: 50%; background: #374151;
        flex-shrink: 0; object-fit: cover;
      }
      .comment-body { flex: 1; min-width: 0; }
      .comment-author {
        font-weight: 700; font-size: 13px; color: #f9fafb;
        margin-right: 6px;
      }
      .comment-text { font-size: 14px; color: #d1d5db; line-height: 1.4; }
      .comment-meta { font-size: 11px; color: #6b7280; margin-top: 4px; }
      .comment-deleted { font-style: italic; color: #6b7280; }
      .comments-input-bar {
        display: flex; gap: 8px; padding: 12px 16px;
        border-top: 1px solid #1f2937;
      }
      .comments-input {
        flex: 1; background: #1f2937; border: none; border-radius: 24px;
        padding: 10px 16px; color: #f9fafb; font-family: 'Nunito', sans-serif;
        font-size: 14px; outline: none;
      }
      .comments-send {
        width: 40px; height: 40px; border-radius: 50%; background: #E53935;
        border: none; cursor: pointer; display: flex; align-items: center;
        justify-content: center; flex-shrink: 0;
      }
      .comments-send:disabled { opacity: 0.5; }
      .comments-empty {
        text-align: center; padding: 32px 0; color: #6b7280; font-size: 14px;
      }
    </style>

    <div class="comments-sheet">
      <div class="comments-header">
        <div class="comments-title">Comments</div>
        <button class="comments-close" id="comments-close-btn">×</button>
      </div>
      <div class="comments-list" id="comments-list">
        <div style="text-align: center; padding: 32px 0; color: #6b7280;">Loading...</div>
      </div>
      <div class="comments-input-bar">
        <input class="comments-input" id="comment-input" placeholder="Add a comment..." autocomplete="off">
        <button class="comments-send" id="comment-send-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close on overlay click (not sheet)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeComments();
  });

  document.getElementById('comments-close-btn').addEventListener('click', closeComments);

  // Send comment
  const sendBtn = document.getElementById('comment-send-btn');
  const inputEl = document.getElementById('comment-input');

  sendBtn.addEventListener('click', () => submitComment());
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitComment();
    }
  });

  loadComments();
}

export function closeComments() {
  const existing = document.getElementById('comments-overlay');
  if (existing) existing.remove();
  currentPostId = null;
}

async function loadComments() {
  const container = document.getElementById('comments-list');
  if (!container || !currentPostId) return;

  try {
    const res = await api.get(`/api/comments/${currentPostId}?page=1&limit=50`);

    let comments = [];
    if (res.success && Array.isArray(res.data)) {
      comments = res.data;
    } else if (res.success && res.data && Array.isArray(res.data.comments)) {
      comments = res.data.comments;
    }

    if (comments.length === 0) {
      container.innerHTML = '<div class="comments-empty">No comments yet. Be the first!</div>';
      return;
    }

    container.innerHTML = comments.map((c) => {
      const author = c.author || {};
      const rawPic = author.profilePic;
      const pic = rawPic ? (typeof rawPic === 'string' ? rawPic : rawPic.url || '') : '';
      const avatarHtml = pic
        ? `<img class="comment-avatar" src="${pic}" alt="${author.username}">`
        : `<div class="comment-avatar"></div>`;

      if (c.isDeleted) {
        return `
          <div class="comment-item">
            <div class="comment-avatar"></div>
            <div class="comment-body">
              <span class="comment-deleted">[deleted]</span>
            </div>
          </div>
        `;
      }

      const timeAgo = formatTimeAgo(c.createdAt);
      const likesCount = Array.isArray(c.likes) ? c.likes.length : 0;

      return `
        <div class="comment-item">
          ${avatarHtml}
          <div class="comment-body">
            <span class="comment-author">${author.username || 'Unknown'}</span>
            <span class="comment-text">${escapeHtml(c.content || '')}</span>
            <div class="comment-meta">${timeAgo}${likesCount > 0 ? ` · ${likesCount} likes` : ''}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch {
    container.innerHTML = '<div class="comments-empty" style="color: #ef4444;">Failed to load comments</div>';
  }
}

async function submitComment() {
  const inputEl = document.getElementById('comment-input');
  const sendBtn = document.getElementById('comment-send-btn');
  if (!inputEl || !currentPostId) return;

  const content = inputEl.value.trim();
  if (!content) return;

  inputEl.value = '';
  sendBtn.disabled = true;

  try {
    const res = await api.post(`/api/comments/${currentPostId}`, { content });
    if (res.success) {
      loadComments(); // Reload
    }
  } catch {
    inputEl.value = content; // Restore on error
  } finally {
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

function formatTimeAgo(dateStr) {
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
