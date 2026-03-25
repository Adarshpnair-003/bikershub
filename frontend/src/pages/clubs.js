/**
 * Clubs page for Bikers Hub
 * Three sub-tabs: Discover, Your clubs, Rides
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser } from '../utils/auth.js';
import { renderTabBar } from '../components/tabbar.js';
import { renderPostCard } from '../components/post-card.js';
import { renderClubCard } from '../components/club-card.js';

const PLUS_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

const PLACEHOLDER_CLUBS = [
  {
    _id: 'pc1',
    name: 'Mountaineers',
    coverImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300',
    membersCount: 15000,
    privacy: 'public',
  },
  {
    _id: 'pc2',
    name: 'Kerala Riders',
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300',
    membersCount: 8200,
    privacy: 'public',
  },
  {
    _id: 'pc3',
    name: 'Highway Hawks',
    coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300',
    membersCount: 12400,
    privacy: 'public',
  },
  {
    _id: 'pc4',
    name: 'Night Riders',
    coverImage: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=300',
    membersCount: 6700,
    privacy: 'private',
  },
];

const PLACEHOLDER_USER_CLUBS = [
  {
    _id: 'uc1',
    name: 'Mountaineers',
    coverImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300',
    membersCount: 15000,
    privacy: 'public',
  },
  {
    _id: 'uc2',
    name: 'Kerala Riders',
    coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300',
    membersCount: 8200,
    privacy: 'public',
  },
];

const PLACEHOLDER_POSTS = [
  {
    _id: 'cp1',
    author: { _id: 'u1', username: 'kashmir_riders', profilePic: '' },
    content: 'Epic weekend ride through the mountain passes. The views were absolutely breathtaking!',
    media: [{ url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400', type: 'image' }],
    likes: [],
    likesCount: 10100,
    commentsCount: 42,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'cp2',
    author: { _id: 'u2', username: 'highway_hawk', profilePic: '' },
    content: 'New trail discovered near Munnar. Perfect mix of twisties and straights. Who is joining next weekend?',
    media: [{ url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400', type: 'image' }],
    likes: [],
    likesCount: 5300,
    commentsCount: 18,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
];

let activeTab = 'discover';

export function render() {
  return `
    <div class="page-dark">
      <div class="app-header">
        <div class="app-header-title">CLUBS</div>
        <div class="app-header-actions">
          <button class="app-header-btn" id="clubs-create-btn">${PLUS_ICON}</button>
        </div>
      </div>

      <div class="tab-pills">
        <button class="tab-pill active" data-tab="discover">Discover</button>
        <button class="tab-pill" data-tab="yourclubs">Your clubs</button>
        <button class="tab-pill" data-tab="rides">Rides</button>
      </div>

      <div id="clubs-content">
        <div class="post-card-dark">Loading...</div>
      </div>

      ${renderTabBar('clubs')}
    </div>
  `;
}

export function mount() {
  activeTab = 'discover';

  // Tab pill handlers
  document.querySelectorAll('.tab-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.tab-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      activeTab = pill.dataset.tab;
      renderTabContent();
    });
  });

  // Create club button
  const createBtn = document.getElementById('clubs-create-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      navigate('/create-club');
    });
  }

  renderTabContent();
}

async function renderTabContent() {
  const container = document.getElementById('clubs-content');
  if (!container) return;

  if (activeTab === 'discover') {
    await renderDiscoverTab(container);
  } else if (activeTab === 'yourclubs') {
    await renderYourClubsTab(container);
  } else if (activeTab === 'rides') {
    await renderRidesTab(container);
  }
}

async function renderDiscoverTab(container) {
  container.innerHTML = '<div class="post-card-dark">Loading clubs...</div>';

  let clubs = [];
  let posts = [];

  try {
    const clubsRes = await api.get('/api/clubs');
    if (clubsRes.success && Array.isArray(clubsRes.data) && clubsRes.data.length > 0) {
      clubs = clubsRes.data;
    } else if (clubsRes.success && clubsRes.data && Array.isArray(clubsRes.data.clubs) && clubsRes.data.clubs.length > 0) {
      clubs = clubsRes.data.clubs;
    } else {
      clubs = PLACEHOLDER_CLUBS;
    }
  } catch {
    clubs = PLACEHOLDER_CLUBS;
  }

  try {
    const postsRes = await api.get('/api/posts?page=1&limit=5');
    if (postsRes.success && Array.isArray(postsRes.data) && postsRes.data.length > 0) {
      posts = postsRes.data;
    } else if (postsRes.success && postsRes.data && Array.isArray(postsRes.data.posts) && postsRes.data.posts.length > 0) {
      posts = postsRes.data.posts;
    } else {
      posts = PLACEHOLDER_POSTS;
    }
  } catch {
    posts = PLACEHOLDER_POSTS;
  }

  const clubCardsHtml = clubs.map((c) => renderClubCard(c, 'discover')).join('');
  const postsHtml = posts.map(renderPostCard).join('');

  container.innerHTML = `
    <div class="section-label">Join new clubs</div>
    <div class="hscroll">${clubCardsHtml}</div>
    <div class="section-label">Trending</div>
    ${postsHtml}
  `;

  attachClubJoinHandlers();
  attachLikeHandlers();
  attachNavigationHandlers();
}

async function renderYourClubsTab(container) {
  container.innerHTML = '<div class="post-card-dark">Loading your clubs...</div>';

  let userClubs = [];
  let posts = [];

  try {
    const res = await api.get('/api/clubs');
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      const currentUser = getCurrentUser();
      if (currentUser) {
        userClubs = res.data.filter((c) => {
          if (Array.isArray(c.members)) {
            return c.members.some((m) => {
              const memberId = typeof m === 'string' ? m : (m._id || m.user);
              return memberId === currentUser.id;
            });
          }
          return false;
        });
      }
      if (userClubs.length === 0) {
        userClubs = PLACEHOLDER_USER_CLUBS;
      }
    } else {
      userClubs = PLACEHOLDER_USER_CLUBS;
    }
  } catch {
    userClubs = PLACEHOLDER_USER_CLUBS;
  }

  try {
    const postsRes = await api.get('/api/posts?page=1&limit=5');
    if (postsRes.success && Array.isArray(postsRes.data) && postsRes.data.length > 0) {
      posts = postsRes.data;
    } else if (postsRes.success && postsRes.data && Array.isArray(postsRes.data.posts) && postsRes.data.posts.length > 0) {
      posts = postsRes.data.posts;
    } else {
      posts = PLACEHOLDER_POSTS;
    }
  } catch {
    posts = PLACEHOLDER_POSTS;
  }

  const clubCardsHtml = userClubs.map((c) => renderClubCard(c, 'manage')).join('');
  const postsHtml = posts.map(renderPostCard).join('');

  container.innerHTML = `
    <div class="section-label">Manage your clubs</div>
    <div class="hscroll">${clubCardsHtml}</div>
    <div class="section-label">Club Posts</div>
    ${postsHtml}
  `;

  attachLikeHandlers();
  attachNavigationHandlers();
}

async function renderRidesTab(container) {
  container.innerHTML = '<div class="post-card-dark" style="padding: 20px; text-align: center; color: #6b7280;">Loading rides...</div>';

  let rides = [];

  try {
    const res = await api.get('/api/rides?page=1&limit=20');
    if (res.success && Array.isArray(res.data)) {
      rides = res.data;
    } else if (res.success && res.data && Array.isArray(res.data.rides)) {
      rides = res.data.rides;
    }
  } catch {
    // silently fail
  }

  if (rides.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.5" style="margin-bottom: 16px;">
          <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <p style="font-size: 15px; margin: 0 0 8px;">No rides yet</p>
        <button style="background: #E53935; border: none; border-radius: 20px; padding: 10px 24px; color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; font-family: 'Nunito', sans-serif;"
          onclick="navigate('/create-ride')">Create a Ride</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="padding: 8px 0;">
      <div style="display: flex; justify-content: flex-end; padding: 0 20px 12px;">
        <button style="background: #E53935; border: none; border-radius: 20px; padding: 8px 20px; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; font-family: 'Nunito', sans-serif;"
          onclick="navigate('/create-ride')">+ New Ride</button>
      </div>
      ${rides.map((r) => {
        const pCount = r.participantsCount || (Array.isArray(r.participants) ? r.participants.length : 0);
        const maxP = r.maxParticipants || '∞';
        const rideDate = r.rideDate ? new Date(r.rideDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
        const status = r.status || 'pending';
        const statusColors = { pending: '#9ca3af', live: '#22c55e', completed: '#6b7280' };
        const statusColor = statusColors[status] || '#9ca3af';
        const creator = r.createdBy || {};
        const creatorName = creator.username || 'Unknown';

        return `
          <div class="ride-card" data-ride-id="${r._id}" style="cursor: pointer;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div class="ride-card-title">${r.title || 'Untitled Ride'}</div>
              <span style="font-size: 11px; color: ${statusColor}; font-weight: 700; text-transform: uppercase;">${status}</span>
            </div>
            <div class="ride-card-meta">
              <span>📍 ${r.startLocation || 'TBD'} → ${r.destination || 'TBD'}</span>
            </div>
            <div class="ride-card-meta">
              <span>🗓 ${rideDate}</span>
              <span>🏍 ${pCount}/${maxP} riders</span>
              <span>by ${creatorName}</span>
            </div>
            <button class="ride-card-btn ride-join-btn" data-ride-id="${r._id}">Join Ride</button>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Navigate to ride detail on card click
  document.querySelectorAll('.ride-card[data-ride-id]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.ride-join-btn')) return; // don't navigate on join btn click
      navigate(`/rides/${card.dataset.rideId}`);
    });
  });

  // Attach join handlers
  document.querySelectorAll('.ride-join-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const rideId = btn.dataset.rideId;
      if (!rideId) return;
      btn.disabled = true;
      btn.textContent = 'Joining...';
      try {
        const res = await api.post(`/api/rides/${rideId}/join`);
        if (res.success) {
          btn.textContent = 'Joined ✓';
          btn.style.background = '#374151';
        } else {
          btn.textContent = res.error?.message || 'Failed';
          setTimeout(() => { btn.textContent = 'Join Ride'; btn.disabled = false; }, 2000);
        }
      } catch {
        btn.textContent = 'Join Ride';
        btn.disabled = false;
      }
    });
  });
}

function attachNavigationHandlers() {
  // Club card click → club detail
  document.querySelectorAll('.club-card[data-club-id]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.club-card-join')) return; // don't navigate on join btn
      const clubId = card.dataset.clubId;
      if (clubId && !clubId.startsWith('pc') && !clubId.startsWith('uc')) {
        navigate(`/clubs/${clubId}`);
      }
    });
  });

  // Post card click → post detail
  document.querySelectorAll('.post-card-dark[data-post-id]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.like-btn, .comment-btn, .share-btn, .post-card-author')) return;
      const postId = card.dataset.postId;
      if (postId && !postId.startsWith('cp') && !postId.startsWith('placeholder')) {
        navigate(`/posts/${postId}`);
      }
    });
  });
}

function attachClubJoinHandlers() {
  document.querySelectorAll('.club-card-join').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const clubId = btn.dataset.clubId;
      if (!clubId || clubId.startsWith('pc')) {
        alert('Sign in to join clubs');
        return;
      }

      try {
        const res = await api.post(`/api/clubs/${clubId}/join`);
        if (res.success) {
          btn.textContent = 'Joined';
          btn.disabled = true;
        }
      } catch {
        alert('Could not join club. Please try again.');
      }
    });
  });
}

function attachLikeHandlers() {
  document.querySelectorAll('.like-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const postId = btn.dataset.postId;
      if (!postId || postId.startsWith('placeholder') || postId.startsWith('cp')) return;

      try {
        const res = await api.put(`/api/posts/like/${postId}`);
        if (res.success) {
          renderTabContent();
        }
      } catch {
        // silently fail
      }
    });
  });
}
