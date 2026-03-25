/**
 * Club detail page for Bikers Hub
 * Shows club info, members, admin panel, and club posts feed
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser } from '../utils/auth.js';

const BACK_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`;
const LOCK_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
const GLOBE_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

export function render() {
  return `
    <style>
      .cd-page {
        min-height: 100vh; background: #0d1117; color: #f9fafb;
        font-family: 'Nunito', sans-serif; padding-bottom: 32px;
      }
      .cd-header {
        display: flex; align-items: center; gap: 12px;
        padding: 16px 20px; background: #1f2937;
        border-bottom: 1px solid #374151; position: sticky; top: 0; z-index: 10;
      }
      .cd-header-back {
        background: none; border: none; cursor: pointer; padding: 4px;
        display: flex; align-items: center;
      }
      .cd-header-title {
        font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 18px;
        color: #f9fafb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .cd-info {
        padding: 20px; background: #1f2937; margin: 12px 16px; border-radius: 12px;
      }
      .cd-description {
        font-size: 14px; color: #d1d5db; line-height: 1.6; margin-bottom: 12px;
      }
      .cd-badges {
        display: flex; gap: 10px; flex-wrap: wrap;
      }
      .cd-badge {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 12px; font-weight: 700; padding: 4px 10px;
        border-radius: 20px; background: #374151; color: #d1d5db;
      }
      .cd-badge--primary { background: #E53935; color: #fff; }
      .cd-section-title {
        font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 15px;
        color: #f9fafb; padding: 16px 20px 8px; text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .cd-members-scroll {
        display: flex; gap: 16px; overflow-x: auto; padding: 8px 20px 16px;
        -webkit-overflow-scrolling: touch; scrollbar-width: none;
      }
      .cd-members-scroll::-webkit-scrollbar { display: none; }
      .cd-member {
        display: flex; flex-direction: column; align-items: center; gap: 6px;
        cursor: pointer; flex-shrink: 0; width: 64px;
      }
      .cd-member-avatar {
        width: 52px; height: 52px; border-radius: 50%; background: #374151;
        border: 2px solid #4b5563; overflow: hidden;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 18px; color: #9ca3af;
      }
      .cd-member-avatar img {
        width: 100%; height: 100%; object-fit: cover;
      }
      .cd-member-name {
        font-size: 11px; color: #9ca3af; text-align: center;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 64px;
      }
      .cd-actions { padding: 0 20px 8px; }
      .cd-btn {
        width: 100%; padding: 12px; border: none; border-radius: 10px;
        font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 15px;
        cursor: pointer; transition: opacity 0.2s;
      }
      .cd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .cd-btn--join { background: #E53935; color: #fff; }
      .cd-btn--leave { background: #374151; color: #d1d5db; }
      .cd-admin-panel {
        margin: 12px 16px; padding: 16px; background: #1f2937; border-radius: 12px;
        border: 1px solid #374151;
      }
      .cd-admin-title {
        font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 14px;
        color: #E53935; margin-bottom: 12px; text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .cd-request {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 0; border-bottom: 1px solid #374151;
      }
      .cd-request:last-child { border-bottom: none; }
      .cd-request-name { font-size: 14px; font-weight: 600; color: #f9fafb; }
      .cd-request-actions { display: flex; gap: 8px; }
      .cd-req-btn {
        padding: 6px 14px; border: none; border-radius: 6px;
        font-size: 12px; font-weight: 700; cursor: pointer;
        font-family: 'Nunito', sans-serif;
      }
      .cd-req-btn--approve { background: #22c55e; color: #fff; }
      .cd-req-btn--reject { background: #E53935; color: #fff; }
      .cd-no-requests { font-size: 13px; color: #6b7280; text-align: center; padding: 8px 0; }
      .cd-post-form {
        margin: 12px 16px; padding: 16px; background: #1f2937; border-radius: 12px;
      }
      .cd-post-textarea {
        width: 100%; min-height: 80px; background: #374151; border: 1px solid #4b5563;
        border-radius: 8px; color: #f9fafb; font-family: 'Nunito', sans-serif;
        font-size: 14px; padding: 12px; resize: vertical; box-sizing: border-box;
      }
      .cd-post-textarea::placeholder { color: #6b7280; }
      .cd-post-textarea:focus { outline: none; border-color: #E53935; }
      .cd-post-submit {
        margin-top: 10px; padding: 10px 24px; background: #E53935; color: #fff;
        border: none; border-radius: 8px; font-family: 'Nunito', sans-serif;
        font-weight: 700; font-size: 14px; cursor: pointer; float: right;
      }
      .cd-post-submit:disabled { opacity: 0.5; cursor: not-allowed; }
      .cd-posts-feed { padding: 0 16px 16px; }
      .cd-post-card {
        background: #1f2937; border-radius: 12px; padding: 16px; margin-bottom: 12px;
      }
      .cd-post-author {
        display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
      }
      .cd-post-avatar {
        width: 36px; height: 36px; border-radius: 50%; background: #374151;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 14px; color: #9ca3af; overflow: hidden;
      }
      .cd-post-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .cd-post-username { font-size: 14px; font-weight: 700; color: #f9fafb; }
      .cd-post-time { font-size: 11px; color: #6b7280; }
      .cd-post-content { font-size: 14px; color: #d1d5db; line-height: 1.5; }
      .cd-post-media {
        margin-top: 10px; border-radius: 8px; overflow: hidden;
      }
      .cd-post-media img {
        width: 100%; display: block; border-radius: 8px;
      }
      .cd-post-stats {
        display: flex; gap: 16px; margin-top: 10px; font-size: 12px; color: #6b7280;
      }
      .cd-empty {
        text-align: center; padding: 40px 20px; color: #6b7280; font-size: 14px;
      }
      .cd-loading {
        text-align: center; padding: 40px 20px; color: #6b7280; font-size: 14px;
      }
      .cd-error {
        text-align: center; padding: 40px 20px; color: #E53935; font-size: 14px;
      }
    </style>

    <div class="cd-page">
      <div class="cd-header">
        <button class="cd-header-back" id="cd-back-btn">${BACK_ICON}</button>
        <div class="cd-header-title" id="cd-club-name">Loading...</div>
      </div>
      <div id="cd-content">
        <div class="cd-loading">Loading club details...</div>
      </div>
    </div>
  `;
}

export function mount(context) {
  const clubId = context.params.id;
  const currentUser = getCurrentUser();

  document.getElementById('cd-back-btn').addEventListener('click', () => {
    navigate('/clubs');
  });

  loadClubDetail(clubId, currentUser);
}

async function loadClubDetail(clubId, currentUser) {
  const container = document.getElementById('cd-content');
  if (!container) return;

  let club;
  try {
    const res = await api.get(`/api/clubs/${clubId}`);
    if (res.success && res.data) {
      club = res.data;
    } else {
      container.innerHTML = `<div class="cd-error">Club not found.</div>`;
      return;
    }
  } catch {
    container.innerHTML = `<div class="cd-error">Failed to load club details.</div>`;
    return;
  }

  // Set header title
  const titleEl = document.getElementById('cd-club-name');
  if (titleEl) titleEl.textContent = club.name || 'Club';

  // Determine membership status
  const userId = currentUser ? currentUser.id : null;
  const ownerId = club.owner?._id || club.owner;
  const isOwner = userId && ownerId && String(ownerId) === String(userId);
  const members = Array.isArray(club.members) ? club.members : [];
  const isMember = userId && members.some((m) => {
    const mid = typeof m === 'string' ? m : (m._id || m.user);
    return String(mid) === String(userId);
  });
  const memberCount = club.membersCount || members.length || 0;
  const isPrivate = club.isPrivate || club.privacy === 'private';

  // Build info section
  const infoHtml = `
    <div class="cd-info">
      ${club.description ? `<div class="cd-description">${escapeHtml(club.description)}</div>` : ''}
      <div class="cd-badges">
        <span class="cd-badge cd-badge--primary">${memberCount} member${memberCount !== 1 ? 's' : ''}</span>
        <span class="cd-badge">
          ${isPrivate ? LOCK_ICON : GLOBE_ICON}
          ${isPrivate ? 'Private' : 'Public'}
        </span>
      </div>
    </div>
  `;

  // Build members section
  const membersHtml = members.length > 0 ? `
    <div class="cd-section-title">Members</div>
    <div class="cd-members-scroll">
      ${members.map((m) => {
        const memberId = typeof m === 'string' ? m : (m._id || m.user);
        const name = m.username || m.name || 'User';
        const pic = m.profilePic;
        const avatarUrl = pic ? (typeof pic === 'string' ? pic : pic.url || '') : '';
        const initial = name.charAt(0).toUpperCase();
        return `
          <div class="cd-member" data-member-id="${memberId}">
            <div class="cd-member-avatar">
              ${avatarUrl ? `<img src="${avatarUrl}" alt="${escapeHtml(name)}">` : initial}
            </div>
            <div class="cd-member-name">${escapeHtml(name)}</div>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  // Build action button
  let actionHtml = '';
  if (currentUser && !isOwner) {
    if (isMember) {
      actionHtml = `
        <div class="cd-actions">
          <button class="cd-btn cd-btn--leave" id="cd-leave-btn">Leave Club</button>
        </div>
      `;
    } else {
      actionHtml = `
        <div class="cd-actions">
          <button class="cd-btn cd-btn--join" id="cd-join-btn">Join Club</button>
        </div>
      `;
    }
  }

  // Build admin panel (owner only)
  let adminHtml = '';
  if (isOwner) {
    adminHtml = `
      <div class="cd-admin-panel">
        <div class="cd-admin-title">Admin Panel - Join Requests</div>
        <div id="cd-requests-list">
          <div class="cd-loading">Loading requests...</div>
        </div>
      </div>
    `;
  }

  // Build post form (member or owner)
  let postFormHtml = '';
  if (currentUser && (isMember || isOwner)) {
    postFormHtml = `
      <div class="cd-section-title">Post in Club</div>
      <div class="cd-post-form">
        <textarea class="cd-post-textarea" id="cd-post-input" placeholder="Share something with the club..." maxlength="2000"></textarea>
        <button class="cd-post-submit" id="cd-post-submit-btn">Post</button>
        <div style="clear: both;"></div>
      </div>
    `;
  }

  // Build posts section placeholder
  const postsSectionHtml = `
    <div class="cd-section-title">Club Posts</div>
    <div class="cd-posts-feed" id="cd-posts-feed">
      <div class="cd-loading">Loading posts...</div>
    </div>
  `;

  container.innerHTML = infoHtml + membersHtml + actionHtml + adminHtml + postFormHtml + postsSectionHtml;

  // Attach event handlers
  attachMemberClickHandlers();
  attachActionHandlers(clubId, currentUser);

  if (currentUser && (isMember || isOwner)) {
    attachPostFormHandler(clubId);
  }

  if (isOwner) {
    loadJoinRequests(clubId);
  }

  loadClubPosts(clubId);
}

function attachMemberClickHandlers() {
  document.querySelectorAll('.cd-member').forEach((el) => {
    el.addEventListener('click', () => {
      const memberId = el.dataset.memberId;
      if (memberId) navigate(`/user/${memberId}`);
    });
  });
}

function attachActionHandlers(clubId, currentUser) {
  const joinBtn = document.getElementById('cd-join-btn');
  if (joinBtn) {
    joinBtn.addEventListener('click', async () => {
      joinBtn.disabled = true;
      joinBtn.textContent = 'Joining...';
      try {
        const res = await api.post(`/api/clubs/${clubId}/join`);
        if (res.success) {
          joinBtn.textContent = 'Joined!';
          joinBtn.classList.remove('cd-btn--join');
          joinBtn.classList.add('cd-btn--leave');
          // Reload to reflect new state
          setTimeout(() => loadClubDetail(clubId, currentUser), 800);
        } else {
          joinBtn.textContent = res.error?.message || 'Failed to join';
          setTimeout(() => { joinBtn.textContent = 'Join Club'; joinBtn.disabled = false; }, 2000);
        }
      } catch {
        joinBtn.textContent = 'Join Club';
        joinBtn.disabled = false;
      }
    });
  }

  const leaveBtn = document.getElementById('cd-leave-btn');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to leave this club?')) return;
      leaveBtn.disabled = true;
      leaveBtn.textContent = 'Leaving...';
      try {
        const res = await api.put(`/api/clubs/leave/${clubId}`);
        if (res.success) {
          leaveBtn.textContent = 'Left';
          setTimeout(() => loadClubDetail(clubId, currentUser), 800);
        } else {
          leaveBtn.textContent = res.error?.message || 'Failed';
          setTimeout(() => { leaveBtn.textContent = 'Leave Club'; leaveBtn.disabled = false; }, 2000);
        }
      } catch {
        leaveBtn.textContent = 'Leave Club';
        leaveBtn.disabled = false;
      }
    });
  }
}

function attachPostFormHandler(clubId) {
  const submitBtn = document.getElementById('cd-post-submit-btn');
  const input = document.getElementById('cd-post-input');
  if (!submitBtn || !input) return;

  submitBtn.addEventListener('click', async () => {
    const content = input.value.trim();
    if (!content) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';
    try {
      const res = await api.post(`/api/clubs/${clubId}/post`, { content });
      if (res.success) {
        input.value = '';
        submitBtn.textContent = 'Post';
        submitBtn.disabled = false;
        loadClubPosts(clubId);
      } else {
        submitBtn.textContent = res.error?.message || 'Failed';
        setTimeout(() => { submitBtn.textContent = 'Post'; submitBtn.disabled = false; }, 2000);
      }
    } catch {
      submitBtn.textContent = 'Post';
      submitBtn.disabled = false;
    }
  });
}

async function loadJoinRequests(clubId) {
  const container = document.getElementById('cd-requests-list');
  if (!container) return;

  try {
    const res = await api.get(`/api/clubs/${clubId}/requests`);
    let requests = [];
    if (res.success && Array.isArray(res.data)) {
      requests = res.data;
    } else if (res.success && res.data && Array.isArray(res.data.requests)) {
      requests = res.data.requests;
    } else if (res.success && res.data && Array.isArray(res.data.joinRequests)) {
      requests = res.data.joinRequests;
    }

    if (requests.length === 0) {
      container.innerHTML = `<div class="cd-no-requests">No pending requests</div>`;
      return;
    }

    container.innerHTML = requests.map((r) => {
      const user = r.user || r;
      const uid = user._id || r._id || r.userId;
      const name = user.username || user.name || 'Unknown';
      return `
        <div class="cd-request" data-user-id="${uid}">
          <div class="cd-request-name">${escapeHtml(name)}</div>
          <div class="cd-request-actions">
            <button class="cd-req-btn cd-req-btn--approve" data-action="approve" data-uid="${uid}">Approve</button>
            <button class="cd-req-btn cd-req-btn--reject" data-action="reject" data-uid="${uid}">Reject</button>
          </div>
        </div>
      `;
    }).join('');

    // Attach approve/reject handlers
    container.querySelectorAll('.cd-req-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const uid = btn.dataset.uid;
        if (!action || !uid) return;

        btn.disabled = true;
        const row = btn.closest('.cd-request');
        try {
          const endpoint = `/api/clubs/${action}/${clubId}/${uid}`;
          const res = await api.put(endpoint);
          if (res.success) {
            if (row) row.remove();
            // Check if list is now empty
            const remaining = container.querySelectorAll('.cd-request');
            if (remaining.length === 0) {
              container.innerHTML = `<div class="cd-no-requests">No pending requests</div>`;
            }
          } else {
            btn.disabled = false;
          }
        } catch {
          btn.disabled = false;
        }
      });
    });
  } catch {
    container.innerHTML = `<div class="cd-no-requests">Failed to load requests</div>`;
  }
}

async function loadClubPosts(clubId) {
  const feed = document.getElementById('cd-posts-feed');
  if (!feed) return;

  try {
    const res = await api.get(`/api/clubs/${clubId}/posts`);
    let posts = [];
    if (res.success && Array.isArray(res.data)) {
      posts = res.data;
    } else if (res.success && res.data && Array.isArray(res.data.posts)) {
      posts = res.data.posts;
    }

    if (posts.length === 0) {
      feed.innerHTML = `<div class="cd-empty">No posts yet. Be the first to share something!</div>`;
      return;
    }

    feed.innerHTML = posts.map((post) => {
      const author = post.author || {};
      const username = author.username || author.name || 'Unknown';
      const rawPic = author.profilePic;
      const avatarUrl = rawPic ? (typeof rawPic === 'string' ? rawPic : rawPic.url || '') : '';
      const initial = username.charAt(0).toUpperCase();
      const time = timeAgo(post.createdAt);
      const likesCount = post.likesCount || (Array.isArray(post.likes) ? post.likes.length : 0);
      const commentsCount = post.commentsCount || 0;

      let mediaHtml = '';
      if (Array.isArray(post.media) && post.media.length > 0) {
        const firstMedia = post.media[0];
        const mediaUrl = typeof firstMedia === 'string' ? firstMedia : (firstMedia.url || '');
        if (mediaUrl) {
          mediaHtml = `<div class="cd-post-media"><img src="${mediaUrl}" alt="Post media" loading="lazy"></div>`;
        }
      }

      return `
        <div class="cd-post-card">
          <div class="cd-post-author">
            <div class="cd-post-avatar">
              ${avatarUrl ? `<img src="${avatarUrl}" alt="${escapeHtml(username)}">` : initial}
            </div>
            <div>
              <div class="cd-post-username">${escapeHtml(username)}</div>
              <div class="cd-post-time">${time}</div>
            </div>
          </div>
          ${post.content ? `<div class="cd-post-content">${escapeHtml(post.content)}</div>` : ''}
          ${mediaHtml}
          <div class="cd-post-stats">
            <span>${likesCount} like${likesCount !== 1 ? 's' : ''}</span>
            <span>${commentsCount} comment${commentsCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch {
    feed.innerHTML = `<div class="cd-empty">Failed to load posts.</div>`;
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
