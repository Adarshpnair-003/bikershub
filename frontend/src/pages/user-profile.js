/**
 * User Profile page — flat, IG-inspired.
 *
 * Same shape as own profile (head row with avatar + counts, info column,
 * 3-col grid). Action row replaces Edit/Logout with Follow + Message
 * buttons. Solid color avatar fallbacks. No card chrome.
 */

import { api } from '../utils/api.js';
import { bikeApi } from '../utils/bikeApi.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser } from '../utils/auth.js';

const BACK_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const POST_PLACEHOLDER_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
const EMPTY_GRID_ICON = `<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
const ALERT_ICON = `<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

const AVATAR_COLORS = ['#E53935', '#FB8C00', '#8E24AA', '#1E88E5', '#43A047', '#00838F'];
function colorFor(seed = '') {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h) + seed.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function render() {
  return `
    <div class="page-dark">
      <style>
        .up-nav {
          display: flex; align-items: center; gap: 6px;
          padding: calc(env(safe-area-inset-top, 0px) + 6px) 4px 6px;
          background: #0C0C0C;
          border-bottom: 1px solid rgba(243,243,243,0.06);
          position: sticky; top: 0; z-index: 30;
        }
        .up-nav-btn {
          background: none; border: none; color: #F3F3F3;
          width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
        }
        .up-nav-btn:active { background: rgba(243,243,243,0.06); }
        .up-handle {
          flex: 1;
          font-weight: 600; font-size: 16px;
          color: #F3F3F3;
          letter-spacing: -0.2px;
          padding: 0 4px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .up-head {
          display: flex; align-items: center; gap: 18px;
          padding: 14px 20px 12px;
        }
        .up-av {
          width: 86px; height: 86px;
          border-radius: 50%;
          flex-shrink: 0;
          overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          font-weight: 700; font-size: 32px;
        }
        .up-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .up-stats {
          flex: 1;
          display: flex; justify-content: space-around;
        }
        .up-stat { text-align: center; }
        .up-stat-num {
          font-weight: 700; font-size: 18px;
          color: #F3F3F3;
          letter-spacing: -0.2px;
          line-height: 1.1;
        }
        .up-stat-lbl {
          font-size: 12px;
          color: rgba(243,243,243,0.6);
          margin-top: 2px;
        }
        .up-info {
          padding: 4px 20px 14px;
        }
        .up-name {
          font-weight: 600; font-size: 14.5px;
          color: #F3F3F3;
        }
        .up-bio {
          font-size: 14px;
          color: rgba(243,243,243,0.85);
          margin-top: 4px;
          line-height: 1.45;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .up-actions {
          display: flex; gap: 8px;
          padding: 0 20px 14px;
        }
        .up-btn {
          flex: 1;
          height: 36px;
          border-radius: 8px;
          font-family: 'Poppins', sans-serif;
          font-weight: 600; font-size: 13.5px;
          cursor: pointer;
          transition: opacity 0.12s;
        }
        .up-btn:active { opacity: 0.7; }
        .up-btn:disabled { opacity: 0.6; }
        .up-btn.primary {
          background: #E53935; color: #fff; border: 1px solid #E53935;
        }
        .up-btn.outline {
          background: transparent; color: #F3F3F3;
          border: 1px solid rgba(243,243,243,0.18);
        }
        .up-divider { height: 1px; background: rgba(243,243,243,0.06); }
        .up-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          padding-bottom: 60px;
        }
        .up-cell {
          aspect-ratio: 1 / 1;
          background: #1E1E1E;
          overflow: hidden;
          cursor: pointer;
          position: relative;
        }
        .up-cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .up-cell.empty {
          display: flex; align-items: center; justify-content: center;
          color: rgba(243,243,243,0.25);
        }
        .up-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px 32px 100px;
          text-align: center;
        }
        .up-empty-icon { margin-bottom: 14px; color: rgba(243,243,243,0.18); }
        .up-empty-title {
          font-weight: 600; font-size: 16px;
          color: #F3F3F3;
          margin-bottom: 4px;
        }
        .up-skel {
          background: linear-gradient(90deg, #1E1E1E 0%, #2A2A2A 50%, #1E1E1E 100%);
          background-size: 200% 100%;
          animation: upShim 1.4s infinite;
          border-radius: 6px;
        }
        @keyframes upShim {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Garage tab */
        .up-tabs { display: flex; border-top: 1px solid rgba(243,243,243,0.06); border-bottom: 1px solid rgba(243,243,243,0.06); }
        .up-tab { flex: 1; background: transparent; border: none; color: rgba(243,243,243,0.5); font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; padding: 12px 0; cursor: pointer; position: relative; }
        .up-tab.active { color: #F3F3F3; }
        .up-tab.active::after { content: ''; position: absolute; bottom: -1px; left: 50%; transform: translateX(-50%); width: 32px; height: 2px; background: #E53935; border-radius: 2px; }

        .up-garage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; padding: 2px 2px 80px; }
        .up-bike-card { aspect-ratio: 4/3; background: #1E1E1E; position: relative; overflow: hidden; border-radius: 4px; cursor: pointer; }
        .up-bike-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .up-bike-overlay { position: absolute; left: 0; right: 0; bottom: 0; padding: 8px 10px; background: rgba(0,0,0,0.55); }
        .up-bike-name { font-size: 13.5px; font-weight: 600; color: #F3F3F3; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .up-bike-spec { font-size: 11.5px; color: rgba(243,243,243,0.6); margin-top: 2px; }
        .up-bike-star { position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: #E53935; font-size: 13px; }

        .up-garage-empty { display: flex; flex-direction: column; align-items: center; padding: 60px 32px 100px; text-align: center; }
        .up-garage-empty-sub { font-size: 13px; color: rgba(243,243,243,0.5); }
      </style>

      <div id="up-content">
        <div class="up-nav">
          <button class="up-nav-btn" id="up-back-btn" aria-label="Back">${BACK_ICON}</button>
          <div class="up-handle">Loading…</div>
        </div>
        <div class="up-head">
          <div class="up-skel" style="width:86px;height:86px;border-radius:50%"></div>
          <div class="up-stats"></div>
        </div>
      </div>
    </div>
  `;
}

