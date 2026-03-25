/**
 * Create Club page for Bikers Hub
 * Form to create a new motorcycle club
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';

const BACK_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;

export function render() {
  return `
    <style>
      .cc-input {
        width: 100%;
        background: #1f2937;
        border: 1px solid #374151;
        border-radius: 12px;
        padding: 14px 16px;
        color: #f9fafb;
        font-family: 'Nunito', sans-serif;
        font-size: 14px;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.2s;
      }
      .cc-input:focus {
        border-color: #E53935;
      }
      .cc-input::placeholder {
        color: #6b7280;
      }
      .cc-label {
        display: block;
        font-size: 13px;
        color: #9ca3af;
        margin-bottom: 6px;
        font-family: 'Nunito', sans-serif;
      }
      .cc-toggle-track {
        position: relative;
        width: 44px;
        height: 24px;
        background: #374151;
        border-radius: 12px;
        cursor: pointer;
        transition: background 0.2s;
        flex-shrink: 0;
      }
      .cc-toggle-track.active {
        background: #E53935;
      }
      .cc-toggle-thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 20px;
        height: 20px;
        background: #f9fafb;
        border-radius: 50%;
        transition: transform 0.2s;
      }
      .cc-toggle-track.active .cc-toggle-thumb {
        transform: translateX(20px);
      }
    </style>
    <div class="page-dark" style="display: flex; flex-direction: column; height: 100vh; background: #0d1117;">
      <div class="app-header">
        <button class="app-header-btn" id="cc-back-btn">${BACK_ICON}</button>
        <div class="app-header-title" style="flex: 1; text-align: center; font-family: 'Exo 2', sans-serif; font-weight: 700; color: #f9fafb; font-size: 18px;">Create Club</div>
        <div style="width: 40px;"></div>
      </div>

      <div style="flex: 1; overflow-y: auto; padding: 20px;">
        <div id="cc-error" style="display: none; background: rgba(239,68,68,0.1); border: 1px solid #ef4444; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; color: #ef4444; font-size: 13px; font-family: 'Nunito', sans-serif;"></div>

        <form id="create-club-form" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label class="cc-label">Club Name</label>
            <input type="text" id="cc-name" class="cc-input" placeholder="Enter club name" required>
          </div>

          <div>
            <label class="cc-label">Description</label>
            <textarea id="cc-description" class="cc-input" placeholder="Describe your club..." rows="4" required
              style="resize: vertical; min-height: 100px;"></textarea>
          </div>

          <div>
            <label class="cc-label">Location</label>
            <input type="text" id="cc-location" class="cc-input" placeholder="City or area" required>
          </div>

          <div style="display: flex; align-items: center; gap: 12px; padding: 4px 0;">
            <div class="cc-toggle-track" id="cc-private-toggle">
              <div class="cc-toggle-thumb"></div>
            </div>
            <input type="checkbox" id="cc-private" style="display: none;">
            <label style="color: #9ca3af; font-size: 14px; font-family: 'Nunito', sans-serif; cursor: pointer;" id="cc-private-label">
              Private Club — members need approval
            </label>
          </div>

          <button type="submit" id="cc-submit-btn"
            style="background: #E53935; border: none; border-radius: 24px; height: 48px; color: #fff; font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 16px; cursor: pointer; margin-top: 8px; letter-spacing: 1px; width: 100%;">
            Create Club
          </button>
        </form>
      </div>
    </div>
  `;
}

export function mount() {
  const backBtn = document.getElementById('cc-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => navigate('/clubs'));
  }

  const toggle = document.getElementById('cc-private-toggle');
  const checkbox = document.getElementById('cc-private');
  const label = document.getElementById('cc-private-label');

  if (toggle && checkbox) {
    const togglePrivate = () => {
      checkbox.checked = !checkbox.checked;
      toggle.classList.toggle('active', checkbox.checked);
    };
    toggle.addEventListener('click', togglePrivate);
    if (label) label.addEventListener('click', togglePrivate);
  }

  const form = document.getElementById('create-club-form');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }
}

async function handleSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('cc-name').value.trim();
  const description = document.getElementById('cc-description').value.trim();
  const location = document.getElementById('cc-location').value.trim();
  const isPrivate = document.getElementById('cc-private').checked;
  const btn = document.getElementById('cc-submit-btn');
  const errorEl = document.getElementById('cc-error');

  errorEl.style.display = 'none';

  if (!name || !description || !location) {
    errorEl.textContent = 'Please fill in all required fields.';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating...';
  btn.style.opacity = '0.7';

  try {
    const res = await api.post('/api/clubs', {
      name,
      description,
      location,
      isPrivate,
    });

    if (res.success) {
      const clubId = res.data._id || res.data.id;
      navigate(`/clubs/${clubId}`);
    } else {
      errorEl.textContent = res.error?.message || 'Failed to create club. Please try again.';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = 'Network error. Please check your connection.';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Club';
    btn.style.opacity = '1';
  }
}
