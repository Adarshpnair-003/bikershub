/**
 * Chat page for Bikers Hub
 * Full-screen chat with message bubbles, polling, and send functionality
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser } from '../utils/auth.js';

const BACK_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;
const SEND_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

let pollInterval = null;
let conversationId = null;
let otherUserName = 'Chat';
let editingMessageId = null;

export function render(context = {}) {
  conversationId = context.params?.id || null;

  return `
    <div class="page-dark" style="display: flex; flex-direction: column; height: 100vh;">
      <style>
        .chat-messages { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; }
        .chat-bubble { max-width: 75%; padding: 10px 14px; border-radius: 18px; font-size: 14px; line-height: 1.4; }
        .chat-bubble-out { align-self: flex-end; background: #E53935; color: white; border-bottom-right-radius: 4px; }
        .chat-bubble-in { align-self: flex-start; background: #1f2937; color: #f9fafb; border-bottom-left-radius: 4px; }
        .chat-bubble-time { font-size: 10px; opacity: 0.7; margin-top: 4px; text-align: right; }
        .chat-input-bar { display: flex; gap: 8px; padding: 12px 16px; background: #0d1117; border-top: 1px solid #1f2937; padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px); }
        .chat-text-input { flex: 1; background: #1f2937; border: none; border-radius: 24px; padding: 10px 16px; color: #f9fafb; font-family: 'Nunito', sans-serif; font-size: 14px; outline: none; }
        .chat-send-btn { width: 44px; height: 44px; border-radius: 50%; background: #E53935; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .chat-send-btn:disabled { opacity: 0.5; cursor: default; }
        .chat-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #0d1117; border-bottom: 1px solid #1f2937; }
        .chat-header-avatar { width: 36px; height: 36px; border-radius: 50%; background: #374151; flex-shrink: 0; object-fit: cover; }
        .chat-header-name { font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 16px; color: #f9fafb; }
        .chat-bubble-wrapper { position: relative; }
        .chat-bubble-deleted { font-style: italic; opacity: 0.5; }
        .chat-bubble-edited { font-size: 10px; opacity: 0.6; margin-top: 2px; }
        .chat-ctx-menu {
          position: fixed; z-index: 100; background: #1f2937; border: 1px solid #374151;
          border-radius: 12px; padding: 6px 0; min-width: 140px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5); animation: ctxFadeIn 0.15s ease;
        }
        @keyframes ctxFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .chat-ctx-item {
          display: block; width: 100%; padding: 10px 16px; background: none; border: none;
          color: #f9fafb; font-size: 14px; font-family: 'Nunito', sans-serif;
          text-align: left; cursor: pointer;
        }
        .chat-ctx-item:hover { background: #374151; }
        .chat-ctx-item--danger { color: #ef4444; }
        .chat-edit-row { display: flex; gap: 6px; margin-top: 6px; }
        .chat-edit-input {
          flex: 1; background: #374151; border: 1px solid #E53935; border-radius: 12px;
          padding: 6px 10px; color: #f9fafb; font-size: 13px; outline: none;
          font-family: 'Nunito', sans-serif;
        }
        .chat-edit-btn {
          padding: 6px 12px; border-radius: 8px; border: none; cursor: pointer;
          font-size: 12px; font-weight: 700;
        }
        .chat-edit-save { background: #E53935; color: #fff; }
        .chat-edit-cancel { background: #374151; color: #d1d5db; }
        .chat-ctx-overlay { position: fixed; inset: 0; z-index: 99; }
      </style>

      <div class="chat-header">
        <button class="app-header-btn" id="chat-back-btn" style="background: none; border: none; cursor: pointer; padding: 4px;">${BACK_ICON}</button>
        <div class="chat-header-avatar" id="chat-other-avatar"></div>
        <div class="chat-header-name" id="chat-other-name">Loading...</div>
      </div>

      <div class="chat-messages" id="chat-messages">
        <div style="text-align: center; padding: 40px; color: #6b7280;">Loading messages...</div>
      </div>

      <div class="chat-input-bar">
        <input class="chat-text-input" id="chat-input" type="text" placeholder="Type a message..." autocomplete="off">
        <button class="chat-send-btn" id="chat-send-btn">${SEND_ICON}</button>
      </div>
    </div>
  `;
}

export function mount(context = {}) {
  conversationId = context.params?.id || null;

  const backBtn = document.getElementById('chat-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => navigate('/conversations'));
  }

  const sendBtn = document.getElementById('chat-send-btn');
  const inputEl = document.getElementById('chat-input');

  if (sendBtn && inputEl) {
    sendBtn.addEventListener('click', () => sendMessage());
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Mark as read
  if (conversationId) {
    markAsRead();
    loadMessages();

    // Poll for new messages every 5 seconds
    pollInterval = setInterval(() => {
      loadMessages(true);
    }, 5000);
  }
}

/**
 * Cleanup function — must be called when navigating away
 */
