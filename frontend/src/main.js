/**
 * Bikers Hub — Main entry point
 * Sets up routing, auth guards, and page rendering
 */

import { registerRoute, startRouter, navigate } from './utils/router.js';
import { api } from './utils/api.js';
import { isLoggedIn, loginAsGuest, setTokens, setCurrentUser } from './utils/auth.js';
import { SocialLogin } from '@capgo/capacitor-social-login';
import './style.css';

let googlePluginInitialized = false;

function setAuthError(message) {
  const errorEl = document.getElementById('login-error') || document.getElementById('register-error');
  if (!errorEl) return;

  if (!message) {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
    return;
  }

  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function getGoogleClientId() {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
}

async function ensureGooglePluginInitialized() {
  if (googlePluginInitialized) return;

  const clientId = getGoogleClientId();
  if (!clientId) throw new Error('Google Client ID not configured');

  await SocialLogin.initialize({
    google: { webClientId: clientId },
  });
  googlePluginInitialized = true;
}

async function handleGoogleLogin() {
  try {
    setAuthError('');
    await ensureGooglePluginInitialized();

    const result = await SocialLogin.login({
      provider: 'google',
      options: { scopes: ['email', 'profile'] },
    });

    const idToken = result?.result?.idToken;
    if (!idToken) {
      setAuthError('Google did not return a valid credential.');
      return;
    }

    const res = await api.post('/api/auth/google', { token: idToken });

    if (!res.success || !res.data?.token || !res.data?.user) {
      setAuthError(res.error?.message || res.message || 'Google authentication failed.');
      return;
    }

    setAuthError('');
    setTokens(res.data.token, res.data.refreshToken);
    setCurrentUser(res.data.user.id, res.data.user.username);
    navigate('/home');
  } catch (error) {
    console.error('Google login failed:', error);
    if (error?.message?.includes('canceled') || error?.message?.includes('cancelled')) {
      return; // User cancelled — don't show error
    }
    setAuthError('Unable to complete Google sign-in. Please try again.');
  }
}

const GOOGLE_BTN_SVG = `<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.2-2.7-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.3 15.5 18.7 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.2 26.7 36 24 36c-5.3 0-9.8-3.5-11.3-8.3l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C36.7 39.3 44 34 44 24c0-1.3-.2-2.7-.4-3.9z"/></svg>`;

export function initGoogleButton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const clientId = getGoogleClientId();
  if (!clientId) {
    container.innerHTML = `<button class="auth-social-btn" type="button" disabled>Google Sign-In not configured</button>`;
    return;
  }

  container.innerHTML = `
    <button type="button" class="google-login-btn" style="
      width: 100%; height: 48px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.2);
      background: #000; color: #fff; font-family: 'Poppins', sans-serif; font-size: 15px;
      font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
    ">
      ${GOOGLE_BTN_SVG}
      Continue with Google
    </button>
  `;

  container.querySelector('.google-login-btn').addEventListener('click', () => {
    void handleGoogleLogin();
  });
}

// ============================================
// PAGE RENDERER
// ============================================

/** Track active cleanup function so we can call it before rendering a new page */
let activeCleanup = null;

/**
 * Render a page into #app and call its mount function for event bindings
 * @param {Function} renderFn - Returns HTML string
 * @param {Function} [mountFn] - Called after HTML is inserted into DOM
 * @param {object} [context] - Passed to both render and mount
 * @param {Function} [cleanupFn] - Called before the next page renders
 */
function showPage(renderFn, mountFn, context = {}, cleanupFn = null) {
  // Run previous page's cleanup
  if (activeCleanup) {
    try { activeCleanup(); } catch { /* ignore cleanup errors */ }
    activeCleanup = null;
  }
  activeCleanup = cleanupFn;
  const app = document.getElementById('app');
  app.innerHTML = renderFn(context);
  if (mountFn) {
    mountFn(context);
  }
}

/**
 * Auth guard — redirects to splash if not logged in
 * @returns {boolean} true if authenticated
 */
function requireAuth() {
  if (!isLoggedIn()) {
    navigate('/');
    return false;
  }
  return true;
}



// ============================================
// LOGIN PAGE
// ============================================



// ============================================
// REGISTER PAGE
// ============================================



// ============================================
// PAGE MODULES (Splash, Home, Clubs, Search, Maps, Profile)
// ============================================

