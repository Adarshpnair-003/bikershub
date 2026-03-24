import { navigate } from '../utils/router.js';

export function render() {
  return `
    <div class="page-light">
      <div class="auth-container">
        <div class="auth-logo">BIKERS HUB</div>

        <button class="auth-btn" id="splash-login-btn">LOGIN</button>
        <button class="auth-btn" id="splash-signup-btn">SIGN UP</button>

        <div class="auth-divider"><span>OR</span></div>

        <button class="auth-social-btn" id="splash-google-btn">
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.2-2.7-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.3 15.5 18.7 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.2 26.7 36 24 36c-5.3 0-9.8-3.5-11.3-8.3l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C36.7 39.3 44 34 44 24c0-1.3-.2-2.7-.4-3.9z"/></svg>
          Continue with Google
        </button>

        <button class="auth-social-btn" id="splash-apple-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.64-2.2.45-3.06-.4C3.79 16.17 4.36 9.02 8.93 8.76c1.28.07 2.17.74 2.92.78.98-.2 1.92-.78 2.98-.7 1.27.1 2.23.58 2.85 1.49-2.6 1.58-1.98 5.07.38 6.04-.46 1.17-.99 2.33-2.01 3.91zM12.05 8.64c-.14-2.43 1.83-4.49 4.1-4.64.3 2.71-2.42 4.73-4.1 4.64z"/></svg>
          Continue with Apple
        </button>
      </div>
    </div>
  `;
}

export function mount() {
  document.getElementById('splash-login-btn').addEventListener('click', () => {
    navigate('/login');
  });

  document.getElementById('splash-signup-btn').addEventListener('click', () => {
    navigate('/register');
  });

  document.getElementById('splash-google-btn').addEventListener('click', () => {
    alert('Google auth coming soon');
  });

  document.getElementById('splash-apple-btn').addEventListener('click', () => {
    alert('Apple auth coming soon');
  });
}
