/**
 * Home feed page for Bikers Hub
 * Shows scrollable post feed with header and tab bar
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser } from '../utils/auth.js';
import { renderTabBar } from '../components/tabbar.js';
import { renderPostCard, formatCount } from '../components/post-card.js';
import { openComments } from '../components/comments.js';

const BELL_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
const MESSAGE_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

async function loadBadges() {
  try {
    const [notifRes, chatRes] = await Promise.all([
      api.get('/api/notifications/unread-count').catch(() => null),
      api.get('/api/chat/unread').catch(() => null),
    ]);

    const notifCount = notifRes?.success ? (notifRes.data?.count || 0) : 0;
    const chatCount = chatRes?.success ? (chatRes.data?.count || 0) : 0;

    const notifBadge = document.getElementById('home-notif-badge');
    const msgBadge = document.getElementById('home-msg-badge');

    if (notifBadge) {
      notifBadge.textContent = notifCount > 99 ? '99+' : notifCount;
      notifBadge.style.display = notifCount > 0 ? 'flex' : 'none';
    }
    if (msgBadge) {
      msgBadge.textContent = chatCount > 99 ? '99+' : chatCount;
      msgBadge.style.display = chatCount > 0 ? 'flex' : 'none';
    }
  } catch {
    // silently fail
  }
}

const PLACEHOLDER_POSTS = [
  {
    _id: 'placeholder1',
    author: { _id: 'u1', username: 'kashmir_riders', profilePic: '' },
    content: 'A forgotten logging route reclaimed by nature. The best rides are the ones where you lose signal and find peace.',
    media: [{ url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400', type: 'image' }],
    likes: [],
    likesCount: 10100,
    commentsCount: 42,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'placeholder2',
    author: { _id: 'u2', username: 'highway_hawk', profilePic: '' },
    content: 'Dawn patrol on the coastal highway. Nothing beats the smell of salt air and the hum of the engine at sunrise.',
    media: [{ url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400', type: 'image' }],
    likes: [],
    likesCount: 5300,
    commentsCount: 18,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'placeholder3',
    author: { _id: 'u3', username: 'speed_queen', profilePic: '' },
    content: 'Weekend group ride through the Western Ghats. 12 riders, 400 km, and memories that will last forever.',
    media: [{ url: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=400', type: 'image' }],
    likes: [],
    likesCount: 8700,
    commentsCount: 31,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'placeholder4',
    author: { _id: 'u4', username: 'ride_captain', profilePic: '' },
    content: 'Monsoon rides hit different. Wet roads, misty mountains, and the thrill of every curve. Ride safe out there!',
    media: [{ url: 'https://images.unsplash.com/photo-1558980664-769d59546b3d?w=400', type: 'image' }],
    likes: [],
    likesCount: 3200,
    commentsCount: 15,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function render() {
  return `
    <div class="page-dark">
      <div class="app-header">
        <div class="app-header-title">BIKERS HUB</div>
        <div class="app-header-actions">
          <button class="app-header-btn" id="home-notif-btn" style="position:relative;">
            ${BELL_ICON}
            <span id="home-notif-badge" style="display:none;position:absolute;top:-2px;right:-4px;background:#E53935;color:#fff;font-size:10px;font-weight:700;min-width:16px;height:16px;border-radius:8px;align-items:center;justify-content:center;padding:0 4px;"></span>
          </button>
          <button class="app-header-btn" id="home-msg-btn" style="position:relative;">
            ${MESSAGE_ICON}
            <span id="home-msg-badge" style="display:none;position:absolute;top:-2px;right:-4px;background:#E53935;color:#fff;font-size:10px;font-weight:700;min-width:16px;height:16px;border-radius:8px;align-items:center;justify-content:center;padding:0 4px;"></span>
          </button>
        </div>
      </div>

      <div id="post-feed">
        <div class="post-card-dark">Loading posts...</div>
      </div>

      ${renderTabBar('home')}
    </div>
  `;
}

export function mount() {
  loadPosts();
  loadBadges();

  const notifBtn = document.getElementById('home-notif-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => navigate('/notifications'));
  }

  const msgBtn = document.getElementById('home-msg-btn');
  if (msgBtn) {
    msgBtn.addEventListener('click', () => navigate('/conversations'));
  }
}

async function loadPosts() {
  const feed = document.getElementById('post-feed');
  if (!feed) return;

  let posts = [];

  try {
    const res = await api.get('/api/posts?page=1&limit=10');
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      posts = res.data;
    } else if (res.success && res.data && Array.isArray(res.data.posts) && res.data.posts.length > 0) {
      posts = res.data.posts;
    } else {
      posts = PLACEHOLDER_POSTS;
    }
  } catch {
    posts = PLACEHOLDER_POSTS;
  }

  if (posts.length === 0) {
    feed.innerHTML = '<div class="post-card-dark">No posts yet. Be the first to share a ride!</div>';
    return;
  }

  feed.innerHTML = posts.map(renderPostCard).join('');
  attachPostHandlers();
}

function attachPostHandlers() {
  // Like buttons
  document.querySelectorAll('.like-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const postId = btn.dataset.postId;
      if (!postId || postId.startsWith('placeholder')) return;

      try {
        const res = await api.put(`/api/posts/like/${postId}`);
        if (res.success && res.data) {
          // Update UI inline instead of reloading
          const card = btn.closest('.post-card-dark');
          if (card) {
            const likesEl = card.querySelector('.post-card-likes');
            if (likesEl && res.data.likesCount != null) {
              likesEl.textContent = `${formatCount(res.data.likesCount)} likes`;
            }
            if (res.data.liked) {
              btn.classList.add('liked');
            } else {
              btn.classList.remove('liked');
            }
          }
        }
      } catch {
        // silently fail
      }
    });
  });

  // Comment buttons
  document.querySelectorAll('.comment-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const postId = btn.dataset.postId;
      if (postId && !postId.startsWith('placeholder')) {
        openComments(postId);
      }
    });
  });

  // "View all X comments" links
  document.querySelectorAll('.post-card-comments-link').forEach((link) => {
    link.addEventListener('click', () => {
      const card = link.closest('.post-card-dark');
      const postId = card ? card.dataset.postId : null;
      if (postId && !postId.startsWith('placeholder')) {
        openComments(postId);
      }
    });
  });
}