let _context = null;

export function mount(context) {
  _context = context;
  document.getElementById('up-back-btn')?.addEventListener('click', () => history.back());
  loadUserProfile();
}

async function loadUserProfile() {
  const content = document.getElementById('up-content');
  if (!content) return;

  const userId = _context?.params?.id;
  if (!userId) {
    content.innerHTML = `
      <div class="up-empty">
        <div class="up-empty-icon">${ALERT_ICON}</div>
        <div class="up-empty-title">User not found</div>
      </div>`;
    return;
  }

  const currentUser = getCurrentUser();
  const isOwnProfile = currentUser && currentUser.id === userId;

  let data;
  try {
    const res = await api.get(`/api/users/${userId}`);
    if (!res.success || !res.data) {
      content.innerHTML = `<div class="up-empty"><div class="up-empty-title">Could not load profile</div></div>`;
      return;
    }
    data = res.data;
  } catch {
    content.innerHTML = `<div class="up-empty"><div class="up-empty-title">Could not load profile</div></div>`;
    return;
  }

  const user = data.user || data;
  const posts = data.posts || [];
  let followersCount = data.followersCount ?? 0;
  const followingCount = data.followingCount ?? 0;
  let isFollowing = !!data.isFollowing;

  const rawPic = user.profilePic;
  const profilePic = rawPic ? (typeof rawPic === 'string' ? rawPic : rawPic.url || '') : '';
  const username = user.username || 'Unknown';
  const bio = user.bio || '';

  const avatarImg = profilePic
    ? `<div class="up-av"><img src="${escapeAttr(profilePic)}" alt="${escapeAttr(username)}"></div>`
    : `<div class="up-av" style="background:${colorFor(username)}">${escapeHtml(username.charAt(0).toUpperCase())}</div>`;

  const actionsHtml = isOwnProfile
    ? `<div class="up-actions">
        <button class="up-btn outline" id="up-edit-btn">Edit Profile</button>
      </div>`
    : `<div class="up-actions">
        <button class="up-btn ${isFollowing ? 'outline' : 'primary'}" id="up-follow-btn">${isFollowing ? 'Following' : 'Follow'}</button>
        <button class="up-btn outline" id="up-message-btn">Message</button>
      </div>`;

  const postsHtml = posts.length > 0
    ? `
      <div class="up-grid">
        ${posts.map((p) => {
          const media = Array.isArray(p.media) && p.media.length > 0 ? p.media[0] : null;
          const postId = p._id || p.id;
          if (media && media.url) {
            return `<div class="up-cell" data-post-id="${postId}"><img src="${escapeAttr(media.url)}" alt="Post" loading="lazy"></div>`;
          }
          return `<div class="up-cell empty" data-post-id="${postId}">${POST_PLACEHOLDER_ICON}</div>`;
        }).join('')}
      </div>`
    : `
      <div class="up-empty">
        <div class="up-empty-icon">${EMPTY_GRID_ICON}</div>
        <div class="up-empty-title">No posts yet</div>
      </div>`;

  content.innerHTML = `
    <div class="up-nav">
      <button class="up-nav-btn" id="up-back-btn" aria-label="Back">${BACK_ICON}</button>
      <div class="up-handle">${escapeHtml(username)}</div>
    </div>

    <section class="up-head">
      ${avatarImg}
      <div class="up-stats">
        <div class="up-stat">
          <div class="up-stat-num">${posts.length}</div>
          <div class="up-stat-lbl">Posts</div>
        </div>
        <div class="up-stat">
          <div class="up-stat-num" id="up-followers-count">${followersCount}</div>
          <div class="up-stat-lbl">Followers</div>
        </div>
        <div class="up-stat">
          <div class="up-stat-num">${followingCount}</div>
          <div class="up-stat-lbl">Following</div>
        </div>
      </div>
    </section>

    <section class="up-info">
      <div class="up-name">${escapeHtml(username)}</div>
      ${bio ? `<div class="up-bio">${escapeHtml(bio)}</div>` : ''}
    </section>

    ${actionsHtml}

    <div class="up-tabs">
      <button class="up-tab active" id="up-tab-posts" data-tab="posts">Posts</button>
      <button class="up-tab" id="up-tab-garage" data-tab="garage">Garage</button>
    </div>

    <div id="up-tab-content"></div>
  `;

  document.getElementById('up-back-btn')?.addEventListener('click', () => history.back());

  // Tab state — read-only garage (no FAB, no 3-dot menu)
  let activeTab = 'posts';
  let cachedBikes = null;
  const tabPosts = document.getElementById('up-tab-posts');
  const tabGarage = document.getElementById('up-tab-garage');
  const tabContent = document.getElementById('up-tab-content');

  if (tabPosts) tabPosts.addEventListener('click', () => switchTab('posts'));
  if (tabGarage) tabGarage.addEventListener('click', () => switchTab('garage'));

  renderActiveTab();

  function switchTab(tab) {
    activeTab = tab;
    [tabPosts, tabGarage].forEach((b) => b?.classList.toggle('active', b?.dataset.tab === tab));
    renderActiveTab();
  }

  function renderActiveTab() {
    if (!tabContent) return;
    if (activeTab === 'posts') {
      tabContent.innerHTML = postsHtml;
      tabContent.querySelectorAll('.up-grid .up-cell[data-post-id]').forEach((cell) => {
        cell.addEventListener('click', () => {
          const pid = cell.dataset.postId;
          if (pid) navigate(`/posts/${pid}`);
        });
      });
    } else {
      renderGarageTab();
    }
  }

  async function renderGarageTab() {
    tabContent.innerHTML = '<div class="up-garage-empty"><div class="up-garage-empty-sub">Loading garage…</div></div>';
    try {
      if (!cachedBikes) {
        const res = await bikeApi.listByUser(userId);
        cachedBikes = res.success ? (res.data || []) : [];
      }
      if (tabGarage) tabGarage.textContent = `Garage · ${cachedBikes.length}`;

      if (cachedBikes.length === 0) {
        tabContent.innerHTML = '<div class="up-garage-empty"><div class="up-garage-empty-sub">No bikes yet.</div></div>';
        return;
      }

      const cardsHtml = cachedBikes.map((b) => `
        <div class="up-bike-card" data-id="${b._id}">
          <img src="${escapeAttr(b.photo?.url || '')}" alt="${escapeAttr(b.brand + ' ' + b.model)}">
          ${b.isPrimary ? '<div class="up-bike-star">★</div>' : ''}
          <div class="up-bike-overlay">
            <div class="up-bike-name">${escapeHtml(b.brand)} ${escapeHtml(b.model)}</div>
            <div class="up-bike-spec">${b.year} · ${b.engineCC}cc</div>
          </div>
        </div>
      `).join('');

      tabContent.innerHTML = `<div class="up-garage-grid">${cardsHtml}</div>`;
      tabContent.querySelectorAll('.up-bike-card').forEach((el) => {
        el.addEventListener('click', () => navigate('/garage/' + userId + '/' + el.dataset.id));
      });
    } catch {
      tabContent.innerHTML = '<div class="up-garage-empty"><div class="up-garage-empty-sub">Couldn\'t load garage.</div></div>';
    }
  }

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
        followBtn.className = `up-btn ${isFollowing ? 'outline' : 'primary'}`;
        followBtn.textContent = isFollowing ? 'Following' : 'Follow';
        const countEl = document.getElementById('up-followers-count');
        if (countEl) countEl.textContent = followersCount;
      } catch { /* silently */ }
      finally { followBtn.disabled = false; }
    });
  }

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
      } catch { /* silently */ }
      messageBtn.disabled = false;
    });
  }

  document.getElementById('up-edit-btn')?.addEventListener('click', () => navigate('/edit-profile'));
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
function escapeAttr(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
