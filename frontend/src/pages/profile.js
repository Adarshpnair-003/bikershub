/**
 * Profile page — flat, IG-inspired.
 *
 * Header row: 86px solid avatar + counts inline (posts/followers/following).
 * Username block + bio sit below in left-aligned column. Action row uses
 * outline buttons (Edit Profile, Log Out). Posts as 3-col grid.
 */

import { api } from '../utils/api.js';
import { bikeApi } from '../utils/bikeApi.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser, isLoggedIn, isGuest, logout } from '../utils/auth.js';
import { renderTabBar } from '../components/tabbar.js';

const SETTINGS_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
const POST_PLACEHOLDER_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
const EMPTY_GRID_ICON = `<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;

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
        .pf-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: calc(env(safe-area-inset-top, 0px) + 10px) 16px 6px;
          background: #0C0C0C;
        }
        .pf-handle {
          font-weight: 700; font-size: 18px;
          color: #F3F3F3;
          letter-spacing: -0.3px;
          flex: 1;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .pf-nav-btn {
          background: none; border: none; color: #F3F3F3;
          width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
        }
        .pf-nav-btn:active { background: rgba(243,243,243,0.06); }

        .pf-head {
          display: flex; align-items: center; gap: 18px;
          padding: 14px 20px 12px;
        }
        .pf-av {
          width: 86px; height: 86px;
          border-radius: 50%;
          flex-shrink: 0;
          overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          font-weight: 700; font-size: 32px;
        }
        .pf-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .pf-stats {
          flex: 1;
          display: flex; justify-content: space-around;
        }
        .pf-stat { text-align: center; }
        .pf-stat-num {
          font-weight: 700; font-size: 18px;
          color: #F3F3F3;
          letter-spacing: -0.2px;
          line-height: 1.1;
        }
        .pf-stat-lbl {
          font-size: 12px;
          color: rgba(243,243,243,0.6);
          margin-top: 2px;
        }

        .pf-info {
          padding: 4px 20px 14px;
        }
        .pf-name {
          font-weight: 600; font-size: 14.5px;
          color: #F3F3F3;
          letter-spacing: -0.1px;
        }
        .pf-email {
          font-size: 13px;
          color: rgba(243,243,243,0.5);
          margin-top: 2px;
        }
        .pf-bio {
          font-size: 14px;
          color: rgba(243,243,243,0.85);
          margin-top: 6px;
          line-height: 1.45;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .pf-actions {
          display: flex; gap: 8px;
          padding: 0 20px 14px;
        }
        .pf-btn {
          flex: 1;
          height: 36px;
          background: transparent;
          border: 1px solid rgba(243,243,243,0.18);
          color: #F3F3F3;
          border-radius: 8px;
          font-family: 'Poppins', sans-serif;
          font-weight: 600; font-size: 13.5px;
          cursor: pointer;
          transition: opacity 0.12s;
        }
        .pf-btn:active { opacity: 0.7; }
        .pf-btn.danger { color: #E53935; border-color: rgba(229,57,53,0.35); }

        .pf-divider {
          height: 1px;
          background: rgba(243,243,243,0.06);
        }

        .pf-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          padding-bottom: 80px;
        }
        .pf-cell {
          aspect-ratio: 1 / 1;
          background: #1E1E1E;
          overflow: hidden;
          cursor: pointer;
          position: relative;
        }
        .pf-cell img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .pf-cell.empty {
          display: flex; align-items: center; justify-content: center;
          color: rgba(243,243,243,0.25);
        }

        .pf-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px 32px 100px;
          text-align: center;
        }
        .pf-empty-icon { margin-bottom: 14px; color: rgba(243,243,243,0.18); }
        .pf-empty-title {
          font-weight: 600; font-size: 16px;
          color: #F3F3F3;
          margin-bottom: 4px;
        }
        .pf-empty-sub {
          font-size: 13px;
          color: rgba(243,243,243,0.5);
          line-height: 1.5;
          margin-bottom: 14px;
        }
        .pf-cta {
          background: #E53935;
          color: #fff;
          border: none;
          height: 38px;
          padding: 0 20px;
          border-radius: 8px;
          font-family: 'Poppins', sans-serif;
          font-weight: 600; font-size: 13.5px;
          cursor: pointer;
        }

        .pf-skel {
          background: linear-gradient(90deg, #1E1E1E 0%, #2A2A2A 50%, #1E1E1E 100%);
          background-size: 200% 100%;
          animation: pfShim 1.4s infinite;
          border-radius: 6px;
        }
        @keyframes pfShim {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Achievements row */
        .pf-ach-section { padding: 16px 16px 0; }
        .pf-ach-title { font-size: 13px; font-weight: 600; color: rgba(243,243,243,0.6); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 10px; }
        .pf-ach-row { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .pf-ach-row::-webkit-scrollbar { display: none; }
        .pf-ach-tile { flex-shrink: 0; width: 78px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .pf-ach-icon { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 26px; background: #1E1E1E; border: 2px solid rgba(243,243,243,0.08); }
        .pf-ach-tile.earned .pf-ach-icon { background: linear-gradient(145deg, #E53935 0%, #b71c1c 100%); border-color: #E53935; box-shadow: 0 4px 12px rgba(229,57,53,0.3); }
        .pf-ach-tile.locked .pf-ach-icon { filter: grayscale(1) brightness(0.4); }
        .pf-ach-name { font-size: 10.5px; color: rgba(243,243,243,0.7); text-align: center; line-height: 1.1; }
        .pf-ach-tile.earned .pf-ach-name { color: #F3F3F3; font-weight: 600; }

        /* Garage tab strip */
        .pf-tabs { display: flex; border-top: 1px solid rgba(243,243,243,0.06); border-bottom: 1px solid rgba(243,243,243,0.06); }
        .pf-tab { flex: 1; background: transparent; border: none; color: rgba(243,243,243,0.5); font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; padding: 12px 0; cursor: pointer; position: relative; }
        .pf-tab.active { color: #F3F3F3; }
        .pf-tab.active::after { content: ''; position: absolute; bottom: -1px; left: 50%; transform: translateX(-50%); width: 32px; height: 2px; background: #E53935; border-radius: 2px; }

        /* Garage grid */
        .pf-garage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; padding: 2px 2px 80px; }
        .pf-bike-card { aspect-ratio: 4/3; background: #1E1E1E; position: relative; overflow: hidden; border-radius: 4px; cursor: pointer; }
        .pf-bike-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .pf-bike-overlay { position: absolute; left: 0; right: 0; bottom: 0; padding: 8px 10px; background: rgba(0,0,0,0.55); }
        .pf-bike-name { font-size: 13.5px; font-weight: 600; color: #F3F3F3; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pf-bike-spec { font-size: 11.5px; color: rgba(243,243,243,0.6); margin-top: 2px; }
        .pf-bike-star { position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: #E53935; font-size: 13px; }

        /* Garage empty + full hint */
        .pf-garage-empty { display: flex; flex-direction: column; align-items: center; padding: 60px 32px 100px; text-align: center; }
        .pf-garage-empty-title { font-weight: 600; font-size: 16px; color: #F3F3F3; margin-bottom: 4px; }
        .pf-garage-empty-sub { font-size: 13px; color: rgba(243,243,243,0.5); line-height: 1.5; margin-bottom: 14px; }
        .pf-garage-full-hint { padding: 12px 16px; font-size: 12px; color: rgba(243,243,243,0.5); text-align: center; }

        /* Floating Add bike FAB */
        .pf-fab { position: fixed; bottom: 80px; right: 16px; width: 56px; height: 56px; border-radius: 50%; background: #E53935; color: #fff; border: none; display: none; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 5; }
        .pf-fab:active { transform: scale(0.95); }
      </style>

      <div id="profile-content">
        <div class="pf-nav">
          <div class="pf-handle">Loading…</div>
          <button class="pf-nav-btn" id="profile-settings-btn" aria-label="Menu">${SETTINGS_ICON}</button>
        </div>
        <div class="pf-head">
          <div class="pf-skel" style="width:86px;height:86px;border-radius:50%"></div>
          <div class="pf-stats">
            <div class="pf-skel" style="width:30px;height:30px"></div>
            <div class="pf-skel" style="width:30px;height:30px"></div>
            <div class="pf-skel" style="width:30px;height:30px"></div>
          </div>
        </div>
      </div>

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
    } catch { /* use local */ }

    try {
      if (userData && userData._id) {
        const postsRes = await api.get(`/api/users/${userData._id}`);
        if (postsRes.success && postsRes.data) {
          userPosts = postsRes.data.posts || [];
          if (postsRes.data.followersCount != null) followersCount = postsRes.data.followersCount;
          if (postsRes.data.followingCount != null) followingCount = postsRes.data.followingCount;
        }
      }
    } catch { /* silently */ }
  }

  const username = userData ? userData.username : (currentUser ? currentUser.username : 'Guest');
  const email = userData ? (userData.email || '') : '';
  const bio = userData ? (userData.bio || '') : '';
  const rawPic = userData ? userData.profilePic : null;
  const profilePic = rawPic ? (typeof rawPic === 'string' ? rawPic : rawPic.url || '') : '';

  const avatarImg = profilePic
    ? `<div class="pf-av"><img src="${escapeAttr(profilePic)}" alt="${escapeAttr(username)}"></div>`
    : `<div class="pf-av" style="background:${colorFor(username)}">${escapeHtml(username.charAt(0).toUpperCase())}</div>`;

  const postsGridHtml = userPosts.length > 0
    ? `
      <div class="pf-grid">
        ${userPosts.map((p) => {
          const media = Array.isArray(p.media) && p.media.length > 0 ? p.media[0] : null;
          if (media && media.url) {
            return `<div class="pf-cell" data-post-id="${p._id}"><img src="${escapeAttr(media.url)}" alt="Post" loading="lazy"></div>`;
          }
          return `<div class="pf-cell empty" data-post-id="${p._id}">${POST_PLACEHOLDER_ICON}</div>`;
        }).join('')}
      </div>
    `
    : (!isGuest() ? `
      <div class="pf-empty">
        <div class="pf-empty-icon">${EMPTY_GRID_ICON}</div>
        <div class="pf-empty-title">No posts yet</div>
        <div class="pf-empty-sub">Share your first ride and start building your journey</div>
        <button class="pf-cta" id="profile-cta-create">Create a Post</button>
      </div>
    ` : '');

  content.innerHTML = `
    <div class="pf-nav">
      <div class="pf-handle">${escapeHtml(username)}</div>
      <button class="pf-nav-btn" id="profile-settings-btn" aria-label="Menu">${SETTINGS_ICON}</button>
    </div>

    <section class="pf-head">
      ${avatarImg}
      <div class="pf-stats">
        <div class="pf-stat">
          <div class="pf-stat-num">${userPosts.length}</div>
          <div class="pf-stat-lbl">Posts</div>
        </div>
        <div class="pf-stat">
          <div class="pf-stat-num">${followersCount}</div>
          <div class="pf-stat-lbl">Followers</div>
        </div>
        <div class="pf-stat">
          <div class="pf-stat-num">${followingCount}</div>
          <div class="pf-stat-lbl">Following</div>
        </div>
      </div>
    </section>

    <section class="pf-info">
      <div class="pf-name">${escapeHtml(username)}</div>
      ${email ? `<div class="pf-email">${escapeHtml(email)}</div>` : ''}
      ${bio ? `<div class="pf-bio">${escapeHtml(bio)}</div>` : ''}
    </section>

    <div class="pf-actions">
      <button class="pf-btn" id="profile-edit-btn">Edit Profile</button>
      <button class="pf-btn danger" id="profile-logout-btn">Log Out</button>
    </div>

    <section class="pf-ach-section" id="pf-ach-section" style="display:none;">
      <div class="pf-ach-title">Achievements</div>
      <div class="pf-ach-row" id="pf-ach-row"></div>
    </section>

    <div class="pf-tabs">
      <button class="pf-tab active" id="pf-tab-posts" data-tab="posts">Posts</button>
      <button class="pf-tab" id="pf-tab-garage" data-tab="garage">Garage</button>
    </div>

    <div id="pf-tab-content"></div>
    <button class="pf-fab" id="pf-fab" aria-label="Add bike">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
  `;

  document.getElementById('profile-settings-btn')?.addEventListener('click', () => navigate('/edit-profile'));
  document.getElementById('profile-edit-btn')?.addEventListener('click', () => navigate('/edit-profile'));
  document.getElementById('profile-logout-btn')?.addEventListener('click', () => logout());

  // Tab state
  let activeTab = 'posts';
  let cachedBikes = null;
  const tabPosts = document.getElementById('pf-tab-posts');
  const tabGarage = document.getElementById('pf-tab-garage');
  const tabContent = document.getElementById('pf-tab-content');
  const fab = document.getElementById('pf-fab');

  if (tabPosts) tabPosts.addEventListener('click', () => switchTab('posts'));
  if (tabGarage) tabGarage.addEventListener('click', () => switchTab('garage'));
  if (fab) fab.addEventListener('click', () => navigate('/add-bike'));

  // Load achievements (best-effort)
  loadAchievements();

  renderActiveTab();

  async function loadAchievements() {
    if (!userData?._id) return;
    try {
      const res = await api.get(`/api/users/${userData._id}/achievements`);
      const list = res?.success && Array.isArray(res.data) ? res.data : [];
      const earned = list.filter((a) => a.earned);
      if (earned.length === 0) return; // hide section when nothing earned
      const section = document.getElementById('pf-ach-section');
      const row = document.getElementById('pf-ach-row');
      if (!section || !row) return;
      // Show earned first, then a couple of locked previews
      const display = [...earned, ...list.filter((a) => !a.earned).slice(0, Math.max(0, 4 - earned.length))];
      row.innerHTML = display.map((a) => `
        <div class="pf-ach-tile ${a.earned ? 'earned' : 'locked'}" title="${escapeHtml(a.label)}">
          <div class="pf-ach-icon">${a.emoji || '🏆'}</div>
          <div class="pf-ach-name">${escapeHtml(a.label)}</div>
        </div>
      `).join('');
      section.style.display = '';
    } catch {
      // silently fail
    }
  }

  function switchTab(tab) {
    activeTab = tab;
    [tabPosts, tabGarage].forEach((b) => b?.classList.toggle('active', b?.dataset.tab === tab));
    renderActiveTab();
  }

  function renderActiveTab() {
    if (!tabContent) return;
    if (activeTab === 'posts') {
      tabContent.innerHTML = postsGridHtml;
      if (fab) fab.style.display = 'none';
      document.getElementById('profile-cta-create')?.addEventListener('click', () => navigate('/create-post'));
      tabContent.querySelectorAll('.pf-grid .pf-cell[data-post-id]').forEach((cell) => {
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
    tabContent.innerHTML = '<div class="pf-garage-empty"><div class="pf-garage-empty-sub">Loading garage…</div></div>';
    try {
      if (!cachedBikes) {
        if (!userData?._id) { cachedBikes = []; }
        else {
          const res = await bikeApi.listByUser(userData._id);
          cachedBikes = res.success ? (res.data || []) : [];
        }
      }
      if (tabGarage) tabGarage.textContent = `Garage · ${cachedBikes.length}`;

      if (fab) fab.style.display = cachedBikes.length >= 10 ? 'none' : 'flex';

      if (cachedBikes.length === 0) {
        tabContent.innerHTML = `
          <div class="pf-garage-empty">
            <div class="pf-garage-empty-title">Your garage is empty</div>
            <div class="pf-garage-empty-sub">Showcase the bikes you ride.</div>
            <button class="pf-cta" id="pf-add-first">Add your first bike</button>
          </div>`;
        document.getElementById('pf-add-first')?.addEventListener('click', () => navigate('/add-bike'));
        return;
      }

      const myId = userData?._id;
      const cardsHtml = cachedBikes.map((b) => `
        <div class="pf-bike-card" data-id="${b._id}">
          <img src="${escapeAttr(b.photo?.url || '')}" alt="${escapeAttr(b.brand + ' ' + b.model)}">
          ${b.isPrimary ? '<div class="pf-bike-star">★</div>' : ''}
          <div class="pf-bike-overlay">
            <div class="pf-bike-name">${escapeHtml(b.brand)} ${escapeHtml(b.model)}</div>
            <div class="pf-bike-spec">${b.year} · ${b.engineCC}cc</div>
          </div>
        </div>
      `).join('');

      const fullHint = cachedBikes.length >= 10
        ? '<div class="pf-garage-full-hint">Garage full (10/10) — delete a bike to add another.</div>'
        : '';

      tabContent.innerHTML = `${fullHint}<div class="pf-garage-grid">${cardsHtml}</div>`;
      tabContent.querySelectorAll('.pf-bike-card').forEach((el) => {
        el.addEventListener('click', () => navigate('/garage/' + myId + '/' + el.dataset.id));
      });
    } catch {
      tabContent.innerHTML = '<div class="pf-garage-empty"><div class="pf-garage-empty-sub">Couldn\'t load garage.</div></div>';
    }
  }
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
