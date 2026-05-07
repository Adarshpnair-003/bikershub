/**
 * Story tray — horizontal row of story circles. Use on home feed.
 *
 *   const html = renderStoryTray();
 *   container.innerHTML = html;
 *   await mountStoryTray(container, { onCompose, onOpen });
 */

import { storyApi } from '../utils/storyApi.js';
import { getCurrentUser } from '../utils/auth.js';

function escape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function renderStoryTray() {
  return `
    <div class="story-tray" id="story-tray">
      <div class="story-tray-loading">Loading…</div>
    </div>
  `;
}

export async function mountStoryTray({ onCompose, onOpen } = {}) {
  const tray = document.getElementById('story-tray');
  if (!tray) return;

  const me = getCurrentUser();
  const myId = me?.id;

  let groups = [];
  try {
    const res = await storyApi.feed();
    groups = (res?.success && Array.isArray(res.data)) ? res.data : [];
  } catch {
    groups = [];
  }

  // Always show the user's compose tile first
  const myGroup = groups.find((g) => String(g.user._id || g.user.id) === String(myId));
  const otherGroups = groups.filter((g) => String(g.user._id || g.user.id) !== String(myId));

  const composeHtml = `
    <button class="story-item compose" type="button" data-action="compose">
      <div class="story-ring compose">
        ${myGroup ? `<img src="${escape(myGroup.user.profilePic || '')}" alt="" onerror="this.style.display='none'"><span class="story-ring-plus">+</span>` : '<span class="story-ring-plus">+</span>'}
      </div>
      <div class="story-name">Your story</div>
    </button>
  `;

  const groupsHtml = otherGroups.map((g) => {
    const u = g.user || {};
    const username = u.username || 'rider';
    const avatar = u.profilePic
      ? `<img src="${escape(u.profilePic)}" alt="${escape(username)}">`
      : `<span class="story-ring-fallback">${escape(username.charAt(0).toUpperCase())}</span>`;
    return `
      <button class="story-item" type="button" data-user-id="${escape(String(u._id || u.id || ''))}">
        <div class="story-ring ${g.allViewed ? 'viewed' : 'fresh'}">${avatar}</div>
        <div class="story-name">${escape(username)}</div>
      </button>
    `;
  }).join('');

  tray.innerHTML = `<div class="story-tray-row">${composeHtml}${groupsHtml}</div>`;

  tray.querySelectorAll('.story-item').forEach((el) => {
    el.addEventListener('click', () => {
      const action = el.dataset.action;
      const uid = el.dataset.userId;
      if (action === 'compose') {
        if (myGroup) {
          // Tap own tile when there are stories — open viewer for own stories
          if (typeof onOpen === 'function') onOpen(String(myId));
        } else if (typeof onCompose === 'function') {
          onCompose();
        }
      } else if (uid && typeof onOpen === 'function') {
        onOpen(uid);
      }
    });
  });

  // Long-press your tile to compose even when stories exist
  if (myGroup) {
    const ownTile = tray.querySelector('.story-item.compose');
    if (ownTile) {
      let pressTimer = null;
      const startPress = () => {
        pressTimer = setTimeout(() => {
          if (typeof onCompose === 'function') onCompose();
        }, 500);
      };
      const endPress = () => clearTimeout(pressTimer);
      ownTile.addEventListener('mousedown', startPress);
      ownTile.addEventListener('touchstart', startPress);
      ownTile.addEventListener('mouseup', endPress);
      ownTile.addEventListener('mouseleave', endPress);
      ownTile.addEventListener('touchend', endPress);
    }
  }
}
