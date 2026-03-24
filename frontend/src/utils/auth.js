/**
 * Auth state management for Bikers Hub
 * Uses localStorage with bh_ prefix for all keys
 */

import { navigate } from './router.js';

const KEYS = {
  accessToken: 'bh_access_token',
  refreshToken: 'bh_refresh_token',
  userId: 'bh_user_id',
  username: 'bh_username',
};

/**
 * Get the current access token
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem(KEYS.accessToken);
}

/**
 * Store access and refresh tokens
 * @param {string} accessToken
 * @param {string} refreshToken
 */
export function setTokens(accessToken, refreshToken) {
  if (accessToken) {
    localStorage.setItem(KEYS.accessToken, accessToken);
  } else {
    localStorage.removeItem(KEYS.accessToken);
  }

  if (refreshToken && refreshToken !== 'null' && refreshToken !== 'undefined') {
    localStorage.setItem(KEYS.refreshToken, refreshToken);
  } else {
    localStorage.removeItem(KEYS.refreshToken);
  }
}

/**
 * Clear all auth data from localStorage
 */
export function clearTokens() {
  localStorage.removeItem(KEYS.accessToken);
  localStorage.removeItem(KEYS.refreshToken);
  localStorage.removeItem(KEYS.userId);
  localStorage.removeItem(KEYS.username);
  localStorage.removeItem('bh_guest');
}

/**
 * Check if user is currently logged in (or guest mode)
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!localStorage.getItem(KEYS.accessToken) || !!localStorage.getItem('bh_guest');
}

/**
 * Check if user is in guest mode
 * @returns {boolean}
 */
export function isGuest() {
  return !!localStorage.getItem('bh_guest');
}

/**
 * Enter guest mode — sets fake user so all screens are accessible
 */
export function loginAsGuest() {
  localStorage.setItem('bh_guest', 'true');
  localStorage.setItem(KEYS.userId, 'guest');
  localStorage.setItem(KEYS.username, 'Guest Rider');
  navigate('/home');
}

/**
 * Get the current user info
 * @returns {{ id: string, username: string } | null}
 */
export function getCurrentUser() {
  const id = localStorage.getItem(KEYS.userId);
  const username = localStorage.getItem(KEYS.username);

  if (!id || !username) {
    return null;
  }

  return { id, username };
}

/**
 * Store current user info
 * @param {string} id
 * @param {string} username
 */
export function setCurrentUser(id, username) {
  localStorage.setItem(KEYS.userId, id);
  localStorage.setItem(KEYS.username, username);
}

/**
 * Log out: clear all stored data and navigate to splash
 */
export function logout() {
  clearTokens();
  navigate('/');
}