import { render as renderLogin, mount as mountLogin } from './pages/login.js';
import { render as renderRegister, mount as mountRegister } from './pages/register.js';
import { render as renderSplash, mount as mountSplash } from './pages/splash.js';
import { render as renderHome, mount as mountHome } from './pages/home.js';
import { render as renderClubs, mount as mountClubs } from './pages/clubs.js';
import { render as renderSearch, mount as mountSearch } from './pages/search.js';
import { render as renderMaps, mount as mountMaps, cleanup as cleanupMaps } from './pages/maps.js';
import { render as renderProfile, mount as mountProfile } from './pages/profile.js';
import { render as renderCreatePost, mount as mountCreatePost } from './pages/create-post.js';
import { render as renderCreateRide, mount as mountCreateRide, cleanup as cleanupCreateRide } from './pages/create-ride.js';
import { render as renderConversations, mount as mountConversations } from './pages/conversations.js';
import { render as renderChat, mount as mountChat, cleanup as cleanupChat } from './pages/chat.js';
import { render as renderNotifications, mount as mountNotifications } from './pages/notifications.js';
import { render as renderRideDetail, mount as mountRideDetail, cleanup as cleanupRideDetail } from './pages/ride-detail.js';
import { render as renderClubDetail, mount as mountClubDetail } from './pages/club-detail.js';
import { render as renderCreateClub, mount as mountCreateClub } from './pages/create-club.js';
import { render as renderEditProfile, mount as mountEditProfile } from './pages/edit-profile.js';
import { render as renderUserProfile, mount as mountUserProfile } from './pages/user-profile.js';
import { render as renderPostDetail, mount as mountPostDetail } from './pages/post-detail.js';
import { render as renderAddBike, mount as mountAddBike, cleanup as cleanupAddBike } from './pages/add-bike.js';
import { render as renderEditBike, mount as mountEditBike, cleanup as cleanupEditBike } from './pages/edit-bike.js';
import { render as renderBikeDetail, mount as mountBikeDetail, cleanup as cleanupBikeDetail } from './pages/bike-detail.js';

// ============================================
// ROUTE REGISTRATION
// ============================================



registerRoute('/', () => {
  if (isLoggedIn()) {
    showPage(renderHome, mountHome);
  } else {
    showPage(renderSplash, mountSplash);
  }
});

registerRoute('/login', () => {
  if (isLoggedIn()) {
    navigate('/home');
    return;
  }
  showPage(renderLogin, mountLogin);
});

registerRoute('/register', () => {
  if (isLoggedIn()) {
    navigate('/home');
    return;
  }
  showPage(renderRegister, mountRegister);
});

registerRoute('/home', () => {
  if (!requireAuth()) return;
  showPage(renderHome, mountHome);
});

registerRoute('/clubs', () => {
  if (!requireAuth()) return;
  showPage(renderClubs, mountClubs);
});

registerRoute('/search', () => {
  if (!requireAuth()) return;
  showPage(renderSearch, mountSearch);
});

registerRoute('/maps', () => {
  if (!requireAuth()) return;
  showPage(renderMaps, mountMaps, {}, cleanupMaps);
});

registerRoute('/profile', () => {
  if (!requireAuth()) return;
  showPage(renderProfile, mountProfile);
});

registerRoute('/create-post', () => {
  if (!requireAuth()) return;
  showPage(renderCreatePost, mountCreatePost);
});

registerRoute('/create-ride', () => {
  if (!requireAuth()) return;
  showPage(renderCreateRide, mountCreateRide, {}, cleanupCreateRide);
});

registerRoute('/conversations', () => {
  if (!requireAuth()) return;
  showPage(renderConversations, mountConversations);
});

registerRoute('/chat/:id', (context) => {
  if (!requireAuth()) return;
  showPage(
    () => renderChat(context),
    () => mountChat(context),
    {},
    cleanupChat
  );
});

registerRoute('/notifications', () => {
  if (!requireAuth()) return;
  showPage(renderNotifications, mountNotifications);
});

registerRoute('/rides/:id', (context) => {
  if (!requireAuth()) return;
  showPage(
    () => renderRideDetail(context),
    () => mountRideDetail(context),
    {},
    cleanupRideDetail
  );
});

registerRoute('/clubs/:id', (context) => {
  if (!requireAuth()) return;
  showPage(
    () => renderClubDetail(context),
    () => mountClubDetail(context)
  );
});

registerRoute('/create-club', () => {
  if (!requireAuth()) return;
  showPage(renderCreateClub, mountCreateClub);
});

registerRoute('/edit-profile', () => {
  if (!requireAuth()) return;
  showPage(renderEditProfile, mountEditProfile);
});

registerRoute('/add-bike', () => {
  if (!requireAuth()) return;
  showPage(renderAddBike, mountAddBike, {}, cleanupAddBike);
});

registerRoute('/edit-bike/:id', (context) => {
  if (!requireAuth()) return;
  showPage(
    () => renderEditBike(context),
    () => mountEditBike(context),
    {},
    cleanupEditBike
  );
});

registerRoute('/garage/:userId/:bikeId', (context) => {
  showPage(
    () => renderBikeDetail(context),
    () => mountBikeDetail(context),
    {},
    cleanupBikeDetail
  );
});

registerRoute('/user/:id', (context) => {
  if (!requireAuth()) return;
  showPage(
    () => renderUserProfile(context),
    () => mountUserProfile(context)
  );
});

registerRoute('/posts/:id', (context) => {
  if (!requireAuth()) return;
  showPage(
    () => renderPostDetail(context),
    () => mountPostDetail(context)
  );
});

// ============================================
// BOOTSTRAP
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  startRouter();
});
