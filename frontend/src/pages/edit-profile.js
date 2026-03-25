/**
 * Edit Profile page for Bikers Hub
 * Allows users to update their profile picture, username, bio, and phone
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';

export function render() {
  return `
    <style>
      .edit-profile-avatar-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        margin-bottom: 24px;
      }
      .edit-profile-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        background: #374151;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        position: relative;
      }
      .edit-profile-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .edit-profile-avatar-placeholder {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: #374151;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .edit-profile-avatar-spinner {
        position: absolute;
        inset: 0;
        background: rgba(13, 17, 23, 0.7);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .edit-profile-spinner {
        width: 24px;
        height: 24px;
        border: 3px solid #374151;
        border-top-color: #E53935;
        border-radius: 50%;
        animation: ep-spin 0.7s linear infinite;
      }
      @keyframes ep-spin {
        to { transform: rotate(360deg); }
      }
      .edit-profile-change-photo {
        background: none;
        border: none;
        color: #E53935;
        font-family: 'Nunito', sans-serif;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        padding: 4px 8px;
      }
      .edit-profile-change-photo:hover {
        text-decoration: underline;
      }
      .edit-profile-label {
        display: block;
        font-family: 'Exo 2', sans-serif;
        font-size: 13px;
        font-weight: 600;
        color: #9ca3af;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .edit-profile-input,
      .edit-profile-textarea {
        background: #1f2937;
        border: 1px solid #374151;
        border-radius: 12px;
        color: #f9fafb;
        padding: 12px 14px;
        font-family: 'Nunito', sans-serif;
        font-size: 15px;
        width: 100%;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.2s;
      }
      .edit-profile-input::placeholder,
      .edit-profile-textarea::placeholder {
        color: #6b7280;
      }
      .edit-profile-input:focus,
      .edit-profile-textarea:focus {
        border-color: #E53935;
      }
      .edit-profile-textarea {
        min-height: 100px;
        resize: vertical;
      }
      .edit-profile-field {
        margin-bottom: 20px;
      }
      .edit-profile-char-count {
        text-align: right;
        font-size: 12px;
        color: #6b7280;
        margin-top: 4px;
      }
      .edit-profile-char-count.near-limit {
        color: #E53935;
      }
      .edit-profile-save {
        background: #E53935;
        color: #fff;
        border: none;
        border-radius: 12px;
        padding: 14px;
        width: 100%;
        font-size: 16px;
        font-weight: 700;
        font-family: 'Nunito', sans-serif;
        cursor: pointer;
        letter-spacing: 1px;
        margin-top: 8px;
      }
      .edit-profile-save:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .edit-profile-save:hover:not(:disabled) {
        background: #c62828;
      }
      .edit-profile-error {
        color: #E53935;
        font-size: 13px;
        text-align: center;
        margin-bottom: 12px;
        min-height: 18px;
      }
    </style>
    <div class="page-dark">
      <div class="app-header">
        <button class="app-header-btn" id="edit-profile-back" style="margin-right: 8px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div class="app-header-title" style="flex:1;">Edit Profile</div>
      </div>

      <div style="padding: 24px 20px 40px;">
        <div class="edit-profile-avatar-wrap">
          <div class="edit-profile-avatar" id="edit-profile-avatar">
            <div class="edit-profile-avatar-placeholder" id="edit-profile-avatar-placeholder">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          </div>
          <button class="edit-profile-change-photo" id="edit-profile-change-photo">Change Photo</button>
          <input type="file" id="edit-profile-file" accept="image/*" style="display:none;" />
        </div>

        <div class="edit-profile-error" id="edit-profile-error"></div>

        <div class="edit-profile-field">
          <label class="edit-profile-label" for="edit-profile-username">Username</label>
          <input class="edit-profile-input" id="edit-profile-username" type="text" placeholder="Username" autocomplete="username" />
        </div>

        <div class="edit-profile-field">
          <label class="edit-profile-label" for="edit-profile-bio">Bio</label>
          <textarea class="edit-profile-textarea" id="edit-profile-bio" placeholder="Tell others about yourself..." maxlength="300"></textarea>
          <div class="edit-profile-char-count" id="edit-profile-char-count">0 / 300</div>
        </div>

        <div class="edit-profile-field">
          <label class="edit-profile-label" for="edit-profile-phone">Phone</label>
          <input class="edit-profile-input" id="edit-profile-phone" type="tel" placeholder="Phone number" autocomplete="tel" />
        </div>

        <button class="edit-profile-save" id="edit-profile-save">Save Changes</button>
      </div>
    </div>
  `;
}

export function mount() {
  const backBtn = document.getElementById('edit-profile-back');
  const avatarWrap = document.getElementById('edit-profile-avatar');
  const avatarPlaceholder = document.getElementById('edit-profile-avatar-placeholder');
  const changePhotoBtn = document.getElementById('edit-profile-change-photo');
  const fileInput = document.getElementById('edit-profile-file');
  const usernameInput = document.getElementById('edit-profile-username');
  const bioInput = document.getElementById('edit-profile-bio');
  const charCount = document.getElementById('edit-profile-char-count');
  const phoneInput = document.getElementById('edit-profile-phone');
  const saveBtn = document.getElementById('edit-profile-save');
  const errorEl = document.getElementById('edit-profile-error');

  if (backBtn) {
    backBtn.addEventListener('click', () => navigate('/profile'));
  }

  // Load current profile data
  loadCurrentProfile();

  async function loadCurrentProfile() {
    try {
      const res = await api.get('/api/users/me');
      if (res.success && res.data) {
        const user = res.data;
        if (usernameInput) usernameInput.value = user.username || '';
        if (bioInput) {
          bioInput.value = user.bio || '';
          updateCharCount();
        }
        if (phoneInput) phoneInput.value = user.phone || '';

        const pic = user.profilePic;
        const picUrl = pic ? (typeof pic === 'string' ? pic : pic.url || '') : '';
        if (picUrl) {
          setAvatarImage(picUrl);
        }
      }
    } catch {
      showError('Failed to load profile data.');
    }
  }

  function setAvatarImage(url) {
    if (!avatarWrap) return;
    avatarWrap.innerHTML = `<img src="${url}" alt="Profile picture">`;
  }

  function showAvatarSpinner() {
    if (!avatarWrap) return;
    const existing = avatarWrap.querySelector('.edit-profile-avatar-spinner');
    if (existing) return;
    const spinner = document.createElement('div');
    spinner.className = 'edit-profile-avatar-spinner';
    spinner.innerHTML = '<div class="edit-profile-spinner"></div>';
    avatarWrap.appendChild(spinner);
  }

  function hideAvatarSpinner() {
    if (!avatarWrap) return;
    const spinner = avatarWrap.querySelector('.edit-profile-avatar-spinner');
    if (spinner) spinner.remove();
  }

  function showError(msg) {
    if (errorEl) errorEl.textContent = msg;
  }

  function clearError() {
    if (errorEl) errorEl.textContent = '';
  }

  function updateCharCount() {
    if (!bioInput || !charCount) return;
    const len = bioInput.value.length;
    charCount.textContent = `${len} / 300`;
    if (len >= 270) {
      charCount.classList.add('near-limit');
    } else {
      charCount.classList.remove('near-limit');
    }
  }

  if (bioInput) {
    bioInput.addEventListener('input', updateCharCount);
  }

  // Change photo
  if (changePhotoBtn && fileInput) {
    changePhotoBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      clearError();
      showAvatarSpinner();
      changePhotoBtn.disabled = true;

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await api.upload('/api/upload/profile', formData);
        if (res.success && res.data) {
          const newUrl = typeof res.data === 'string'
            ? res.data
            : res.data.url || res.data.profilePic || '';
          if (newUrl) {
            setAvatarImage(newUrl);
          }
        } else {
          showError(res.error?.message || 'Failed to upload photo.');
        }
      } catch {
        showError('Network error uploading photo.');
      } finally {
        hideAvatarSpinner();
        changePhotoBtn.disabled = false;
        fileInput.value = '';
      }
    });
  }

  // Save profile
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      clearError();

      const username = usernameInput ? usernameInput.value.trim() : '';
      const bio = bioInput ? bioInput.value.trim() : '';
      const phone = phoneInput ? phoneInput.value.trim() : '';

      if (!username) {
        showError('Username is required.');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        const res = await api.put('/api/users/me', { username, bio, phone });
        if (res.success) {
          navigate('/profile');
        } else {
          showError(res.error?.message || 'Failed to save changes.');
        }
      } catch {
        showError('Network error. Please try again.');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
      }
    });
  }
}
