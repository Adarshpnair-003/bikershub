/**
 * Socket.IO client manager for Bikers Hub
 *
 * Provides a singleton socketManager that handles connection lifecycle,
 * room management, and event subscriptions for chat, rides, notifications,
 * and post updates.
 */

import { io } from 'socket.io-client';
import { API_BASE_URL } from './api.js';
import { getToken } from './auth.js';

/** @type {import('socket.io-client').Socket | null} */
let socket = null;

/**
 * Attempt to refresh the access token by calling the refresh endpoint directly.
 * We avoid importing tryRefreshToken from api.js to prevent circular dependencies,
 * so we duplicate the minimal refresh logic here.
 * @returns {Promise<boolean>} true if refresh succeeded and new token is stored
 */
async function refreshAccessToken() {
  try {
    const refreshToken = localStorage.getItem('bh_refresh_token');
    if (!refreshToken) return false;

    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.success && data.data) {
      localStorage.setItem('bh_access_token', data.data.token);
      if (data.data.refreshToken) {
        localStorage.setItem('bh_refresh_token', data.data.refreshToken);
      }
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Singleton Socket.IO manager for all real-time features.
 *
 * Usage:
 *   import { socketManager } from './socket.js';
 *   socketManager.connect();
 *   socketManager.onNewNotification((n) => console.log(n));
 */
export const socketManager = {
  /**
   * Create and connect the socket with JWT auth.
   * Joins the notifications room automatically on connect.
   * Safe to call multiple times — will no-op if already connected.
   */
  connect() {
    if (socket && socket.connected) return;

    const token = getToken();
    if (!token) return;

    // Disconnect stale instance if it exists but is not connected
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }

    socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
    });

    // --- Connection lifecycle ---

    socket.on('connect', () => {
      // Auto-join the notifications room on every (re)connect
      socket.emit('joinNotifications');
    });

    socket.on('connect_error', async (err) => {
      // If the error looks like a JWT / auth failure, try refreshing the token
      const msg = (err.message || '').toLowerCase();
      const isAuthError =
        msg.includes('jwt') ||
        msg.includes('token') ||
        msg.includes('unauthorized') ||
        msg.includes('auth');

      if (isAuthError) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Update the auth payload with the fresh token and retry
          socket.auth = { token: getToken() };
          socket.connect();
        }
        // If refresh failed we let the built-in reconnection backoff handle retries
      }
    });

    socket.connect();
  },

  /**
   * Disconnect the socket and clean up listeners.
   */
  disconnect() {
    if (!socket) return;
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  },

  /**
   * Return the raw Socket.IO client instance (or null).
   * @returns {import('socket.io-client').Socket | null}
   */
  getSocket() {
    return socket;
  },

  /**
   * Whether the socket is currently connected.
   * @returns {boolean}
   */
  isConnected() {
    return !!(socket && socket.connected);
  },

  // ---------------------------------------------------------------
  // Chat
  // ---------------------------------------------------------------

  /**
   * Join a conversation room to receive messages and typing indicators.
   * @param {string} conversationId
   */
  joinConversation(conversationId) {
    if (!socket) return;
    socket.emit('joinConversation', conversationId);
  },

  /**
   * Leave a conversation room.
   * @param {string} conversationId
   */
  leaveConversation(conversationId) {
    if (!socket) return;
    socket.emit('leaveConversation', conversationId);
  },

  /**
   * Send a chat message.
   * @param {string} conversationId
   * @param {string} text
   * @param {string} [type='text'] - Message type (text, image, etc.)
   */
  sendMessage(conversationId, text, type = 'text') {
    if (!socket) return;
    socket.emit('sendMessage', { conversationId, text, type });
  },

  /**
   * Emit a typing indicator.
   * @param {string} conversationId
   */
  emitTyping(conversationId) {
    if (!socket) return;
    socket.emit('typing', { conversationId });
  },

  /**
   * Emit stop-typing indicator.
   * @param {string} conversationId
   */
  emitStopTyping(conversationId) {
    if (!socket) return;
    socket.emit('stopTyping', { conversationId });
  },

  /**
   * Subscribe to incoming messages.
   * @param {(message: object) => void} callback
   */
  onNewMessage(callback) {
    if (!socket) return;
    socket.on('receiveMessage', callback);
  },

  /**
   * Unsubscribe from incoming messages.
   * @param {(message: object) => void} callback
   */
  offNewMessage(callback) {
    if (!socket) return;
    socket.off('receiveMessage', callback);
  },

  /**
   * Subscribe to typing indicators.
   * @param {(data: { senderId: string }) => void} callback
   */
  onTyping(callback) {
    if (!socket) return;
    socket.on('typing', callback);
  },

  /**
   * Unsubscribe from typing indicators.
   * @param {(data: { senderId: string }) => void} callback
   */
  offTyping(callback) {
    if (!socket) return;
    socket.off('typing', callback);
  },

  /**
   * Subscribe to stop-typing indicators.
   * @param {(data: { senderId: string }) => void} callback
   */
  onStopTyping(callback) {
    if (!socket) return;
    socket.on('stopTyping', callback);
  },

  /**
   * Unsubscribe from stop-typing indicators.
   * @param {(data: { senderId: string }) => void} callback
   */
  offStopTyping(callback) {
    if (!socket) return;
    socket.off('stopTyping', callback);
  },

  // ---------------------------------------------------------------
  // Ride tracking
  // ---------------------------------------------------------------

  /**
   * Join a ride room to receive location updates.
   * @param {string} rideId
   */
  joinRide(rideId) {
    if (!socket) return;
    socket.emit('joinRide', { rideId });
  },

  /**
   * Leave a ride room.
   * @param {string} rideId
   */
  leaveRide(rideId) {
    if (!socket) return;
    socket.emit('leaveRide', { rideId });
  },

  /**
   * Send a GPS location update for a ride.
   * @param {string} rideId
   * @param {number} lat
   * @param {number} lng
   */
  sendLocationUpdate(rideId, lat, lng) {
    if (!socket) return;
    socket.emit('rideLocationUpdate', { rideId, lat, lng });
  },

  /**
   * Subscribe to rider location updates.
   * @param {(data: { userId: string, lat: number, lng: number }) => void} callback
   */
  onRiderLocation(callback) {
    if (!socket) return;
    socket.on('riderLocationUpdated', callback);
  },

  /**
   * Unsubscribe from rider location updates.
   * @param {(data: { userId: string, lat: number, lng: number }) => void} callback
   */
  offRiderLocation(callback) {
    if (!socket) return;
    socket.off('riderLocationUpdated', callback);
  },

  // ---------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------

  /**
   * Subscribe to new notifications.
   * @param {(notification: object) => void} callback
   */
  onNewNotification(callback) {
    if (!socket) return;
    socket.on('newNotification', callback);
  },

  /**
   * Unsubscribe from new notifications.
   * @param {(notification: object) => void} callback
   */
  offNewNotification(callback) {
    if (!socket) return;
    socket.off('newNotification', callback);
  },

  // ---------------------------------------------------------------
  // Posts
  // ---------------------------------------------------------------

  /**
   * Join a post room to receive like/comment updates.
   * @param {string} postId
   */
  joinPost(postId) {
    if (!socket) return;
    socket.emit('joinPost', postId);
  },

  /**
   * Leave a post room.
   * @param {string} postId
   */
  leavePost(postId) {
    if (!socket) return;
    socket.emit('leavePost', postId);
  },

  /**
   * Subscribe to post-liked events.
   * @param {(data: { postId: string, likesCount: number }) => void} callback
   */
  onPostLiked(callback) {
    if (!socket) return;
    socket.on('postLiked', callback);
  },

  /**
   * Unsubscribe from post-liked events.
   * @param {(data: { postId: string, likesCount: number }) => void} callback
   */
  offPostLiked(callback) {
    if (!socket) return;
    socket.off('postLiked', callback);
  },

  /**
   * Subscribe to new-comment events on a post.
   * @param {(comment: object) => void} callback
   */
  onNewComment(callback) {
    if (!socket) return;
    socket.on('newComment', callback);
  },

  /**
   * Unsubscribe from new-comment events.
   * @param {(comment: object) => void} callback
   */
  offNewComment(callback) {
    if (!socket) return;
    socket.off('newComment', callback);
  },

  /**
   * Subscribe to comment-liked events.
   * @param {(data: { commentId: string, likesCount: number }) => void} callback
   */
  onCommentLiked(callback) {
    if (!socket) return;
    socket.on('commentLiked', callback);
  },

  /**
   * Unsubscribe from comment-liked events.
   * @param {(data: { commentId: string, likesCount: number }) => void} callback
   */
  offCommentLiked(callback) {
    if (!socket) return;
    socket.off('commentLiked', callback);
  },
};
