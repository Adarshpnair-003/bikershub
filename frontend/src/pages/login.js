import { navigate } from '../utils/router.js';
import { setTokens, setCurrentUser } from '../utils/auth.js';
import { api } from '../utils/api.js';

const ICON_ENVELOPE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;

const ICON_LOCK = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

const ICON_EYE_SHOW = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

const ICON_EYE_HIDE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m1 1 22 22"/><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>`;

const ICON_GOOGLE = `<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.2-2.7-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.3 15.5 18.7 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.2 26.7 36 24 36c-5.3 0-9.8-3.5-11.3-8.3l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C36.7 39.3 44 34 44 24c0-1.3-.2-2.7-.4-3.9z"/></svg>`;

const ICON_APPLE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.64-2.2.45-3.06-.4C3.79 16.17 4.36 9.02 8.93 8.76c1.28.07 2.17.74 2.92.78.98-.2 1.92-.78 2.98-.7 1.27.1 2.23.58 2.85 1.49-2.6 1.58-1.98 5.07.38 6.04-.46 1.17-.99 2.33-2.01 3.91zM12.05 8.64c-.14-2.43 1.83-4.49 4.1-4.64.3 2.71-2.42 4.73-4.1 4.64z"/></svg>`;

export function render() {
  return `
    <div class="page-light">
      <div class="auth-container">
        <h1 class="auth-title">Login</h1>
        <p class="auth-subtitle">Please login to your account</p>

        <form id="login-form">
          <div class="auth-input-group">
            <label class="auth-input-label">Email address</label>
            <div class="auth-input-wrap">
              <span class="auth-input-icon">${ICON_ENVELOPE}</span>
              <input type="email" id="login-email" placeholder="Enter your email" required />
            </div>
          </div>

          <div class="auth-input-group">
            <label class="auth-input-label">Password</label>
            <div class="auth-input-wrap">
              <span class="auth-input-icon">${ICON_LOCK}</span>
              <input type="password" id="login-password" placeholder="Enter your password" required />
              <button type="button" class="auth-input-toggle" id="login-toggle-password">${ICON_EYE_SHOW}</button>
            </div>
          </div>

          <div class="auth-row">
            <label class="auth-checkbox">
              <input type="checkbox" id="login-remember" />
              Remember me
            </label>
            <a href="#" id="login-forgot">Forgot password?</a>
          </div>

          <button type="submit" class="auth-btn" id="login-submit-btn">LOGIN</button>
        </form>

        <div class="auth-divider"><span>OR</span></div>

        <button class="auth-social-btn" id="login-google-btn">
          ${ICON_GOOGLE}
          Continue with Google
        </button>

        <button class="auth-social-btn" id="login-apple-btn">
          ${ICON_APPLE}
          Continue with Apple
        </button>

        <p class="auth-footer">Don't have an account? <a id="login-goto-register">sign up</a></p>
      </div>
    </div>
  `;
}

export function mount() {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const toggleBtn = document.getElementById('login-toggle-password');
  const submitBtn = document.getElementById('login-submit-btn');

  // Password visibility toggle
  let passwordVisible = false;
  toggleBtn.addEventListener('click', () => {
    passwordVisible = !passwordVisible;
    passwordInput.type = passwordVisible ? 'text' : 'password';
    toggleBtn.innerHTML = passwordVisible ? ICON_EYE_HIDE : ICON_EYE_SHOW;
  });

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      alert('Please fill in all fields.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Loading...';

    try {
      const data = await api.post('/api/auth/login', { email, password });

      if (data.success && data.data) {
        setTokens(data.data.token, data.data.refreshToken);
        setCurrentUser(data.data.user.id, data.data.user.username);
        navigate('/home');
      } else {
        alert(data.error?.message || data.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      alert(err.message || 'Login failed. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'LOGIN';
    }
  });

  // Forgot password
  document.getElementById('login-forgot').addEventListener('click', (e) => {
    e.preventDefault();
    alert('Forgot password feature coming soon.');
  });

  // Social auth
  document.getElementById('login-google-btn').addEventListener('click', () => {
    alert('Google auth coming soon');
  });

  document.getElementById('login-apple-btn').addEventListener('click', () => {
    alert('Apple auth coming soon');
  });

  // Navigate to register
  document.getElementById('login-goto-register').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('/register');
  });
}
