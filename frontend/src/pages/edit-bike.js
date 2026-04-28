/**
 * Edit Bike page — same form shape as add-bike, prefilled. v2 flat.
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
      .eb-wrap { min-height: 100dvh; background: #0C0C0C; color: #F3F3F3; font-family: 'Poppins', sans-serif; padding-bottom: 40px; }
      .eb-nav { position: sticky; top: 0; z-index: 10; background: #0C0C0C; border-bottom: 1px solid rgba(243,243,243,0.06); display: flex; align-items: center; padding: 10px 12px; gap: 8px; }
      .eb-back { width: 40px; height: 40px; border-radius: 50%; background: transparent; border: none; color: #F3F3F3; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .eb-back:active { background: rgba(243,243,243,0.06); }
      .eb-title { flex: 1; font-size: 16px; font-weight: 700; }
      .eb-save { background: transparent; border: none; color: #E53935; font-size: 14px; font-weight: 700; padding: 8px 10px; cursor: pointer; font-family: 'Poppins', sans-serif; }
      .eb-save:disabled { opacity: 0.4; cursor: not-allowed; }

      .eb-photo-picker { padding: 18px 16px 6px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
      .eb-photo-frame { width: 100%; max-width: 320px; aspect-ratio: 4/3; border-radius: 12px; background: #1E1E1E; border: 1px dashed rgba(243,243,243,0.18); overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(243,243,243,0.5); }
      .eb-photo-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .eb-photo-cta { display: flex; align-items: center; gap: 8px; font-size: 13px; }
      .eb-photo-replace { background: transparent; border: none; color: #E53935; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif; padding: 4px 8px; }

      .eb-error { margin: 0 16px 8px; padding: 10px 12px; border-radius: 10px; background: rgba(229,57,53,0.10); color: #E53935; font-size: 13px; font-weight: 500; }

      .eb-field { display: flex; flex-direction: column; padding: 12px 16px; border-bottom: 1px solid rgba(243,243,243,0.06); gap: 4px; }
      .eb-label { font-size: 12px; color: rgba(243,243,243,0.5); font-weight: 500; letter-spacing: 0.02em; text-transform: uppercase; }
      .eb-input { background: transparent; border: none; outline: none; padding: 6px 0; color: #F3F3F3; font-size: 16px; font-weight: 500; font-family: 'Poppins', sans-serif; width: 100%; }
      .eb-input::placeholder { color: rgba(243,243,243,0.35); }

      .eb-types { display: flex; flex-wrap: wrap; gap: 8px; padding: 6px 0 4px; }
      .eb-type { background: transparent; border: 1px solid rgba(243,243,243,0.18); color: rgba(243,243,243,0.85); font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 500; padding: 7px 12px; border-radius: 999px; cursor: pointer; text-transform: capitalize; }
      .eb-type.active { background: #E53935; border-color: #E53935; color: #fff; }
    </style>

    <div class="eb-wrap">
      <header class="eb-nav">
        <button class="eb-back" id="eb-back" aria-label="Back">${BACK_ICON}</button>
        <div class="eb-title">Edit bike</div>
        <button class="eb-save" id="eb-save">Save</button>
      </header>

      <section class="eb-photo-picker">
        <div class="eb-photo-frame" id="eb-photo-frame">
          <div class="eb-photo-cta">${CAMERA_ICON}<span>Loading…</span></div>
        </div>
        <button class="eb-photo-replace" id="eb-photo-replace" type="button">Replace photo</button>
        <input type="file" id="eb-file" accept="image/*" style="display:none;" />
      </section>

      <div id="eb-error-wrap"></div>

      <form class="eb-form" id="eb-form" novalidate>
        <div class="eb-field">
          <label class="eb-label" for="eb-brand">Brand</label>
          <input class="eb-input" id="eb-brand" type="text" maxlength="50" />
        </div>
        <div class="eb-field">
          <label class="eb-label" for="eb-model">Model</label>
          <input class="eb-input" id="eb-model" type="text" maxlength="50" />
        </div>
        <div class="eb-field">
          <label class="eb-label" for="eb-year">Year</label>
          <input class="eb-input" id="eb-year" type="number" inputmode="numeric" min="1900" max="${new Date().getFullYear() + 1}" />
        </div>
        <div class="eb-field">
          <label class="eb-label">Type</label>
          <div class="eb-types" id="eb-types">
            ${TYPES.map((t) => `<button type="button" class="eb-type" data-type="${t}">${t}</button>`).join('')}
          </div>
        </div>
        <div class="eb-field">
          <label class="eb-label" for="eb-cc">Engine cc</label>
          <input class="eb-input" id="eb-cc" type="number" inputmode="numeric" min="50" max="3000" />
        </div>
        <div class="eb-field">
          <label class="eb-label" for="eb-color">Color</label>
          <input class="eb-input" id="eb-color" type="text" maxlength="30" />
        </div>
        <div class="eb-field">
          <label class="eb-label" for="eb-nickname">Nickname (optional)</label>
          <input class="eb-input" id="eb-nickname" type="text" maxlength="40" />
        </div>
      </form>
    </div>
  `;
}

export function mount(ctx) {
  const bikeId = ctx?.params?.id;
  const $ = (id) => document.getElementById(id);

  const back = $('eb-back');
  const save = $('eb-save');
  const fileInput = $('eb-file');
  const photoFrame = $('eb-photo-frame');
  const replaceBtn = $('eb-photo-replace');
  const types = $('eb-types');
  const errorWrap = $('eb-error-wrap');

  let selectedFile = null;
  let selectedType = '';

  if (back) back.addEventListener('click', () => navigate('/profile'));

  loadBike();

  async function loadBike() {
    if (!bikeId) return;
    try {
      const res = await bikeApi.get(bikeId);
      if (res.success && res.data) {
        const b = res.data;
        $('eb-brand').value = b.brand || '';
        $('eb-model').value = b.model || '';
        $('eb-year').value = b.year || '';
        $('eb-cc').value = b.engineCC || '';
        $('eb-color').value = b.color || '';
        $('eb-nickname').value = b.nickname || '';
        selectedType = b.type || '';
        types?.querySelectorAll('.eb-type').forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.type === selectedType);
        });
        if (b.photo?.url) {
          photoFrame.innerHTML = `<img src="${b.photo.url}" alt="">`;
        }
      }
    } catch {
      showError('Failed to load bike data.');
    }
  }

  if (replaceBtn && fileInput) {
    replaceBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      selectedFile = file;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(file);
      photoFrame.innerHTML = `<img src="${blobUrl}" alt="">`;
    });
  }

  if (types) {
    types.addEventListener('click', (e) => {
      const btn = e.target.closest('.eb-type');
      if (!btn) return;
      selectedType = btn.dataset.type;
      types.querySelectorAll('.eb-type').forEach((b) => b.classList.toggle('active', b === btn));
    });
  }

  function showError(msg) { if (errorWrap) errorWrap.innerHTML = `<div class="eb-error">${msg}</div>`; }
  function clearError() { if (errorWrap) errorWrap.innerHTML = ''; }

  if (save) {
    save.addEventListener('click', async () => {
      clearError();
      save.disabled = true;
      save.textContent = 'Saving';
      try {
        const fd = new FormData();
        if (selectedFile) fd.append('photo', selectedFile);
        fd.append('brand', $('eb-brand').value.trim());
        fd.append('model', $('eb-model').value.trim());
        fd.append('year', $('eb-year').value.trim());
        fd.append('type', selectedType);
        fd.append('engineCC', $('eb-cc').value.trim());
        fd.append('color', $('eb-color').value.trim());
        fd.append('nickname', $('eb-nickname').value.trim());

        const res = await bikeApi.update(bikeId, fd);
        if (res.success) navigate('/profile');
        else {
          showError(res.error?.message || 'Failed to update bike.');
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
