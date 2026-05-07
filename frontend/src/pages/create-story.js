/**
 * Create Story page — pick a photo, optional caption, post (auto-expires in 24h).
 */

import { storyApi } from '../utils/storyApi.js';
import { navigate } from '../utils/router.js';

const BACK_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>`;
const CAMERA_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

let blobUrl = null;

export function render() {
  return `
    <style>
      .cs-wrap { min-height: 100dvh; background: #0C0C0C; color: #F3F3F3; font-family: 'Poppins', sans-serif; padding-bottom: 40px; }
      .cs-nav { position: sticky; top: 0; z-index: 10; background: #0C0C0C; border-bottom: 1px solid rgba(243,243,243,0.06); display: flex; align-items: center; padding: 10px 12px; gap: 8px; }
      .cs-back { width: 40px; height: 40px; border-radius: 50%; background: transparent; border: none; color: #F3F3F3; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .cs-back:active { background: rgba(243,243,243,0.06); }
      .cs-title { flex: 1; font-size: 16px; font-weight: 700; }
      .cs-post { background: transparent; border: none; color: #E53935; font-size: 14px; font-weight: 700; padding: 8px 12px; cursor: pointer; font-family: 'Poppins', sans-serif; }
      .cs-post:disabled { opacity: 0.4; cursor: not-allowed; }

      .cs-frame { padding: 18px 16px 8px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
      .cs-canvas { width: 100%; max-width: 360px; aspect-ratio: 9/16; border-radius: 14px; background: #1E1E1E; border: 1px dashed rgba(243,243,243,0.18); overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(243,243,243,0.5); }
      .cs-canvas img, .cs-canvas video { width: 100%; height: 100%; object-fit: cover; display: block; }
      .cs-pick-cta { display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 13px; }
      .cs-replace { background: transparent; border: none; color: #E53935; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif; padding: 4px 8px; }

      .cs-caption-wrap { padding: 10px 16px; }
      .cs-caption {
        width: 100%; box-sizing: border-box;
        background: #1E1E1E; border: 1px solid rgba(243,243,243,0.08);
        border-radius: 12px; color: #F3F3F3; padding: 12px 14px;
        font-family: 'Poppins', sans-serif; font-size: 14px; outline: none;
      }
      .cs-caption:focus { border-color: #E53935; }

      .cs-error { margin: 0 16px 8px; padding: 10px 12px; border-radius: 10px; background: rgba(229,57,53,0.10); color: #E53935; font-size: 13px; font-weight: 500; }
      .cs-meta { padding: 4px 16px; font-size: 12px; color: rgba(243,243,243,0.5); }
    </style>

    <div class="cs-wrap">
      <header class="cs-nav">
        <button class="cs-back" id="cs-back" aria-label="Back">${BACK_ICON}</button>
        <div class="cs-title">New Story</div>
        <button class="cs-post" id="cs-post" disabled>Share</button>
      </header>

      <section class="cs-frame">
        <div class="cs-canvas" id="cs-canvas">
          <div class="cs-pick-cta">${CAMERA_ICON}<span>Tap to choose a photo</span></div>
        </div>
        <button class="cs-replace" id="cs-replace" type="button" style="display:none;">Replace</button>
        <input type="file" id="cs-file" accept="image/*,video/*" style="display:none;" />
      </section>

      <div id="cs-error-wrap"></div>

      <div class="cs-caption-wrap">
        <input class="cs-caption" id="cs-caption" type="text" maxlength="200" placeholder="Add a caption (optional)" />
      </div>
      <div class="cs-meta">Stories disappear after 24 hours.</div>
    </div>
  `;
}

export function mount() {
  const $ = (id) => document.getElementById(id);
  const back = $('cs-back');
  const post = $('cs-post');
  const canvas = $('cs-canvas');
  const replace = $('cs-replace');
  const fileInput = $('cs-file');
  const captionEl = $('cs-caption');
  const errorWrap = $('cs-error-wrap');

  let selectedFile = null;

  if (back) back.addEventListener('click', () => navigate('/home'));

  function showError(msg) {
    if (errorWrap) errorWrap.innerHTML = `<div class="cs-error">${msg}</div>`;
  }
  function clearError() {
    if (errorWrap) errorWrap.innerHTML = '';
  }

  function pick() { fileInput?.click(); }
  canvas?.addEventListener('click', pick);
  replace?.addEventListener('click', pick);

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    selectedFile = file;
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(file);
    if (file.type.startsWith('video')) {
      canvas.innerHTML = `<video src="${blobUrl}" autoplay muted loop playsinline></video>`;
    } else {
      canvas.innerHTML = `<img src="${blobUrl}" alt="">`;
    }
    if (replace) replace.style.display = '';
    if (post) post.disabled = false;
    clearError();
  });

  post?.addEventListener('click', async () => {
    if (!selectedFile) return;
    post.disabled = true;
    post.textContent = 'Sharing…';
    try {
      const fd = new FormData();
      fd.append('media', selectedFile);
      const caption = (captionEl?.value || '').trim();
      if (caption) fd.append('caption', caption);

      const res = await storyApi.create(fd);
      if (res?.success) {
        navigate('/home');
      } else {
        showError(res?.error?.message || 'Failed to share story.');
        post.disabled = false;
        post.textContent = 'Share';
      }
    } catch {
      showError('Network error. Please try again.');
      post.disabled = false;
      post.textContent = 'Share';
    }
  });
}

export function cleanup() {
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    blobUrl = null;
  }
}
