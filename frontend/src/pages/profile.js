/**
 * Profile page for Bikers Hub
 * Shows current user info with stats, posts, edit and logout options
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser, isLoggedIn, isGuest, logout } from '../utils/auth.js';
import { renderTabBar } from '../components/tabbar.js';

export function render() {
  return `
    <div class="page-dark">
      <div class="app-header">
        <div class="app-header-title">Profile</div>
      </div>

      <div id="profile-content">
        <div class="profile-center">
          <div class="post-card-avatar profile-avatar-lg"></div>
          <div class="profile-username">Loading...</div>
        </div>
      </div>

      <style>
        .profile-stats-row {
          display: flex; justify-content: center; gap: 32px;
          padding: 16px 20px; margin-top: 8px;
        }
        .profile-stat { text-align: center; }
        .profile-stat-num {
          font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 18px; color: #f9fafb;
        }
        .profile-stat-label { font-size: 12px; color: #9ca3af; }
        .profile-bio {
          text-align: center; padding: 0 32px; font-size: 14px; color: #d1d5db;
          margin-top: 8px; line-height: 1.5;
        }
        .profile-actions { display: flex; gap: 12px; justify-content: center; margin-top: 16px; }
        .profile-posts-section {
          padding: 0 20px 80px; margin-top: 24px;
          border-top: 1px solid #1f2937; padding-top: 16px;
        }
        .profile-posts-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px;
        }
        .profile-posts-grid img {
          width: 100%; aspect-ratio: 1; object-fit: cover; background: #1f2937;
          border-radius: 4px;
        }
        .profile-posts-grid .post-placeholder {
          width: 100%; aspect-ratio: 1; background: #1f2937; border-radius: 4px;
          display: flex; align-items: center; justify-content: center; color: #374151;
        }
        .profile-section-title {
          font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 14px;
          color: #9ca3af; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;
        }
      </style>

      ${renderTabBar('profile')}
    </div>
  `;
}

export function mount() {
  loadProfile();
}

async function loadProfile() {
  const content = document.getElementById('profile-content');
  if (!content) return;

  const currentUser = getCurrentUser();
  let userData = null;
  let userPosts = [];
  let followersCount = 0;
  let followingCount = 0;

  if (isLoggedIn() && !isGuest()) {
    try {
      const res = await api.get('/api/users/me');
      if (res.success && res.data) {
        userData = res.data;
        followersCount = Array.isArray(userData.followers) ? userData.followers.length : 0;
        followingCount = Array.isArray(userData.following) ? userData.following.length : 0;
      }
    } catch {
      // use local data
    }

    // Fetch user's posts
    try {
      if (userData && userData._id) {
        const postsRes = await api.get(`/api/users/${userData._id}`);
        if (postsRes.success && postsRes.data) {
          userPosts = postsRes.data.posts || [];
          if (postsRes.data.followersCount != null) followersCount = postsRes.data.followersCount;
          if (postsRes.data.followingCount != null) followingCount = postsRes.data.followingCount;
        }
      }
    } catch {
      // silently fail
    }
  }

  const username = userData ? userData.username : (currentUser ? currentUser.username : 'Guest');
  const email = userData ? (userData.email || '') : '';
  const bio = userData ? (userData.bio || '') : '';
  const rawPic = userData ? userData.profilePic : null;
  const profilePic = rawPic ? (typeof rawPic === 'string' ? rawPic : rawPic.url || '') : '';

  const avatarHtml = profilePic
    ? `<img class="post-card-avatar profile-avatar-lg" src="${profilePic}" alt="${username}">`
    : `<div class="post-card-avatar profile-avatar-lg"></div>`;

  // Post grid
  let postsGridHtml = '';
  if (userPosts.length > 0) {
    postsGridHtml = `
      <div class="profile-posts-section">
        <div class="profile-section-title">Posts</div>
        <div class="profile-posts-grid">
          ${userPosts.map((p) => {
            const media = Array.isArray(p.media) && p.media.length > 0 ? p.media[0] : null;
            if (media && media.url) {
              return `<img src="${media.url}" alt="Post" loading="lazy">`;
            }
            return `<div class="post-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
          }).join('')}
        </div>
      </div>
    `;
  } else if (!isGuest()) {
    postsGridHtml = `
      <div class="profile-posts-section">
        <div class="profile-section-title">Posts</div>
        <div style="text-align: center; padding: 32px 0; color: #6b7280; font-size: 14px;">
          No posts yet. Share your first ride!
        </div>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="profile-center">
      ${avatarHtml}
      <div class="profile-username">${username}</div>
      <div class="profile-email">${email}</div>
      ${bio ? `<div class="profile-bio">${bio}</div>` : ''}
    </div>

    <div class="profile-stats-row">
      <div class="profile-stat">
        <div class="profile-stat-num">${userPosts.length}</div>
        <div class="profile-stat-label">Posts</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-num">${followersCount}</div>
        <div class="profile-stat-label">Followers</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-num">${followingCount}</div>
        <div class="profile-stat-label">Following</div>
      </div>
    </div>

    <div class="profile-actions">
      <button class="profile-edit-btn" id="profile-edit-btn">Edit Profile</button>
      <button class="profile-logout-btn" id="profile-logout-btn">Log Out</button>
    </div>

    ${postsGridHtml}
  `;

  const editBtn = document.getElementById('profile-edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      navigate('/edit-profile');
    });
  }

  const logoutBtn = document.getElementById('profile-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
    });
  }
}
