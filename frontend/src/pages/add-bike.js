/**
 * Add Bike page — v2 flat. Required photo, brand, model, year, type, engineCC, color, optional nickname.
 */

import { bikeApi } from '../utils/bikeApi.js';
import { navigate } from '../utils/router.js';

const BACK_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>`;
const CAMERA_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

const TYPES = ["sport", "cruiser", "adventure", "naked", "tourer", "off-road", "scooter", "other"];

let blobUrl = null;

export function render() {
  return `
    <style>
      .ab-wrap { min-height: 100dvh; background: #0C0C0C; color: #F3F3F3; font-family: 'Poppins', sans-serif; padding-bottom: 40px; }
      .ab-nav { position: sticky; top: 0; z-index: 10; background: #0C0C0C; border-bottom: 1px solid rgba(243,243,243,0.06); display: flex; align-items: center; padding: 10px 12px; gap: 8px; }
      .ab-back { width: 40px; height: 40px; border-radius: 50%; background: transparent; border: none; color: #F3F3F3; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .ab-back:active { background: rgba(243,243,243,0.06); }
      .ab-title { flex: 1; font-size: 16px; font-weight: 700; }
      .ab-save { background: transparent; border: none; color: #E53935; font-size: 14px; font-weight: 700; padding: 8px 10px; cursor: pointer; font-family: 'Poppins', sans-serif; }
      .ab-save:disabled { opacity: 0.4; cursor: not-allowed; }

      .ab-photo-picker { padding: 18px 16px 6px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
      .ab-photo-frame { width: 100%; max-width: 320px; aspect-ratio: 4/3; border-radius: 12px; background: #1E1E1E; border: 1px dashed rgba(243,243,243,0.18); overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(243,243,243,0.5); }
      .ab-photo-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .ab-photo-cta { display: flex; align-items: center; gap: 8px; font-size: 13px; }

      .ab-error { margin: 0 16px 8px; padding: 10px 12px; border-radius: 10px; background: rgba(229,57,53,0.10); color: #E53935; font-size: 13px; font-weight: 500; }

      .ab-field { display: flex; flex-direction: column; padding: 12px 16px; border-bottom: 1px solid rgba(243,243,243,0.06); gap: 4px; }
      .ab-label { font-size: 12px; color: rgba(243,243,243,0.5); font-weight: 500; letter-spacing: 0.02em; text-transform: uppercase; }
      .ab-input { background: transparent; border: none; outline: none; padding: 6px 0; color: #F3F3F3; font-size: 16px; font-weight: 500; font-family: 'Poppins', sans-serif; width: 100%; }
      .ab-input::placeholder { color: rgba(243,243,243,0.35); }

      .ab-types { display: flex; flex-wrap: wrap; gap: 8px; padding: 6px 0 4px; }
      .ab-type { background: transparent; border: 1px solid rgba(243,243,243,0.18); color: rgba(243,243,243,0.85); font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 500; padding: 7px 12px; border-radius: 999px; cursor: pointer; text-transform: capitalize; }
      .ab-type.active { background: #E53935; border-color: #E53935; color: #fff; }
    </style>

    <div class="ab-wrap">
      <header class="ab-nav">
        <button class="ab-back" id="ab-back" aria-label="Back">${BACK_ICON}</button>
        <div class="ab-title">New bike</div>
        <button class="ab-save" id="ab-save" disabled>Save</button>
      </header>

      <section class="ab-photo-picker">
        <div class="ab-photo-frame" id="ab-photo-frame">
          <div class="ab-photo-cta">${CAMERA_ICON}<span>Add photo</span></div>
        </div>
        <input type="file" id="ab-file" accept="image/*" style="display:none;" />
      </section>

      <div id="ab-error-wrap"></div>

      <form class="ab-form" id="ab-form" novalidate>
        <div class="ab-field">
          <label class="ab-label" for="ab-brand">Brand</label>
          <input class="ab-input" id="ab-brand" type="text" placeholder="Yamaha" maxlength="50" />
        </div>
        <div class="ab-field">
          <label class="ab-label" for="ab-model">Model</label>
          <input class="ab-input" id="ab-model" type="text" placeholder="MT-15" maxlength="50" />
        </div>
        <div class="ab-field">
          <label class="ab-label" for="ab-year">Year</label>
          <input class="ab-input" id="ab-year" type="number" inputmode="numeric" placeholder="2023" min="1900" max="${new Date().getFullYear() + 1}" />
        </div>
        <div class="ab-field">
          <label class="ab-label">Type</label>
          <div class="ab-types" id="ab-types">
            ${TYPES.map((t) => `<button type="button" class="ab-type" data-type="${t}">${t}</button>`).join('')}
          </div>
        </div>
        <div class="ab-field">
          <label class="ab-label" for="ab-cc">Engine cc</label>
          <input class="ab-input" id="ab-cc" type="number" inputmode="numeric" placeholder="155" min="50" max="3000" />
        </div>
        <div class="ab-field">
          <label class="ab-label" for="ab-color">Color</label>
          <input class="ab-input" id="ab-color" type="text" placeholder="Cyan" maxlength="30" />
        </div>
        <div class="ab-field">
          <label class="ab-label" for="ab-nickname">Nickname (optional)</label>
          <input class="ab-input" id="ab-nickname" type="text" placeholder="Beast" maxlength="40" />
        </div>
      </form>
    </div>
  `;
}

export function mount() {
  const $ = (id) => document.getElementById(id);
  const back = $('ab-back');
  const save = $('ab-save');
  const fileInput = $('ab-file');
  const photoFrame = $('ab-photo-frame');
  const errorWrap = $('ab-error-wrap');
  const types = $('ab-types');

  let selectedFile = null;
  let selectedType = '';

  if (back) back.addEventListener('click', () => navigate('/profile'));

  if (photoFrame && fileInput) {
    photoFrame.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      selectedFile = file;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(file);
      photoFrame.innerHTML = `<img src="${blobUrl}" alt="">`;
      updateSaveEnabled();
    });
  }

  if (types) {
    types.addEventListener('click', (e) => {
      const btn = e.target.closest('.ab-type');
      if (!btn) return;
      selectedType = btn.dataset.type;
      types.querySelectorAll('.ab-type').forEach((b) => b.classList.toggle('active', b === btn));
      updateSaveEnabled();
    });
  }

  ['ab-brand', 'ab-model', 'ab-year', 'ab-cc', 'ab-color'].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener('input', updateSaveEnabled);
  });

  function updateSaveEnabled() {
    const brand = $('ab-brand')?.value.trim();
    const model = $('ab-model')?.value.trim();
    const year = $('ab-year')?.value.trim();
    const cc = $('ab-cc')?.value.trim();
    const color = $('ab-color')?.value.trim();
    const ok = !!(selectedFile && brand && model && year && selectedType && cc && color);
    if (save) save.disabled = !ok;
  }

  function showError(msg) {
    if (errorWrap) errorWrap.innerHTML = `<div class="ab-error">${msg}</div>`;
  }
  function clearError() { if (errorWrap) errorWrap.innerHTML = ''; }

  if (save) {
    save.addEventListener('click', async () => {
      clearError();
      save.disabled = true;
      save.textContent = 'Saving';
      try {
        const fd = new FormData();
        fd.append('photo', selectedFile);
        fd.append('brand', $('ab-brand').value.trim());
        fd.append('model', $('ab-model').value.trim());
        fd.append('year', $('ab-year').value.trim());
        fd.append('type', selectedType);
        fd.append('engineCC', $('ab-cc').value.trim());
        fd.append('color', $('ab-color').value.trim());
        const nickname = $('ab-nickname').value.trim();
        if (nickname) fd.append('nickname', nickname);

        const res = await bikeApi.create(fd);
        if (res.success) navigate('/profile');
        else {
          showError(res.error?.message || 'Failed to save bike.');
          save.disabled = false;
          save.textContent = 'Save';
        }
      } catch {
        showError('Network error. Please try again.');
        save.disabled = false;
        save.textContent = 'Save';
      }
    });
  }
}

export function cleanup() {
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    blobUrl = null;
  }
}