export function cleanup() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

async function markAsRead() {
  if (!conversationId) return;
  try {
    await api.put(`/api/chat/read/${conversationId}`);
  } catch {
    // silently fail
  }
}

async function loadMessages(isPolling = false) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const currentUser = getCurrentUser();

  try {
    const res = await api.get(`/api/chat/conversation/${conversationId}`);

    let messages = [];
    if (res.success && Array.isArray(res.data)) {
      messages = res.data;
    } else if (res.success && res.data && Array.isArray(res.data.messages)) {
      messages = res.data.messages;
    }

    // Try to extract other user's name from messages or conversation data
    if (res.data && res.data.conversation) {
      const conv = res.data.conversation;
      const participants = conv.participants || [];
      const other = participants.find((p) => {
        const pid = typeof p === 'string' ? p : (p._id || p.id);
        return currentUser && pid !== currentUser.id;
      }) || participants[0];
      if (other && other.username) {
        const pic = other.profilePic;
        updateHeader(other.username, pic ? (typeof pic === 'string' ? pic : pic.url) : '');
      }
    } else if (messages.length > 0) {
      // Infer other user from messages
      const otherMsg = messages.find((m) => {
        const senderId = typeof m.sender === 'string' ? m.sender : (m.sender?._id || m.sender?.id);
        return currentUser && senderId !== currentUser.id;
      });
      if (otherMsg) {
        const sender = otherMsg.sender || {};
        const pic = sender.profilePic;
        updateHeader(sender.username || 'User', pic ? (typeof pic === 'string' ? pic : pic.url) : '');
      }
    }

    if (messages.length === 0 && !isPolling) {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;">No messages yet. Say hello!</div>';
      return;
    }

    if (messages.length === 0) return;

    const shouldScroll = !isPolling || isAtBottom(container);

    container.innerHTML = messages.map((msg) => {
      const senderId = typeof msg.sender === 'string' ? msg.sender : (msg.sender?._id || msg.sender?.id);
      const isOutgoing = currentUser && senderId === currentUser.id;
      const bubbleClass = isOutgoing ? 'chat-bubble chat-bubble-out' : 'chat-bubble chat-bubble-in';
      const timeStr = formatMsgTime(msg.createdAt);
      const msgId = msg._id || '';

      if (msg.isDeleted) {
        return `
          <div class="${bubbleClass} chat-bubble-deleted" style="align-self:${isOutgoing ? 'flex-end' : 'flex-start'}">
            <div>\uD83D\uDEAB This message was deleted</div>
            <div class="chat-bubble-time">${timeStr}</div>
          </div>
        `;
      }

      return `
        <div class="chat-bubble-wrapper" style="align-self:${isOutgoing ? 'flex-end' : 'flex-start'};max-width:75%;" data-msg-id="${msgId}" ${isOutgoing ? 'data-outgoing="true"' : ''}>
          <div class="${bubbleClass}">
            <div>${escapeHtml(msg.text || msg.content || '')}</div>
            ${msg.isEdited ? '<div class="chat-bubble-edited">Edited</div>' : ''}
            <div class="chat-bubble-time">${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');

    attachMessageContextMenu();

    if (shouldScroll) {
      container.scrollTop = container.scrollHeight;
    }
  } catch (err) {
    if (!isPolling) {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Failed to load messages</div>';
    }
  }
}

function updateHeader(name, pic) {
  const nameEl = document.getElementById('chat-other-name');
  const avatarEl = document.getElementById('chat-other-avatar');
  if (nameEl && name) {
    nameEl.textContent = name;
    otherUserName = name;
  }
  if (avatarEl && pic) {
    const img = document.createElement('img');
    img.src = pic;
    img.alt = name || '';
    img.className = 'chat-header-avatar';
    img.style.objectFit = 'cover';
    avatarEl.replaceWith(img);
  }
}

async function sendMessage() {
  const inputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  if (!inputEl || !conversationId) return;

  const content = inputEl.value.trim();
  if (!content) return;

  inputEl.value = '';
  sendBtn.disabled = true;

  try {
    const res = await api.post('/api/chat/send', { conversationId, text: content });

    if (res.success) {
      // Append the sent message immediately
      const container = document.getElementById('chat-messages');
      if (container) {
        // Check if it's the empty state
        if (container.querySelector('div[style*="text-align: center"]')) {
          container.innerHTML = '';
        }

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble chat-bubble-out';
        bubble.innerHTML = `
          <div>${escapeHtml(content)}</div>
          <div class="chat-bubble-time">${formatMsgTime(new Date().toISOString())}</div>
        `;
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
      }
    }
  } catch {
    // Put the message back in the input on failure
    inputEl.value = content;
  } finally {
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

function attachMessageContextMenu() {
  document.querySelectorAll('.chat-bubble-wrapper[data-outgoing="true"]').forEach((wrapper) => {
    let pressTimer = null;

    // Long press for mobile
    wrapper.addEventListener('touchstart', (e) => {
      pressTimer = setTimeout(() => {
        e.preventDefault();
        const touch = e.touches[0];
        showContextMenu(wrapper.dataset.msgId, touch.clientX, touch.clientY);
      }, 500);
    }, { passive: false });

    wrapper.addEventListener('touchend', () => clearTimeout(pressTimer));
    wrapper.addEventListener('touchmove', () => clearTimeout(pressTimer));

    // Right click for desktop
    wrapper.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(wrapper.dataset.msgId, e.clientX, e.clientY);
    });
  });
}

function showContextMenu(msgId, x, y) {
  closeContextMenu();

  const overlay = document.createElement('div');
  overlay.className = 'chat-ctx-overlay';
  overlay.id = 'chat-ctx-overlay';
  overlay.addEventListener('click', closeContextMenu);
  document.body.appendChild(overlay);

  const menu = document.createElement('div');
  menu.className = 'chat-ctx-menu';
  menu.id = 'chat-ctx-menu';
  menu.innerHTML = `
    <button class="chat-ctx-item" data-action="edit" data-msg-id="${msgId}">✏️ Edit</button>
    <button class="chat-ctx-item chat-ctx-item--danger" data-action="delete" data-msg-id="${msgId}">🗑️ Delete for everyone</button>
  `;

  // Position the menu
  menu.style.left = `${Math.min(x, window.innerWidth - 160)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - 100)}px`;
  document.body.appendChild(menu);

  menu.querySelectorAll('.chat-ctx-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const id = btn.dataset.msgId;
      closeContextMenu();
      if (action === 'edit') startEditMessage(id);
      if (action === 'delete') deleteMessage(id);
    });
  });
}

function closeContextMenu() {
  document.getElementById('chat-ctx-overlay')?.remove();
  document.getElementById('chat-ctx-menu')?.remove();
}

function startEditMessage(msgId) {
  const wrapper = document.querySelector(`.chat-bubble-wrapper[data-msg-id="${msgId}"]`);
  if (!wrapper) return;

  editingMessageId = msgId;
  const bubble = wrapper.querySelector('.chat-bubble');
  const textDiv = bubble?.querySelector('div:first-child');
  const currentText = textDiv?.textContent || '';

  // Replace bubble content with edit input
  const editRow = document.createElement('div');
  editRow.className = 'chat-edit-row';
  editRow.innerHTML = `
    <input class="chat-edit-input" id="chat-edit-input" value="${escapeHtml(currentText)}" />
    <button class="chat-edit-btn chat-edit-save" id="chat-edit-save">Save</button>
    <button class="chat-edit-btn chat-edit-cancel" id="chat-edit-cancel">✕</button>
  `;
  wrapper.appendChild(editRow);

  const editInput = document.getElementById('chat-edit-input');
  editInput?.focus();
  editInput?.select();

  document.getElementById('chat-edit-save')?.addEventListener('click', () => saveEditMessage(msgId));
  document.getElementById('chat-edit-cancel')?.addEventListener('click', () => cancelEditMessage());
  editInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEditMessage(msgId);
    if (e.key === 'Escape') cancelEditMessage();
  });
}

async function saveEditMessage(msgId) {
  const editInput = document.getElementById('chat-edit-input');
  const newText = editInput?.value?.trim();
  if (!newText || !msgId) return;

  try {
    const res = await api.put(`/api/chat/message/${msgId}`, { text: newText });
    if (res.success) {
      editingMessageId = null;
      loadMessages(true); // Refresh messages
    }
  } catch {
    // silently fail
  }
}

function cancelEditMessage() {
  editingMessageId = null;
  loadMessages(true); // Refresh to restore original
}

async function deleteMessage(msgId) {
  if (!msgId) return;
  try {
    const res = await api.delete(`/api/chat/message/${msgId}`);
    if (res.success) {
      loadMessages(true); // Refresh messages
    }
  } catch {
    // silently fail
  }
}

function isAtBottom(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 50;
}

function formatMsgTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
