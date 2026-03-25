/**
 * Bikers Hub — Main entry point
 * Sets up routing, auth guards, and page rendering
 */

import { registerRoute, startRouter, navigate } from './utils/router.js';
import { isLoggedIn, loginAsGuest } from './utils/auth.js';
import './style.css';

// ============================================
// PAGE RENDERER
// ============================================

/**
 * Render a page into #app and call its mount function for event bindings
 * @param {Function} renderFn - Returns HTML string
 * @param {Function} [mountFn] - Called after HTML is inserted into DOM
 * @param {object} [context] - Passed to both render and mount
 */
function showPage(renderFn, mountFn, context = {}) {
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
// SPLASH PAGE
// ============================================

function renderSplash() {
  return `
    <div class="app">
      <div class="page page-light page-enter">
        <div class="auth-container" style="justify-content: center; align-items: center; text-align: center;">
          <div style="margin-bottom: 64px;">
            <div class="auth-logo" style="font-size: 42px; margin-bottom: 8px; letter-spacing: 3px;">
              <span class="logo-accent">BIKERS</span> HUB
            </div>
            <p style="font-size: 14px; color: #6b7280;">Ride Together. Ride Forever.</p>
          </div>
          <button class="auth-btn" style="max-width: 280px;" onclick="navigate('/login')">
            LOGIN
          </button>
          <button class="auth-btn" style="max-width: 280px; margin-top: 12px;" onclick="navigate('/register')">
            SIGN UP
          </button>

          <div class="auth-divider"><span>OR</span></div>

          <button class="auth-social-btn" style="max-width: 280px;" id="guest-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Continue as Guest
          </button>

          <p class="auth-footer" style="margin-top: 16px;">
            Already have an account? <a href="#/login">Sign In</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// LOGIN PAGE
// ============================================

function renderLogin() {
  return `
    <div class="app">
      <div class="page page-light page-enter">
        <div class="auth-container">
          <div class="auth-logo"><span class="logo-accent">BIKERS</span> HUB</div>
          <h1 class="auth-title">Welcome Back</h1>
          <p class="auth-subtitle">Sign in to continue your ride</p>

          <div id="login-error" class="auth-error hidden"></div>

          <form id="login-form">
            <div class="auth-input-group">
              <label class="auth-input-label">Email</label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M22 4L12 13 2 4"/>
                </svg>
                <input type="email" id="login-email" placeholder="your@email.com" autocomplete="email" required />
              </div>
            </div>

            <div class="auth-input-group">
              <label class="auth-input-label">Password</label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input type="password" id="login-password" placeholder="Enter your password" autocomplete="current-password" required />
                <button type="button" class="auth-input-toggle" id="login-toggle-pw">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="auth-row">
              <label class="auth-checkbox">
                <input type="checkbox" /> Remember me
              </label>
              <a href="#/forgot-password">Forgot Password?</a>
            </div>

            <button type="submit" class="auth-btn" id="login-btn">SIGN IN</button>
          </form>

          <div class="auth-divider">or continue with</div>

          <button class="auth-social-btn" id="google-login-btn">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p class="auth-footer">
            Don't have an account? <a href="#/register">Sign Up</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

function mountLogin() {
  const form = document.getElementById('login-form');
  const toggleBtn = document.getElementById('login-toggle-pw');
  const pwInput = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');

  // Toggle password visibility
  if (toggleBtn && pwInput) {
    toggleBtn.addEventListener('click', () => {
      pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = pwInput.value;
      const btn = document.getElementById('login-btn');

      btn.disabled = true;
      btn.textContent = 'SIGNING IN...';
      errorEl.classList.add('hidden');

      try {
        const { api } = await import('./utils/api.js');
        const { setTokens, setCurrentUser } = await import('./utils/auth.js');

        const res = await api.post('/api/auth/login', { email, password });

        if (res.success) {
          setTokens(res.data.token, res.data.refreshToken);
          setCurrentUser(res.data.user.id, res.data.user.username);
          navigate('/home');
        } else {
          errorEl.textContent = res.error?.message || 'Login failed. Please try again.';
          errorEl.classList.remove('hidden');
        }
      } catch (err) {
        errorEl.textContent = 'Network error. Please check your connection.';
        errorEl.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = 'SIGN IN';
      }
    });
  }
}

// ============================================
// REGISTER PAGE
// ============================================

function renderRegister() {
  return `
    <div class="app">
      <div class="page page-light page-enter">
        <div class="auth-container">
          <div class="auth-logo"><span class="logo-accent">BIKERS</span> HUB</div>
          <h1 class="auth-title">Create Account</h1>
          <p class="auth-subtitle">Join the riding community</p>

          <div id="register-error" class="auth-error hidden"></div>

          <form id="register-form">
            <div class="auth-input-group">
              <label class="auth-input-label">Username</label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input type="text" id="register-username" placeholder="Choose a username" autocomplete="username" required />
              </div>
            </div>

            <div class="auth-input-group">
              <label class="auth-input-label">Email</label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M22 4L12 13 2 4"/>
                </svg>
                <input type="email" id="register-email" placeholder="your@email.com" autocomplete="email" required />
              </div>
            </div>

            <div class="auth-input-group">
              <label class="auth-input-label">Password</label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input type="password" id="register-password" placeholder="Min 6 characters" autocomplete="new-password" required minlength="6" />
                <button type="button" class="auth-input-toggle" id="register-toggle-pw">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="auth-input-group">
              <label class="auth-input-label">Confirm Password</label>
              <div class="auth-input-wrap">
                <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input type="password" id="register-confirm" placeholder="Repeat your password" autocomplete="new-password" required />
              </div>
            </div>

            <div style="margin-bottom: 28px;"></div>

            <button type="submit" class="auth-btn" id="register-btn">CREATE ACCOUNT</button>
          </form>

          <div class="auth-divider">or continue with</div>

          <button class="auth-social-btn" id="google-register-btn">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p class="auth-footer">
            Already have an account? <a href="#/login">Sign In</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

function mountRegister() {
  const form = document.getElementById('register-form');
  const toggleBtn = document.getElementById('register-toggle-pw');
  const pwInput = document.getElementById('register-password');
  const errorEl = document.getElementById('register-error');

  if (toggleBtn && pwInput) {
    toggleBtn.addEventListener('click', () => {
      pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('register-username').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = pwInput.value;
      const confirm = document.getElementById('register-confirm').value;
      const btn = document.getElementById('register-btn');

      errorEl.classList.add('hidden');

      if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match.';
        errorEl.classList.remove('hidden');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'CREATING ACCOUNT...';

      try {
        const { api } = await import('./utils/api.js');

        const res = await api.post('/api/auth/register', { username, email, password });

        if (res.success) {
          alert('Account created! Please sign in.');
          navigate('/login');
        } else {
          errorEl.textContent = res.error?.message || 'Registration failed. Please try again.';
          errorEl.classList.remove('hidden');
        }
      } catch (err) {
        errorEl.textContent = 'Network error. Please check your connection.';
        errorEl.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = 'CREATE ACCOUNT';
      }
    });
  }
}

// ============================================
// PAGE MODULES (Home, Clubs, Search, Maps, Profile)
// ============================================

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

// ============================================
// ROUTE REGISTRATION
// ============================================

function mountSplash() {
  const guestBtn = document.getElementById('guest-btn');
  if (guestBtn) {
    guestBtn.addEventListener('click', () => loginAsGuest());
  }
}

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
  showPage(renderMaps, mountMaps);
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
  showPage(renderCreateRide, mountCreateRide);
});

registerRoute('/conversations', () => {
  if (!requireAuth()) return;
  showPage(renderConversations, mountConversations);
});

registerRoute('/chat/:id', (context) => {
  if (!requireAuth()) return;
  cleanupChat(); // Clear any previous polling
  showPage(
    () => renderChat(context),
    () => mountChat(context)
  );
});

registerRoute('/notifications', () => {
  if (!requireAuth()) return;
  showPage(renderNotifications, mountNotifications);
});

registerRoute('/rides/:id', (context) => {
  if (!requireAuth()) return;
  if (typeof cleanupRideDetail === 'function') cleanupRideDetail();
  showPage(
    () => renderRideDetail(context),
    () => mountRideDetail(context)
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
