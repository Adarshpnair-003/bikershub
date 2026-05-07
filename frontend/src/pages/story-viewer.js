/**
 * Story Viewer — full-screen, progress bars at top, tap right/left to advance/back.
 * Routes here as /stories/:userId — fetches that user's active stories.
 */

import { storyApi } from '../utils/storyApi.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser } from '../utils/auth.js';

const CLOSE_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const TRASH_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

const STORY_DURATION_MS = 5000;
let progressTimer = null;
let currentIndex = 0;
let stories = [];
let viewerUserId = null;

export function render() {
  return `
    <style>
      .sv-wrap {
        position: fixed; inset: 0; z-index: 100;
        background: #000; color: #F3F3F3; font-family: 'Poppins', sans-serif;
        display: flex; flex-direction: column;
      }
      .sv-progress-row {
        display: flex; gap: 4px; padding: 12px 12px 4px;
        position: relative; z-index: 3;
      }
      .sv-progress {
        flex: 1; height: 3px; background: rgba(255,255,255,0.25);
        border-radius: 2px; overflow: hidden;
      }
      .sv-progress-fill {
        height: 100%; width: 0%; background: #fff;
        transition: width 0.1s linear;
      }
      .sv-progress.done .sv-progress-fill { width: 100%; }
      .sv-progress.active .sv-progress-fill { transition: width linear; }
      .sv-header {
        display: flex; align-items: center; gap: 10px;
        padding: 4px 14px 10px; position: relative; z-index: 3;
      }
      .sv-author-link {
        display: flex; align-items: center; gap: 10px;
        color: #fff; text-decoration: none; flex: 1; min-width: 0;
      }
      .sv-avatar {
        width: 32px; height: 32px; border-radius: 50%;
        background: #343434; overflow: hidden; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 13px;
      }
      .sv-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .sv-name { font-weight: 600; font-size: 14px; }
      .sv-time { font-size: 12px; color: rgba(255,255,255,0.65); }
      .sv-close, .sv-delete {
        background: transparent; border: none; color: #fff;
        width: 36px; height: 36px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
      }
      .sv-close:active, .sv-delete:active { background: rgba(255,255,255,0.12); }

      .sv-stage {
        flex: 1; position: relative; overflow: hidden;
      }
      .sv-media {
        position: absolute; inset: 0;
        display: flex; align-items: center; justify-content: center;
        background: #000;
      }
      .sv-media img, .sv-media video {
        max-width: 100%; max-height: 100%;
        object-fit: contain;
      }
      .sv-caption {
        position: absolute; bottom: 26px; left: 14px; right: 14px;
        font-size: 14px; line-height: 1.4;
        background: rgba(0,0,0,0.4);
        padding: 10px 14px; border-radius: 10px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      }
      .sv-tap-zones {
        position: absolute; inset: 0; display: flex; z-index: 2;
      }
      .sv-tap { flex: 1; }
      .sv-tap.left { width: 30%; flex: none; }
      .sv-tap.right { width: 70%; flex: none; }

      .sv-empty, .sv-loading {
        flex: 1; display: flex; align-items: center; justify-content: center;
        color: rgba(255,255,255,0.6); font-size: 14px;
      }

      .sv-viewers {
        padding: 12px 16px; font-size: 12px; color: rgba(255,255,255,0.65);
        background: rgba(0,0,0,0.55);
      }
    </style>

    <div class="sv-wrap" id="sv-wrap">
      <div class="sv-progress-row" id="sv-progress-row"></div>
      <div class="sv-header" id="sv-header">
        <div class="sv-loading" style="flex:1; padding:0;">Loading…</div>
      </div>
      <div class="sv-stage" id="sv-stage"></div>
    </div>
  `;
}

function timeAgoShort(d) {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  return `${hr}h`;
}

function escape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function mount(ctx) {
  viewerUserId = ctx?.params?.userId || null;
  if (!viewerUserId) {
    document.getElementById('sv-stage').innerHTML = '<div class="sv-empty">No user.</div>';
    return;
  }
  loadStories();
}

async function loadStories() {
  try {
    const res = await storyApi.byUser(viewerUserId);
    stories = (res?.success && Array.isArray(res.data)) ? res.data : [];
  } catch {
    stories = [];
  }
  if (stories.length === 0) {
    const stage = document.getElementById('sv-stage');
    if (stage) stage.innerHTML = '<div class="sv-empty">No stories.</div>';
    return;
  }
  currentIndex = 0;
  renderProgress();
  renderHeader();
  showCurrent();
}

