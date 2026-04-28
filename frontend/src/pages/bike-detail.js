/**
 * Bike Detail page — v2 flat. Hero photo + flat divider rows + owner actions.
 */

import { bikeApi } from '../utils/bikeApi.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser } from '../utils/auth.js';

const BACK_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>`;

export function render() {
  return `
    <style>
      .bd-wrap { min-height: 100dvh; background: #0C0C0C; color: #F3F3F3; font-family: 'Poppins', sans-serif; padding-bottom: 40px; }
      .bd-nav { position: sticky; top: 0; z-index: 10; background: #0C0C0C; border-bottom: 1px solid rgba(243,243,243,0.06); display: flex; align-items: center; padding: 10px 12px; gap: 8px; }
      .bd-back { width: 40px; height: 40px; border-radius: 50%; background: transparent; border: none; color: #F3F3F3; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .bd-back:active { background: rgba(243,243,243,0.06); }
      .bd-title { flex: 1; font-size: 16px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      .bd-hero { width: 100%; max-height: 60vh; aspect-ratio: 4/3; background: #1E1E1E; }
      .bd-hero img { width: 100%; height: 100%; object-fit: cover; display: block; }

      .bd-name { padding: 16px 20px 4px; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
      .bd-nickname { padding: 0 20px 12px; font-size: 14px; color: rgba(243,243,243,0.6); }

      .bd-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid rgba(243,243,243,0.06); }
      .bd-row-label { font-size: 12px; color: rgba(243,243,243,0.5); text-transform: uppercase; letter-spacing: 0.02em; }
      .bd-row-value { font-size: 14.5px; color: #F3F3F3; font-weight: 600; text-transform: capitalize; }

      .bd-actions { display: flex; flex-direction: column; gap: 8px; padding: 18px 20px; }
      .bd-btn { width: 100%; height: 44px; border-radius: 10px; font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
      .bd-btn.primary { background: #E53935; color: #fff; border-color: #E53935; }
      .bd-btn.outline { background: transparent; color: #F3F3F3; border-color: rgba(243,243,243,0.18); }
      .bd-btn.danger { background: transparent; color: #E53935; border-color: rgba(229,57,53,0.35); }
      .bd-btn:active { opacity: 0.7; }

      .bd-loading { padding: 40px 20px; text-align: center; color: rgba(243,243,243,0.5); }
    </style>

    <div class="bd-wrap">
      <header class="bd-nav">
        <button class="bd-back" id="bd-back" aria-label="Back">${BACK_ICON}</button>
        <div class="bd-title" id="bd-title-text">Bike</div>
      </header>
      <div id="bd-content" class="bd-loading">Loading…</div>
    </div>
  `;
}

export function mount(ctx) {
  const bikeId = ctx?.params?.bikeId;
  const userId = ctx?.params?.userId;

  document.getElementById('bd-back')?.addEventListener('click', () => {
    if (userId) navigate('/user/' + userId); else navigate('/profile');
  });

  if (bikeId) loadBike(bikeId);

  async function loadBike(id) {
    try {
      const res = await bikeApi.get(id);
      if (!res.success || !res.data) {
        renderError(res.error?.message || 'Bike not found.');
        return;
      }
      renderBike(res.data);
    } catch {
      renderError('Network error.');
    }
  }

  function renderBike(b) {
    const me = getCurrentUser();
    const isOwner = me && b.owner && String(me.id || me._id) === String(b.owner._id || b.owner);
    const photoUrl = b.photo?.url;
    const titleText = `${b.brand || ''} ${b.model || ''}`.trim();
    document.getElementById('bd-title-text').textContent = titleText;

    const html = `
      <div class="bd-hero">
        ${photoUrl ? `<img src="${photoUrl}" alt="${escapeText(titleText)}">` : ''}
      </div>
      <div class="bd-name">${escapeText(titleText)}</div>
      ${b.nickname ? `<div class="bd-nickname">"${escapeText(b.nickname)}"</div>` : ''}
      <div class="bd-row"><span class="bd-row-label">Year</span><span class="bd-row-value">${b.year || ''}</span></div>
      <div class="bd-row"><span class="bd-row-label">Type</span><span class="bd-row-value">${escapeText(b.type || '')}</span></div>
      <div class="bd-row"><span class="bd-row-label">Engine</span><span class="bd-row-value">${b.engineCC || ''} cc</span></div>
      <div class="bd-row"><span class="bd-row-label">Color</span><span class="bd-row-value">${escapeText(b.color || '')}</span></div>
      ${isOwner ? `
        <div class="bd-actions">
          <button class="bd-btn primary" id="bd-edit">Edit</button>
          ${b.isPrimary ? '' : '<button class="bd-btn outline" id="bd-primary">Set as current ride</button>'}
          <button class="bd-btn danger" id="bd-delete">Delete</button>
        </div>
      ` : ''}
    `;
    const content = document.getElementById('bd-content');
    content.className = '';
    content.innerHTML = html;

    if (isOwner) {
      document.getElementById('bd-edit')?.addEventListener('click', () => navigate('/edit-bike/' + b._id));
      document.getElementById('bd-primary')?.addEventListener('click', async () => {
        try {
          await bikeApi.setPrimary(b._id);
          navigate('/profile');
        } catch {
          alert('Failed to set as current ride.');
        }
      });
      document.getElementById('bd-delete')?.addEventListener('click', async () => {
        if (!confirm('Delete this bike? This cannot be undone.')) return;
        try {
          const r = await bikeApi.remove(b._id);
          if (r.success) navigate('/profile'); else alert(r.error?.message || 'Failed to delete.');
        } catch {
          alert('Network error.');
        }
      });
    }
  }

  function renderError(msg) {
    const content = document.getElementById('bd-content');
    content.className = 'bd-loading';
    content.textContent = msg;
  }
}

export function cleanup() {
  // No persistent state — no-op for uniformity with other pages.
}

function escapeText(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
