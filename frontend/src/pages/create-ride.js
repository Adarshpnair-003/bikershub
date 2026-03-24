/**
 * Create Ride page for Bikers Hub
 * Simple form to create a new ride
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';

const BACK_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;

export function render() {
  return `
    <div class="page-dark" style="display: flex; flex-direction: column; height: 100vh;">
      <div class="app-header">
        <button class="app-header-btn" id="cr-back-btn">${BACK_ICON}</button>
        <div class="app-header-title" style="flex: 1; text-align: center;">Create Ride</div>
        <div style="width: 40px;"></div>
      </div>

      <div style="flex: 1; overflow-y: auto; padding: 20px;">
        <div id="cr-error" style="display: none; background: rgba(239,68,68,0.1); border: 1px solid #ef4444; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; color: #ef4444; font-size: 13px;"></div>

        <form id="create-ride-form" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; font-size: 13px; color: #9ca3af; margin-bottom: 6px; font-family: 'Nunito', sans-serif;">Title</label>
            <input type="text" id="cr-title" placeholder="e.g. Weekend Mountain Ride"
              style="width: 100%; background: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 12px 16px; color: #f9fafb; font-family: 'Nunito', sans-serif; font-size: 14px; outline: none; box-sizing: border-box;" required>
          </div>

          <div>
            <label style="display: block; font-size: 13px; color: #9ca3af; margin-bottom: 6px; font-family: 'Nunito', sans-serif;">Start Location</label>
            <input type="text" id="cr-start" placeholder="e.g. Kochi, Kerala"
              style="width: 100%; background: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 12px 16px; color: #f9fafb; font-family: 'Nunito', sans-serif; font-size: 14px; outline: none; box-sizing: border-box;" required>
          </div>

          <div>
            <label style="display: block; font-size: 13px; color: #9ca3af; margin-bottom: 6px; font-family: 'Nunito', sans-serif;">Destination</label>
            <input type="text" id="cr-dest" placeholder="e.g. Munnar, Kerala"
              style="width: 100%; background: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 12px 16px; color: #f9fafb; font-family: 'Nunito', sans-serif; font-size: 14px; outline: none; box-sizing: border-box;" required>
          </div>

          <div>
            <label style="display: block; font-size: 13px; color: #9ca3af; margin-bottom: 6px; font-family: 'Nunito', sans-serif;">Date & Time</label>
            <input type="datetime-local" id="cr-date"
              style="width: 100%; background: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 12px 16px; color: #f9fafb; font-family: 'Nunito', sans-serif; font-size: 14px; outline: none; box-sizing: border-box; color-scheme: dark;" required>
          </div>

          <div>
            <label style="display: block; font-size: 13px; color: #9ca3af; margin-bottom: 6px; font-family: 'Nunito', sans-serif;">Max Participants</label>
            <input type="number" id="cr-max" min="2" max="100" value="10" placeholder="10"
              style="width: 100%; background: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 12px 16px; color: #f9fafb; font-family: 'Nunito', sans-serif; font-size: 14px; outline: none; box-sizing: border-box;" required>
          </div>

          <button type="submit" id="cr-submit-btn"
            style="background: #E53935; border: none; border-radius: 12px; padding: 14px; color: #fff; font-family: 'Exo 2', sans-serif; font-weight: 700; font-size: 16px; cursor: pointer; margin-top: 8px; letter-spacing: 1px;">
            CREATE RIDE
          </button>
        </form>
      </div>
    </div>
  `;
}

export function mount() {
  const backBtn = document.getElementById('cr-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => navigate('/clubs'));
  }

  const form = document.getElementById('create-ride-form');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }
}

async function handleSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('cr-title').value.trim();
  const start = document.getElementById('cr-start').value.trim();
  const dest = document.getElementById('cr-dest').value.trim();
  const date = document.getElementById('cr-date').value;
  const max = parseInt(document.getElementById('cr-max').value, 10);
  const btn = document.getElementById('cr-submit-btn');
  const errorEl = document.getElementById('cr-error');

  errorEl.style.display = 'none';

  if (!title || !start || !dest || !date) {
    errorEl.textContent = 'Please fill in all fields.';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'CREATING...';

  try {
    const res = await api.post('/api/rides', {
      title,
      description: `Ride from ${start} to ${dest}`,
      startLocation: start,
      destination: dest,
      rideDate: new Date(date).toISOString(),
      maxParticipants: max || 10,
    });

    if (res.success) {
      navigate('/clubs');
    } else {
      errorEl.textContent = res.error?.message || 'Failed to create ride. Please try again.';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = 'Network error. Please check your connection.';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'CREATE RIDE';
  }
}
