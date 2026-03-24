/**
 * Conversations list page for Bikers Hub
 * Shows all user conversations with last message preview
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser } from '../utils/auth.js';
import { renderTabBar } from '../components/tabbar.js';

const BACK_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;
const PLUS_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

export function render() {
  return `
    <div class="page-dark" style="display: flex; flex-direction: column; height: 100vh;">
      <div class="app-header">
        <button class="app-header-btn" id="conv-back-btn">${BACK_ICON}</button>
        <div class="app-header-title" style="flex: 1; text-align: center;">Messages</div>
        <button class="app-header-btn" id="conv-new-btn">${PLUS_ICON}</button>
      </div>

      <div id="conversations-list" style="flex: 1; overflow-y: auto; padding: 0;">
        <div style="text-align: center; padding: 40px; color: #6b7280;">Loading conversations...</div>
      </div>

      <style>
        .conv-item {
          display: flex; align-items: center; gap: 12px; padding: 14px 20px;
          border-bottom: 1px solid rgba(31,41,55,0.5); cursor: pointer;
          transition: background 0.15s;
        }
        .conv-item:active { background: rgba(31,41,55,0.5); }
        .conv-avatar {
          width: 48px; height: 48px; border-radius: 50%; background: #374151;
          flex-shrink: 0; object-fit: cover;
        }
        .conv-info { flex: 1; min-width: 0; }
        .conv-name {
          font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 15px;
          color: #f9fafb; margin-bottom: 2px;
        }
        .conv-preview {
          font-size: 13px; color: #6b7280; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis;
        }
        .conv-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .conv-time { font-size: 11px; color: #6b7280; }
        .conv-badge {
          background: #E53935; color: #fff; font-size: 11px; font-weight: 700;
          min-width: 20px; height: 20px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; padding: 0 6px;
        }
      </style>
    </div>
  `;
}

export function mount() {
  const backBtn = document.getElementById('conv-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => navigate('/home'));
  }

  const newBtn = document.getElementById('conv-new-btn');
  if (newBtn) {
    newBtn.addEventListener('click', () => alert('Coming soon'));
  }

  loadConversations();
}

async function loadConversations() {
  const container = document.getElementById('conversations-list');
  if (!container) return;

  const currentUser = getCurrentUser();

  try {
    const res = await api.get('/api/conversations');

    let conversations = [];
    if (res.success && Array.isArray(res.data)) {
      conversations = res.data;
    } else if (res.success && res.data && Array.isArray(res.data.conversations)) {
      conversations = res.data.conversations;
    }

    if (conversations.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.5" style="margin-bottom: 16px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <p style="font-size: 15px; margin: 0;">No conversations yet</p>
          <p style="font-size: 13px; margin: 8px 0 0; color: #4b5563;">Start a conversation with another rider</p>
        </div>
      `;
      return;
    }

    container.innerHTML = conversations.map((conv) => {
      // Find other participant
      const participants = conv.participants || [];
      const other = participants.find((p) => {
        const pid = typeof p === 'string' ? p : (p._id || p.id);
        return currentUser && pid !== currentUser.id;
      }) || participants[0] || {};

      const otherName = other.username || 'Unknown';
      const rawPic = other.profilePic;
      const otherPic = rawPic ? (typeof rawPic === 'string' ? rawPic : rawPic.url || '') : '';

      // Last message — backend stores as string, not object
      const lastMsg = conv.lastMessage;
      let preview = 'No messages yet';
      let timeStr = '';
      if (lastMsg && typeof lastMsg === 'object') {
        const msgText = lastMsg.text || lastMsg.content || '';
        preview = msgText.length > 40 ? msgText.slice(0, 40) + '...' : msgText;
        timeStr = formatConvTime(lastMsg.createdAt);
      } else if (typeof lastMsg === 'string' && lastMsg) {
        preview = lastMsg.length > 40 ? lastMsg.slice(0, 40) + '...' : lastMsg;
        timeStr = formatConvTime(conv.lastMessageAt || conv.updatedAt);
      }

      // Unread badge
      const unread = conv.unreadCount || 0;
      const badgeHtml = unread > 0
        ? `<div class="conv-badge">${unread > 99 ? '99+' : unread}</div>`
        : '';

      const avatarHtml = otherPic
        ? `<img class="conv-avatar" src="${otherPic}" alt="${otherName}">`
        : `<div class="conv-avatar"></div>`;

      return `
        <div class="conv-item" data-conv-id="${conv._id}">
          ${avatarHtml}
          <div class="conv-info">
            <div class="conv-name">${otherName}</div>
            <div class="conv-preview">${preview}</div>
          </div>
          <div class="conv-meta">
            <div class="conv-time">${timeStr}</div>
            ${badgeHtml}
          </div>
        </div>
      `;
    }).join('');

    // Attach click handlers
    document.querySelectorAll('.conv-item').forEach((item) => {
      item.addEventListener('click', () => {
        const convId = item.dataset.convId;
        if (convId) {
          navigate(`/chat/${convId}`);
        }
      });
    });
  } catch (err) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Failed to load conversations</div>';
  }
}

function formatConvTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