function renderProgress() {
  const row = document.getElementById('sv-progress-row');
  if (!row) return;
  row.innerHTML = stories.map((_, i) => {
    let cls = '';
    if (i < currentIndex) cls = 'done';
    else if (i === currentIndex) cls = 'active';
    return `<div class="sv-progress ${cls}"><div class="sv-progress-fill"></div></div>`;
  }).join('');
}

function renderHeader() {
  const header = document.getElementById('sv-header');
  if (!header) return;
  const story = stories[currentIndex];
  if (!story) return;
  const u = story.user || {};
  const username = u.username || 'rider';
  const me = getCurrentUser();
  const isMine = String(u._id || u.id) === String(me?.id);
  const avatarHtml = u.profilePic
    ? `<img src="${escape(u.profilePic)}" alt="${escape(username)}">`
    : escape(username.charAt(0).toUpperCase());
  header.innerHTML = `
    <a class="sv-author-link" href="#/user/${escape(String(u._id || u.id || ''))}">
      <div class="sv-avatar">${avatarHtml}</div>
      <div style="min-width:0;">
        <div class="sv-name">${escape(username)}</div>
        <div class="sv-time">${timeAgoShort(story.createdAt)}</div>
      </div>
    </a>
    ${isMine ? `<button class="sv-delete" id="sv-delete" aria-label="Delete">${TRASH_ICON}</button>` : ''}
    <button class="sv-close" id="sv-close" aria-label="Close">${CLOSE_ICON}</button>
  `;

  document.getElementById('sv-close')?.addEventListener('click', closeViewer);
  document.getElementById('sv-delete')?.addEventListener('click', async () => {
    if (!confirm('Delete this story?')) return;
    try {
      await storyApi.remove(story._id);
      stories.splice(currentIndex, 1);
      if (stories.length === 0) { closeViewer(); return; }
      if (currentIndex >= stories.length) currentIndex = stories.length - 1;
      renderProgress();
      renderHeader();
      showCurrent();
    } catch {
      alert('Failed to delete.');
    }
  });
}

function showCurrent() {
  clearTimer();
  const stage = document.getElementById('sv-stage');
  const story = stories[currentIndex];
  if (!stage || !story) return;

  const isVideo = story.media?.type === 'video';
  const mediaHtml = isVideo
    ? `<video src="${escape(story.media.url)}" autoplay playsinline muted></video>`
    : `<img src="${escape(story.media.url)}" alt="">`;

  stage.innerHTML = `
    <div class="sv-media">${mediaHtml}</div>
    ${story.caption ? `<div class="sv-caption">${escape(story.caption)}</div>` : ''}
    <div class="sv-tap-zones">
      <button class="sv-tap left" id="sv-tap-left" aria-label="Previous"></button>
      <button class="sv-tap right" id="sv-tap-right" aria-label="Next"></button>
    </div>
  `;

  document.getElementById('sv-tap-left')?.addEventListener('click', prev);
  document.getElementById('sv-tap-right')?.addEventListener('click', next);

  // Mark as viewed (best-effort)
  storyApi.markViewed(story._id).catch(() => {});

  // Animate progress for current story
  startProgress();
}

function startProgress() {
  const row = document.getElementById('sv-progress-row');
  if (!row) return;
  const fills = row.querySelectorAll('.sv-progress-fill');
  fills.forEach((f, i) => {
    if (i < currentIndex) f.style.width = '100%';
    else if (i > currentIndex) f.style.width = '0%';
    else { f.style.width = '0%'; f.style.transition = 'none'; }
  });
  // Force reflow then animate
  if (fills[currentIndex]) {
    requestAnimationFrame(() => {
      fills[currentIndex].style.transition = `width ${STORY_DURATION_MS}ms linear`;
      fills[currentIndex].style.width = '100%';
    });
  }
  progressTimer = setTimeout(next, STORY_DURATION_MS);
}

function clearTimer() {
  if (progressTimer) { clearTimeout(progressTimer); progressTimer = null; }
}

function next() {
  if (currentIndex < stories.length - 1) {
    currentIndex++;
    renderProgress();
    renderHeader();
    showCurrent();
  } else {
    closeViewer();
  }
}

function prev() {
  if (currentIndex > 0) {
    currentIndex--;
    renderProgress();
    renderHeader();
    showCurrent();
  }
}

function closeViewer() {
  clearTimer();
  navigate('/home');
}

export function cleanup() {
  clearTimer();
  stories = [];
  currentIndex = 0;
  viewerUserId = null;
}
