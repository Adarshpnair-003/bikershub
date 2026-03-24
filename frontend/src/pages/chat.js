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

      return `
        <div class="${bubbleClass}">
          <div>${escapeHtml(msg.text || msg.content || '')}</div>
          <div class="chat-bubble-time">${timeStr}</div>
        </div>
      `;
    }).join('');

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
