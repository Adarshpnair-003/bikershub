/**
 * Search page for Bikers Hub
 * Full backend integration with debounced search and type filters
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';
import { renderTabBar } from '../components/tabbar.js';

const MAGNIFIER_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

let debounceTimer = null;
let activeFilter = 'all';

export function render() {
  return `
    <div class="page-dark">
      <div class="app-header">
        <div class="app-header-title">Search</div>
      </div>

      <div style="padding: 0 20px;">
        <div style="position: relative; margin-bottom: 12px;">
          <span style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); display: flex;">${MAGNIFIER_ICON}</span>
          <input
            class="search-input"
            id="search-input"
            type="text"
            placeholder="Search riders, clubs, rides, posts..."
            style="width: 100%; background: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 12px 16px 12px 42px; color: #f9fafb; font-family: 'Nunito', sans-serif; font-size: 14px; outline: none; box-sizing: border-box;"
          >
        </div>

        <div id="search-filter-pills" style="display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto;">
          <button class="search-pill active" data-filter="all">All</button>
          <button class="search-pill" data-filter="users">Users</button>
          <button class="search-pill" data-filter="clubs">Clubs</button>
          <button class="search-pill" data-filter="rides">Rides</button>
          <button class="search-pill" data-filter="posts">Posts</button>
        </div>
      </div>

      <div id="search-results" style="padding: 0 20px; overflow-y: auto; flex: 1;">
        <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.5" style="margin-bottom: 16px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <p style="font-size: 15px; margin: 0;">Search for riders, clubs, rides, and posts</p>
        </div>
      </div>

      <style>
        .search-pill {
          background: #1f2937; border: 1px solid #374151; border-radius: 20px;
          padding: 6px 16px; color: #9ca3af; font-size: 13px; font-family: 'Nunito', sans-serif;
          cursor: pointer; white-space: nowrap; transition: all 0.2s;
        }
        .search-pill.active {
          background: #E53935; border-color: #E53935; color: #fff; font-weight: 700;
        }
        .search-section-header {
          font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 13px;
          color: #6b7280; text-transform: uppercase; letter-spacing: 1px;
          margin: 16px 0 8px; padding-bottom: 6px; border-bottom: 1px solid #1f2937;
        }
        .search-result-item {
          display: flex; align-items: center; gap: 12px; padding: 10px 0;
          border-bottom: 1px solid rgba(31,41,55,0.5); cursor: pointer;
        }
        .search-result-avatar {
          width: 40px; height: 40px; border-radius: 50%; background: #374151;
          flex-shrink: 0; object-fit: cover;
        }
        .search-result-info { flex: 1; min-width: 0; }
        .search-result-name {
          font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 14px;
          color: #f9fafb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .search-result-sub {
          font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .search-result-action {
          background: #E53935; border: none; border-radius: 8px; padding: 6px 14px;
          color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; flex-shrink: 0;
          font-family: 'Nunito', sans-serif;
        }
        .search-result-action-outline {
          background: transparent; border: 1px solid #374151; border-radius: 8px; padding: 6px 14px;
          color: #9ca3af; font-size: 12px; font-weight: 700; cursor: pointer; flex-shrink: 0;
          font-family: 'Nunito', sans-serif;
        }
      </style>

      ${renderTabBar('search')}
    </div>
  `;
}

export function mount() {
  activeFilter = 'all';

  const input = document.getElementById('search-input');
  if (input) {
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        performSearch(input.value.trim());
      }, 300);
    });
  }

  // Filter pills
  document.querySelectorAll('.search-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.search-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter;
      const q = document.getElementById('search-input')?.value.trim();
      if (q) {
        performSearch(q);
      }
    });
  });
}

async function performSearch(query) {
  const container = document.getElementById('search-results');
  if (!container) return;

  if (!query) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.5" style="margin-bottom: 16px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p style="font-size: 15px; margin: 0;">Search for riders, clubs, rides, and posts</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;">Searching...</div>';

  try {
    const res = await api.get(`/api/search?q=${encodeURIComponent(query)}`);

    if (!res.success) {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;">No results found</div>';
      return;
    }

    const data = res.data || {};
    const users = data.users || [];
    const clubs = data.clubs || [];
    const rides = data.rides || [];
    const posts = data.posts || [];

    let html = '';

    // Users section
    if ((activeFilter === 'all' || activeFilter === 'users') && users.length > 0) {
      html += '<div class="search-section-header">Users</div>';
      html += users.map((u) => {
        const rawPic = u.profilePic;
        const picUrl = rawPic ? (typeof rawPic === 'string' ? rawPic : rawPic.url || '') : '';
        const avatarHtml = picUrl
          ? `<img class="search-result-avatar" src="${picUrl}" alt="${u.username}">`
          : `<div class="search-result-avatar"></div>`;
        return `
          <div class="search-result-item" data-type="user" data-id="${u._id}">
            ${avatarHtml}
            <div class="search-result-info">
              <div class="search-result-name">${u.username || 'Unknown'}</div>
              <div class="search-result-sub">${u.bio || 'Biker'}</div>
            </div>
            <button class="search-result-action search-follow-btn" data-user-id="${u._id}">Follow</button>
          </div>
        `;
      }).join('');
    }

    // Clubs section
    if ((activeFilter === 'all' || activeFilter === 'clubs') && clubs.length > 0) {
      html += '<div class="search-section-header">Clubs</div>';
      html += clubs.map((c) => {
        const memberCount = c.membersCount || (Array.isArray(c.members) ? c.members.length : 0);
        return `
          <div class="search-result-item" data-type="club" data-id="${c._id}">
            <div class="search-result-avatar" style="border-radius: 12px; background: #374151;"></div>
            <div class="search-result-info">
              <div class="search-result-name">${c.name || 'Unknown Club'}</div>
              <div class="search-result-sub">${memberCount} members</div>
            </div>
            <button class="search-result-action-outline search-view-club" data-club-id="${c._id}">View</button>
          </div>
        `;
      }).join('');
    }

    // Rides section
    if ((activeFilter === 'all' || activeFilter === 'rides') && rides.length > 0) {
      html += '<div class="search-section-header">Rides</div>';
      html += rides.map((r) => {
        const pCount = r.participantsCount || (Array.isArray(r.participants) ? r.participants.length : 0);
        const rideDate = r.rideDate ? new Date(r.rideDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        return `
          <div class="search-result-item" data-type="ride" data-id="${r._id}">
            <div class="search-result-avatar" style="border-radius: 12px; background: #064e3b; display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6fcf97" stroke-width="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div class="search-result-info">
              <div class="search-result-name">${r.title || 'Untitled Ride'}</div>
              <div class="search-result-sub">${rideDate} &middot; ${pCount} riders</div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Posts section
    if ((activeFilter === 'all' || activeFilter === 'posts') && posts.length > 0) {
      html += '<div class="search-section-header">Posts</div>';
      html += posts.map((p) => {
        const author = p.author || {};
        const snippet = (p.content || '').length > 60 ? (p.content || '').slice(0, 60) + '...' : (p.content || '');
        return `
          <div class="search-result-item" data-type="post" data-id="${p._id}">
            <div class="search-result-avatar" style="border-radius: 12px; background: #1e3a5f; display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            </div>
            <div class="search-result-info">
              <div class="search-result-name">${author.username || 'Unknown'}</div>
              <div class="search-result-sub">${snippet}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    if (!html) {
      html = '<div style="text-align: center; padding: 40px; color: #6b7280;">No results found</div>';
    }

    container.innerHTML = html;
    attachSearchHandlers();
  } catch (err) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Failed to search. Please try again.</div>';
  }
}

function attachSearchHandlers() {
  // Follow buttons
  document.querySelectorAll('.search-follow-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const userId = btn.dataset.userId;
      if (!userId) return;
      try {
        const res = await api.put(`/api/users/follow/${userId}`);
        if (res.success) {
          btn.textContent = 'Following';
          btn.disabled = true;
          btn.style.opacity = '0.7';
        }
      } catch {
        // silently fail
      }
    });
  });

  // View club buttons
  document.querySelectorAll('.search-view-club').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigate('/clubs');
    });
  });
}
