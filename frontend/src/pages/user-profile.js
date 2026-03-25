/**
 * User Profile page for Bikers Hub
 * Shows any user's profile with follow/unfollow, message, and posts grid
 * Route: /user/:id
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser } from '../utils/auth.js';

export function render() {
  return `
    <div class="page-dark">
      <div class="up-header">
        <button class="up-back-btn" id="up-back-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="up-header-title">Profile</div>
      </div>

      <div id="up-content">
        <div class="up-center">
          <div class="up-avatar-placeholder"></div>
          <div class="up-username">Loading...</div>
        </div>
      </div>

      <style>
        .up-header {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 20px; background: #0d1117;
          border-bottom: 1px solid #1f2937;
        }
        .up-back-btn {
          background: none; border: none; padding: 4px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .up-header-title {
          font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 18px;
          color: #f9fafb;
        }
        .up-center { text-align: center; padding: 24px 20px 0; }
        .up-avatar {
          width: 80px; height: 80px; border-radius: 50%; object-fit: cover;
          margin: 0 auto; display: block; background: #1f2937;
        }
        .up-avatar-placeholder {
          width: 80px; height: 80px; border-radius: 50%; background: #374151;
          margin: 0 auto;
        }
        .up-username {
          font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 20px;
          color: #f9fafb; margin-top: 12px;
        }
        .up-bio {
          font-family: 'Nunito', sans-serif; font-size: 14px; color: #9ca3af;
          margin-top: 6px; padding: 0 32px; line-height: 1.5;
        }
        .up-stats-row {
          display: flex; justify-content: center; gap: 32px;
          padding: 20px 20px 0;
        }
        .up-stat { text-align: center; }
        .up-stat-num {
          font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 18px;
          color: #f9fafb;
        }
        .up-stat-label {
          font-family: 'Nunito', sans-serif; font-size: 12px; color: #9ca3af;
          margin-top: 2px;
        }
        .up-actions {
          display: flex; gap: 12px; justify-content: center;
          padding: 20px 20px 0;
        }
        .up-btn {
          font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 14px;
          padding: 10px 24px; border-radius: 8px; cursor: pointer;
          border: none; transition: background 0.2s, opacity 0.2s;
        }
        .up-btn:active { opacity: 0.8; }
        .up-btn-follow {
          background: #E53935; color: #fff;
        }
        .up-btn-following {
          background: #374151; color: #f9fafb;
        }
        .up-btn-outline {
          background: transparent; color: #f9fafb;
          border: 1px solid #374151;
        }
        .up-btn-edit {
          background: #1f2937; color: #f9fafb;
        }
        .up-posts-section {
          padding: 0 20px 40px; margin-top: 24px;
          border-top: 1px solid #1f2937; padding-top: 16px;
        }
        .up-section-title {
          font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 14px;
          color: #9ca3af; margin-bottom: 12px; text-transform: uppercase;
          letter-spacing: 1px;
        }
        .up-posts-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px;
        }
        .up-posts-grid img {
          width: 100%; aspect-ratio: 1; object-fit: cover; background: #1f2937;
          border-radius: 4px; cursor: pointer;
        }
        .up-post-placeholder {
          width: 100%; aspect-ratio: 1; background: #1f2937; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          color: #374151; cursor: pointer;
        }
        .up-empty {
          text-align: center; padding: 32px 0; color: #6b7280;
          font-family: 'Nunito', sans-serif; font-size: 14px;
        }
        .up-error {
          text-align: center; padding: 48px 20px; color: #9ca3af;
          font-family: 'Nunito', sans-serif; font-size: 15px;
        }
      </style>
    </div>
  `;
}

let _context = null;

export function mount(context) {
  _context = context;
  const backBtn = document.getElementById('up-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => history.back());
  }
  loadUserProfile();
}

async function loadUserProfile() {
  const content = document.getElementById('up-content');
  if (!content) return;

  const userId = _context?.params?.id;
  if (!userId) {
    content.innerHTML = '<div class="up-error">User not found.</div>';
    return;
  }

  const currentUser = getCurrentUser();
  const isOwnProfile = currentUser && currentUser.id === userId;

  let data;
  try {
    const res = await api.get(`/api/users/${userId}`);
    if (!res.success || !res.data) {
      content.innerHTML = '<div class="up-error">Could not load profile.</div>';
      return;
    }
    data = res.data;
  } catch {
    content.innerHTML = '<div class="up-error">Could not load profile.</div>';
    return;
  }

  const user = data.user || data;
  const posts = data.posts || [];
  let followersCount = data.followersCount ?? 0;
  const followingCount = data.followingCount ?? 0;
  let isFollowing = !!data.isFollowing;

  const profilePic = user.profilePic?.url || '';
  const username = user.username || 'Unknown';
  const bio = user.bio || '';

  const avatarHtml = profilePic
    ? `<img class="up-avatar" src="${profilePic}" alt="${username}">`
    : '<div class="up-avatar-placeholder"></div>';

  // Action buttons
  let actionsHtml;
  if (isOwnProfile) {
    actionsHtml = `
      <div class="up-actions">
        <button class="up-btn up-btn-edit" id="up-edit-btn">Edit Profile</button>
      </div>
    `;
  } else {
    actionsHtml = `
      <div class="up-actions">
        <button class="up-btn ${isFollowing ? 'up-btn-following' : 'up-btn-follow'}" id="up-follow-btn">
          ${isFollowing ? 'Following' : 'Follow'}
        </button>
        <button class="up-btn up-btn-outline" id="up-message-btn">Message</button>
      </div>
    `;
  }

  // Posts grid
  let postsHtml;
  if (posts.length > 0) {
    postsHtml = `
      <div class="up-posts-section">
        <div class="up-section-title">Posts</div>
        <div class="up-posts-grid">
          ${posts.map((p) => {
            const media = Array.isArray(p.media) && p.media.length > 0 ? p.media[0] : null;
            const postId = p._id || p.id;
            if (media && media.url) {
              return `<img src="${media.url}" alt="Post" loading="lazy" data-post-id="${postId}">`;
            }
            return `<div class="up-post-placeholder" data-post-id="${postId}"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
          }).join('')}
        </div>
      </div>
    `;
  } else {
    postsHtml = `
      <div class="up-posts-section">
        <div class="up-section-title">Posts</div>
        <div class="up-empty">No posts yet.</div>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="up-center">
      ${avatarHtml}
      <div class="up-username">${username}</div>
      ${bio ? `<div class="up-bio">${bio}</div>` : ''}
    </div>

    <div class="up-stats-row">
      <div class="up-stat">
        <div class="up-stat-num">${posts.length}</div>
        <div class="up-stat-label">Posts</div>
      </div>
      <div class="up-stat">
        <div class="up-stat-num" id="up-followers-count">${followersCount}</div>
        <div class="up-stat-label">Followers</div>
      </div>
      <div class="up-stat">
        <div class="up-stat-num">${followingCount}</div>
        <div class="up-stat-label">Following</div>
      </div>
    </div>

    ${actionsHtml}
    ${postsHtml}
  `;

  // Bind post tap navigation
  const postGrid = content.querySelector('.up-posts-grid');
  if (postGrid) {
    postGrid.addEventListener('click', (e) => {
      const target = e.target.closest('[data-post-id]');
      if (target) {
        navigate('/posts/' + target.dataset.postId);
      }
    });
  }

  // Bind follow/unfollow
  const followBtn = document.getElementById('up-follow-btn');
  if (followBtn) {
    followBtn.addEventListener('click', async () => {
      followBtn.disabled = true;
      try {
        if (isFollowing) {
          await api.put(`/api/users/unfollow/${userId}`);
          isFollowing = false;
          followersCount--;
        } else {
          await api.put(`/api/users/follow/${userId}`);
          isFollowing = true;
          followersCount++;
        }
        followBtn.textContent = isFollowing ? 'Following' : 'Follow';
        followBtn.className = `up-btn ${isFollowing ? 'up-btn-following' : 'up-btn-follow'}`;
        const countEl = document.getElementById('up-followers-count');
        if (countEl) countEl.textContent = followersCount;
      } catch {
        // silently fail
      } finally {
        followBtn.disabled = false;
      }
    });
  }

  // Bind message button
  const messageBtn = document.getElementById('up-message-btn');
  if (messageBtn) {
    messageBtn.addEventListener('click', async () => {
      messageBtn.disabled = true;
      try {
        const res = await api.post('/api/conversations', { userId });
        if (res.success && res.data) {
          const convId = res.data._id || res.data.id;
          navigate('/chat/' + convId);
          return;
        }
      } catch {
        // silently fail
      }
      messageBtn.disabled = false;
    });
  }

  // Bind edit profile button
  const editBtn = document.getElementById('up-edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      navigate('/profile');
    });
  }
}
