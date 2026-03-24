/**
 * Notifications page for Bikers Hub
 * Full-screen notifications list with mark-as-read and pagination
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser } from '../utils/auth.js';

const BACK_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;
const CHECK_ALL_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
const BELL_ICON = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;

let currentPage = 1;
let hasMore = true;
let isLoading = false;
let notifications = [];

export function render() {
  // Reset state on render
  currentPage = 1;
  hasMore = true;
  isLoading = false;
  notifications = [];

  return `
    <div class="page-dark" style="display: flex; flex-direction: column; height: 100vh;">
      <style>
        .notif-header {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; background: #0d1117;
          border-bottom: 1px solid #1f2937;
        }
        .notif-header-title {
          flex: 1; text-align: center;
          font-family: 'Exo 2', sans-serif; font-weight: 700;
          font-size: 18px; color: #f9fafb;
        }
        .notif-header-btn {
          background: none; border: none; cursor: pointer; padding: 4px;
          display: flex; align-items: center; justify-content: center;
        }
        .notif-list {
          flex: 1; overflow-y: auto; padding: 0;
        }
        .notif-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 20px; border-bottom: 1px solid rgba(31,41,55,0.5);
          cursor: pointer; transition: background 0.15s;
          position: relative;
        }
        .notif-item:active { background: rgba(31,41,55,0.5); }
        .notif-item-unread { background: rgba(229,57,53,0.06); }
        .notif-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: #374151; flex-shrink: 0; object-fit: cover;
        }
        .notif-body { flex: 1; min-width: 0; }
        .notif-text {
          font-family: 'Nunito', sans-serif; font-size: 14px;
          color: #f9fafb; line-height: 1.4;
        }
        .notif-text strong {
          font-weight: 700; color: #f9fafb;
        }
        .notif-time {
          font-size: 12px; color: #6b7280; margin-top: 4px;
        }
        .notif-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #E53935; flex-shrink: 0; margin-top: 6px;
        }
        .notif-empty {
          text-align: center; padding: 80px 20px; color: #6b7280;
        }
        .notif-empty p { margin: 0; }
        .notif-empty .notif-empty-title {
          font-size: 15px; margin-top: 16px;
        }
        .notif-empty .notif-empty-sub {
          font-size: 13px; color: #4b5563; margin-top: 8px;
        }
        .notif-loader {
          text-align: center; padding: 20px; color: #6b7280; font-size: 13px;
        }
        .notif-load-more {
          text-align: center; padding: 16px;
        }
        .notif-load-more-btn {
          background: #1f2937; color: #9ca3af; border: 1px solid #374151;
          border-radius: 8px; padding: 10px 24px; font-family: 'Nunito', sans-serif;
          font-size: 13px; cursor: pointer; transition: background 0.15s;
        }
        .notif-load-more-btn:active { background: #374151; }
        .notif-load-more-btn:disabled { opacity: 0.5; cursor: default; }
      </style>

      <div class="notif-header">
        <button class="notif-header-btn" id="notif-back-btn">${BACK_ICON}</button>
        <div class="notif-header-title">Notifications</div>
        <button class="notif-header-btn" id="notif-read-all-btn" title="Mark all as read">${CHECK_ALL_ICON}</button>
      </div>

      <div class="notif-list" id="notif-list">
        <div class="notif-loader">Loading notifications...</div>
      </div>
    </div>
  `;
}

export function mount() {
  const backBtn = document.getElementById('notif-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => navigate('/home'));
  }

  const readAllBtn = document.getElementById('notif-read-all-btn');
  if (readAllBtn) {
    readAllBtn.addEventListener('click', handleMarkAllRead);
  }

  // Scroll-based load more
  const listEl = document.getElementById('notif-list');
  if (listEl) {
    listEl.addEventListener('scroll', () => {
      if (isLoading || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = listEl;
      if (scrollHeight - scrollTop - clientHeight < 100) {
        loadMore();
      }
    });
  }

  loadNotifications();
}

async function loadNotifications() {
  const container = document.getElementById('notif-list');
  if (!container) return;

  isLoading = true;

  try {
    const res = await api.get(`/api/notifications?page=1&limit=20`);

    if (res.success && Array.isArray(res.data)) {
      notifications = res.data;
    } else if (res.success && res.data && Array.isArray(res.data.notifications)) {
      notifications = res.data.notifications;
    } else {
      notifications = [];
    }

    // Determine if there are more pages
    if (res.pagination) {
      hasMore = currentPage < res.pagination.totalPages;
    } else if (notifications.length < 20) {
      hasMore = false;
    }

    currentPage = 1;
    renderNotifications(container);
  } catch (err) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Failed to load notifications</div>';
  } finally {
    isLoading = false;
  }
}

async function loadMore() {
  if (isLoading || !hasMore) return;

  isLoading = true;
  const nextPage = currentPage + 1;

  // Show loading indicator at bottom
  const container = document.getElementById('notif-list');
  const loadMoreEl = document.getElementById('notif-load-more');
  if (loadMoreEl) {
    loadMoreEl.innerHTML = '<div class="notif-loader">Loading more...</div>';
  }

  try {
    const res = await api.get(`/api/notifications?page=${nextPage}&limit=20`);

    let newItems = [];
    if (res.success && Array.isArray(res.data)) {
      newItems = res.data;
    } else if (res.success && res.data && Array.isArray(res.data.notifications)) {
      newItems = res.data.notifications;
    }

    if (newItems.length === 0) {
      hasMore = false;
    } else {
      notifications = notifications.concat(newItems);
      currentPage = nextPage;

      if (res.pagination) {
        hasMore = currentPage < res.pagination.totalPages;
      } else if (newItems.length < 20) {
        hasMore = false;
      }
    }

    if (container) {
      renderNotifications(container);
    }
  } catch {
    // Silently fail on load-more
    if (loadMoreEl) {
      loadMoreEl.innerHTML = '<div class="notif-loader" style="color: #ef4444;">Failed to load more</div>';
    }
  } finally {
    isLoading = false;
  }
}

function renderNotifications(container) {
  if (notifications.length === 0) {
    container.innerHTML = `
      <div class="notif-empty">
        ${BELL_ICON}
        <p class="notif-empty-title">No notifications yet</p>
        <p class="notif-empty-sub">When someone interacts with you, it will show up here</p>
      </div>
    `;
    return;
  }

  const itemsHtml = notifications.map((notif) => {
    const sender = notif.sender || {};
    const senderName = sender.username || 'Someone';
    const senderPic = sender.profilePic?.url || sender.profilePic || '';
    const description = getNotifDescription(notif.type, senderName);
    const timeAgo = formatTimeAgo(notif.createdAt);
    const unreadClass = notif.isRead ? '' : ' notif-item-unread';

    const avatarHtml = senderPic
      ? `<img class="notif-avatar" src="${escapeAttr(senderPic)}" alt="${escapeAttr(senderName)}">`
      : `<div class="notif-avatar"></div>`;

    const dotHtml = notif.isRead ? '<div style="width: 8px; flex-shrink: 0;"></div>' : '<div class="notif-dot"></div>';

    return `
      <div class="notif-item${unreadClass}" data-notif-id="${notif._id}" data-notif-type="${notif.type}" data-post-id="${notif.post || ''}" data-club-id="${notif.club || ''}" data-ride-id="${notif.ride || ''}" data-sender-id="${sender._id || ''}">
        ${avatarHtml}
        <div class="notif-body">
          <div class="notif-text">${description}</div>
          <div class="notif-time">${timeAgo}</div>
        </div>
        ${dotHtml}
      </div>
    `;
  }).join('');

  const loadMoreHtml = hasMore
    ? `<div id="notif-load-more" class="notif-load-more">
        <button class="notif-load-more-btn" id="notif-load-more-btn">Load more</button>
      </div>`
    : '';

  container.innerHTML = itemsHtml + loadMoreHtml;

  // Attach click handlers to notification items
  container.querySelectorAll('.notif-item').forEach((item) => {
    item.addEventListener('click', () => handleNotifClick(item));
  });

  // Attach load more button handler
  const loadMoreBtn = document.getElementById('notif-load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMore);
  }
}

function getNotifDescription(type, senderName) {
  const name = `<strong>${escapeHtml(senderName)}</strong>`;
  switch (type) {
    case 'like':
      return `${name} liked your post`;
    case 'comment':
      return `${name} commented on your post`;
    case 'reply':
      return `${name} replied to your comment`;
    case 'follow':
      return `${name} started following you`;
    case 'club_request':
      return `${name} requested to join your club`;
    case 'club_approved':
      return `${name} approved your club request`;
    case 'club_rejected':
      return `${name} rejected your club request`;
    case 'ride_invite':
      return `${name} invited you to a ride`;
    case 'ride_join':
      return `${name} joined your ride`;
    default:
      return `${name} sent you a notification`;
  }
}

async function handleNotifClick(item) {
  const notifId = item.dataset.notifId;
  const type = item.dataset.notifType;
  const postId = item.dataset.postId;
  const clubId = item.dataset.clubId;
  const rideId = item.dataset.rideId;
  const senderId = item.dataset.senderId;

  // Mark as read optimistically
  const notif = notifications.find((n) => n._id === notifId);
  if (notif && !notif.isRead) {
    notif.isRead = true;
    item.classList.remove('notif-item-unread');
    const dot = item.querySelector('.notif-dot');
    if (dot) {
      dot.style.background = 'transparent';
    }

    // Fire API call (don't await)
    api.put(`/api/notifications/${notifId}/read`).catch(() => {});
  }

  // Navigate based on type
  switch (type) {
    case 'like':
    case 'comment':
    case 'reply':
      navigate('/home');
      break;
    case 'follow':
      if (senderId) {
        navigate(`/profile/${senderId}`);
      } else {
        navigate('/profile');
      }
      break;
    case 'club_request':
    case 'club_approved':
    case 'club_rejected':
      navigate('/clubs');
      break;
    case 'ride_invite':
    case 'ride_join':
      navigate('/clubs');
      break;
    default:
      navigate('/home');
  }
}

async function handleMarkAllRead() {
  const btn = document.getElementById('notif-read-all-btn');
  if (btn) btn.disabled = true;

  try {
    await api.put('/api/notifications/read-all');

    // Update local state
    notifications.forEach((n) => { n.isRead = true; });

    // Re-render
    const container = document.getElementById('notif-list');
    if (container) {
      renderNotifications(container);
    }
  } catch {
    // Silently fail
  } finally {
    if (btn) btn.disabled = false;
  }
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
