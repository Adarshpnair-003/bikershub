/**
 * Ride Detail page — v2 flat design.
 * Hero with title + status + countdown · route card · info rows ·
 * participants · sticky-bottom action button · map · completed stats.
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser, isGuest } from '../utils/auth.js';
import { socketManager } from '../utils/socket.js';

/* -- SVG Icons ---------------------------------------- */

const BACK_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>`;
const PIN_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
const FLAG_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`;
const ARROW_DOWN_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`;

/* -- State -------------------------------------------- */

let map = null;
let riderMarkers = {};
let routeLayer = null;
let locationHandler = null;
let rideId = null;

/* -- Helpers ------------------------------------------ */

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startTime, endTime) {
  if (!startTime || !endTime) return '--';
  const ms = new Date(endTime) - new Date(startTime);
  const totalMin = Math.floor(ms / 60000);
  const hrs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hrs > 0) return `${hrs}h ${min}m`;
  return `${min}m`;
}

function countdownText(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  const diffMs = target - now;
  if (diffMs <= 0) return null;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay >= 1) return `Starts in ${diffDay} day${diffDay > 1 ? 's' : ''}`;
  if (diffHr >= 1) return `Starts in ${diffHr} hour${diffHr > 1 ? 's' : ''}`;
  return `Starts in ${diffMin} min`;
}

function statusPill(status) {
  const map = {
    scheduled: { label: 'Upcoming', dot: '#3b82f6', bg: 'rgba(59,130,246,0.12)', text: '#7CB1FF' },
    active:    { label: 'Live',     dot: '#22c55e', bg: 'rgba(34,197,94,0.14)',  text: '#4ADE80' },
    live:      { label: 'Live',     dot: '#22c55e', bg: 'rgba(34,197,94,0.14)',  text: '#4ADE80' },
    completed: { label: 'Completed',dot: '#9ca3af', bg: 'rgba(156,163,175,0.12)', text: '#C9CFD8' },
  };
  const s = map[status] || map.scheduled;
  return `
    <span class="rd-status">
      <span class="rd-status-dot" style="background:${s.dot};"></span>
      <span style="color:${s.text};">${s.label}</span>
    </span>
  `.replace(/^\s+|\n/g, '');
}

/* -- Render ------------------------------------------- */

export function render(context = {}) {
  rideId = context.params?.id || null;

  return `
    <div class="rd-wrap">
      <style>
        .rd-wrap {
          min-height: 100dvh; background: #0C0C0C; color: #F3F3F3;
          font-family: 'Poppins', sans-serif; padding-bottom: 100px;
        }

        /* Header */
        .rd-nav {
          position: sticky; top: 0; z-index: 10; background: #0C0C0C;
          border-bottom: 1px solid rgba(243,243,243,0.06);
          display: flex; align-items: center; padding: 10px 12px; gap: 8px;
        }
        .rd-back {
          width: 40px; height: 40px; border-radius: 50%; background: transparent;
          border: none; color: #F3F3F3; display: flex; align-items: center;
          justify-content: center; cursor: pointer;
        }
        .rd-back:active { background: rgba(243,243,243,0.06); }
        .rd-nav-title {
          flex: 1; font-size: 16px; font-weight: 700;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        /* Hero */
        .rd-hero { padding: 22px 20px 14px; }
        .rd-title {
          font-size: 28px; font-weight: 800; letter-spacing: -0.5px;
          line-height: 1.15; color: #F3F3F3;
        }
        .rd-status-row {
          display: flex; align-items: center; gap: 10px;
          margin-top: 12px; flex-wrap: wrap;
        }
        .rd-status {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 11px; border-radius: 999px;
          font-size: 11.5px; font-weight: 700; letter-spacing: 0.3px;
          background: rgba(243,243,243,0.06);
        }
        .rd-status-dot {
          width: 6px; height: 6px; border-radius: 50%;
          box-shadow: 0 0 6px currentColor;
        }
        .rd-countdown {
          font-size: 12px; color: rgba(243,243,243,0.55);
          font-weight: 500;
        }
        .rd-desc {
          margin-top: 14px; font-size: 14px; line-height: 1.55;
          color: rgba(243,243,243,0.65);
        }

        /* Route hero card */
        .rd-route-card {
          margin: 18px 16px 6px; background: #1E1E1E; border-radius: 16px;
          padding: 16px 18px; display: flex; flex-direction: column; gap: 12px;
          border: 1px solid rgba(243,243,243,0.04);
        }
        .rd-route-row {
          display: flex; align-items: center; gap: 12px;
        }
        .rd-route-icon {
          width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .rd-route-icon.start { background: rgba(34,197,94,0.15); color: #4ADE80; }
        .rd-route-icon.dest  { background: rgba(229,57,53,0.15); color: #E53935; }
        .rd-route-text { min-width: 0; flex: 1; }
        .rd-route-label {
          font-size: 11px; color: rgba(243,243,243,0.45);
          text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600;
        }
        .rd-route-value {
          font-size: 15px; font-weight: 600; color: #F3F3F3; margin-top: 2px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .rd-route-divider {
          margin-left: 14px; color: rgba(243,243,243,0.25); display: flex;
        }

        /* Info rows (flat dividers, like bike-detail) */
        .rd-rows { margin-top: 14px; }
        .rd-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 20px; border-bottom: 1px solid rgba(243,243,243,0.06);
        }
        .rd-row-label {
          font-size: 12px; color: rgba(243,243,243,0.5);
          text-transform: uppercase; letter-spacing: 0.02em;
        }
        .rd-row-value {
          font-size: 14.5px; color: #F3F3F3; font-weight: 600;
          text-align: right; max-width: 60%;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        /* Participants */
        .rd-section { margin-top: 22px; padding: 0 20px; }
        .rd-section-title {
          font-size: 15px; font-weight: 700; color: #F3F3F3;
          margin-bottom: 12px; letter-spacing: -0.2px;
        }
        .rd-participants {
          display: flex; gap: 14px; overflow-x: auto;
          padding: 4px 4px 8px; margin: 0 -4px;
          -webkit-overflow-scrolling: touch; scrollbar-width: none;
        }
        .rd-participants::-webkit-scrollbar { display: none; }
        .rd-participant {
          display: flex; flex-direction: column; align-items: center;
          gap: 6px; flex-shrink: 0; cursor: pointer;
        }
        .rd-avatar {
          width: 52px; height: 52px; border-radius: 50%; background: #343434;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 700; color: #F3F3F3;
          overflow: hidden; border: 2px solid transparent;
          transition: transform 0.15s;
        }
        .rd-avatar:active { transform: scale(0.95); }
        .rd-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .rd-avatar.creator { border-color: #E53935; }
        .rd-participant-name {
          font-size: 11px; color: rgba(243,243,243,0.65);
          max-width: 64px; overflow: hidden; text-overflow: ellipsis;
          white-space: nowrap; text-align: center;
        }
        .rd-participant-name.creator { color: #E53935; font-weight: 600; }

        /* Map */
        .rd-map-wrap { margin-top: 22px; padding: 0 20px; }
        .rd-map {
          width: 100%; height: 260px; border-radius: 14px; overflow: hidden;
          background: #1E1E1E; border: 1px solid rgba(243,243,243,0.04);
        }
        .rd-map-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; height: 100%; gap: 6px;
          color: rgba(243,243,243,0.4); font-size: 13px;
        }
        .rd-map .leaflet-control-zoom a {
          background: #1E1E1E !important; color: #F3F3F3 !important;
          border-color: rgba(243,243,243,0.1) !important;
        }
        .rd-map .leaflet-control-attribution {
          background: rgba(12,12,12,0.7) !important;
          color: rgba(243,243,243,0.5) !important; font-size: 9px !important;
        }
        .rd-map .leaflet-control-attribution a { color: rgba(243,243,243,0.7) !important; }
        .leaflet-popup-content-wrapper {
          background: #1E1E1E !important; color: #F3F3F3 !important;
          border-radius: 10px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
        }
        .leaflet-popup-tip { background: #1E1E1E !important; }

        /* Planned route mini-stats */
        .rd-mini-stats {
          display: flex; gap: 10px; margin-top: 10px;
        }
        .rd-mini-stat {
          flex: 1; background: #1E1E1E; border-radius: 10px;
          padding: 10px 12px; text-align: center;
          border: 1px solid rgba(243,243,243,0.04);
        }
        .rd-mini-stat-value {
          font-size: 17px; font-weight: 800; color: #F3F3F3;
          letter-spacing: -0.3px;
        }
        .rd-mini-stat-label {
          font-size: 10.5px; color: rgba(243,243,243,0.5);
          text-transform: uppercase; letter-spacing: 0.04em;
          font-weight: 600; margin-top: 2px;
        }

        /* Completed stats grid */
        .rd-stats-grid {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;
          padding: 0 20px;
        }
        .rd-stat-card {
          background: #1E1E1E; border-radius: 12px; padding: 14px 8px;
          text-align: center; border: 1px solid rgba(243,243,243,0.04);
        }
        .rd-stat-value {
          font-size: 20px; font-weight: 800; color: #E53935;
          letter-spacing: -0.5px;
        }
        .rd-stat-label {
          font-size: 11px; color: rgba(243,243,243,0.5);
          text-transform: uppercase; letter-spacing: 0.03em;
          font-weight: 600; margin-top: 4px;
        }

        /* Sticky action bar */
        .rd-action-bar {
          position: fixed; left: 0; right: 0;
          bottom: env(safe-area-inset-bottom, 0px);
          padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
          background: linear-gradient(to top, #0C0C0C 70%, rgba(12,12,12,0));
          z-index: 5;
        }
        .rd-btn {
          width: 100%; height: 50px; border-radius: 12px;
          font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 600;
          cursor: pointer; border: 1px solid transparent;
          display: flex; align-items: center; justify-content: center;
        }
        .rd-btn:active { opacity: 0.8; }
        .rd-btn:disabled { opacity: 0.5; cursor: default; }
        .rd-btn.primary { background: #E53935; color: #fff; border-color: #E53935; }
        .rd-btn.outline { background: transparent; color: #F3F3F3; border-color: rgba(243,243,243,0.2); }
        .rd-btn.success { background: #22c55e; color: #fff; border-color: #22c55e; }

        /* States */
        .rd-loading, .rd-error {
          padding: 60px 20px; text-align: center; font-size: 14px;
          color: rgba(243,243,243,0.5);
        }
        .rd-error { color: #E53935; }
      </style>

      <header class="rd-nav">
        <button class="rd-back" id="rd-back-btn" aria-label="Back">${BACK_ICON}</button>
        <div class="rd-nav-title">Ride Details</div>
      </header>

      <div id="rd-content">
        <div class="rd-loading">Loading…</div>
      </div>
    </div>
  `;
}

/* -- Mount -------------------------------------------- */

export function mount(context = {}) {
  rideId = context.params?.id || null;

  document.getElementById('rd-back-btn')?.addEventListener('click', () => {
    navigate('/home');
  });

  if (rideId) {
    loadRideDetails();
  } else {
    showError('No ride ID provided.');
  }
}

/* -- Load ride details -------------------------------- */

async function loadRideDetails() {
  const contentEl = document.getElementById('rd-content');
  if (!contentEl) return;

  try {
    const res = await api.get(`/api/rides/${rideId}`);
    if (!res.success || !res.data) {
      showError('Ride not found.');
      return;
    }

    const ride = res.data;
    const currentUser = getCurrentUser();
    const userId = currentUser?.id;
    const guest = isGuest();

    const isCreator = userId && ride.createdBy &&
      (ride.createdBy === userId || ride.createdBy._id === userId || ride.createdBy.id === userId);

    const participants = ride.participants || [];
    const isParticipant = participants.some(
      (p) => p._id === userId || p.id === userId || p === userId
    );

    contentEl.innerHTML = renderRideContent(ride, isCreator, isParticipant, guest);
    attachActionHandlers(ride, isCreator, isParticipant);
    attachParticipantHandlers(participants, userId);

    // Map for all ride states
    if (ride.status === 'active' || ride.status === 'live') {
      initLiveMap(ride);
    } else if (ride.status === 'completed') {
      initCompletedMap(ride);
    } else {
      initPlannedRouteMap(ride);
    }
  } catch (err) {
    showError('Failed to load ride details.');
  }
}

function showError(msg) {
  const contentEl = document.getElementById('rd-content');
  if (contentEl) {
    contentEl.innerHTML = `<div class="rd-error">${escapeHtml(msg)}</div>`;
  }
}

/* -- Render ride content ------------------------------ */

function renderRideContent(ride, isCreator, isParticipant, guest) {
  const participants = ride.participants || [];
  const count = ride.participantsCount || participants.length || 0;
  const max = ride.maxParticipants || '--';
  const creatorName = ride.createdBy?.username || ride.createdBy?.name || 'Rider';
  const countdown = ride.status === 'scheduled' ? countdownText(ride.rideDate) : null;
  const hasCoords = ride.startCoords?.coordinates && ride.destinationCoords?.coordinates;

  let html = '';

  // ---------- HERO ----------
  html += `
    <section class="rd-hero">
      <h1 class="rd-title">${escapeHtml(ride.title || 'Untitled Ride')}</h1>
      <div class="rd-status-row">
        ${statusPill(ride.status)}
        ${countdown ? `<span class="rd-countdown">${countdown}</span>` : ''}
      </div>
      ${ride.description ? `<p class="rd-desc">${escapeHtml(ride.description)}</p>` : ''}
    </section>
  `;

  // ---------- ROUTE CARD ----------
  html += `
    <div class="rd-route-card">
      <div class="rd-route-row">
        <div class="rd-route-icon start">${PIN_ICON}</div>
        <div class="rd-route-text">
          <div class="rd-route-label">From</div>
          <div class="rd-route-value">${escapeHtml(ride.startLocation || 'Start')}</div>
        </div>
      </div>
      <div class="rd-route-divider">${ARROW_DOWN_ICON}</div>
      <div class="rd-route-row">
        <div class="rd-route-icon dest">${FLAG_ICON}</div>
        <div class="rd-route-text">
          <div class="rd-route-label">To</div>
          <div class="rd-route-value">${escapeHtml(ride.destination || 'Destination')}</div>
        </div>
      </div>
    </div>
  `;

  // ---------- INFO ROWS ----------
  html += `
    <div class="rd-rows">
      <div class="rd-row">
        <span class="rd-row-label">Date</span>
        <span class="rd-row-value">${escapeHtml(formatDate(ride.rideDate))}</span>
      </div>
      <div class="rd-row">
        <span class="rd-row-label">Riders</span>
        <span class="rd-row-value">${count} / ${max}</span>
      </div>
      <div class="rd-row">
        <span class="rd-row-label">Organizer</span>
        <span class="rd-row-value">${escapeHtml(creatorName)}</span>
      </div>
    </div>
  `;

  // ---------- PARTICIPANTS ----------
  if (participants.length > 0) {
    const creatorId = ride.createdBy?._id || ride.createdBy?.id || ride.createdBy;

    html += `
      <section class="rd-section">
        <div class="rd-section-title">Participants · ${participants.length}</div>
        <div class="rd-participants">
          ${participants.map((p) => {
            const pId = p._id || p.id || p;
            const name = p.username || p.name || 'Rider';
            const initial = name.charAt(0).toUpperCase();
            const isOwner = String(pId) === String(creatorId);
            const avatarClass = isOwner ? 'rd-avatar creator' : 'rd-avatar';
            const nameClass = isOwner ? 'rd-participant-name creator' : 'rd-participant-name';
            const avatarContent = p.profilePic
              ? `<img src="${escapeHtml(p.profilePic)}" alt="${escapeHtml(name)}" />`
              : initial;
            return `
              <div class="rd-participant" data-user-id="${escapeHtml(String(pId))}">
                <div class="${avatarClass}">${avatarContent}</div>
                <div class="${nameClass}">${escapeHtml(name)}${isOwner ? ' ★' : ''}</div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  // ---------- MAP ----------
  if (ride.status === 'active' || ride.status === 'live') {
    html += `
      <div class="rd-map-wrap">
        <div class="rd-section-title">Live Tracking</div>
        <div class="rd-map" id="rd-map"></div>
      </div>
    `;
  } else if (ride.status === 'scheduled') {
    html += `
      <div class="rd-map-wrap">
        <div class="rd-section-title">Planned Route</div>
        <div class="rd-map" id="rd-map">
          ${hasCoords ? '' : '<div class="rd-map-empty">Route not mapped yet</div>'}
        </div>
        <div id="rd-planned-stats"></div>
      </div>
    `;
  } else if (ride.status === 'completed') {
    const distance = ride.totalDistance != null ? `${Number(ride.totalDistance).toFixed(1)} km` : '--';
    const duration = formatDuration(ride.startTime, ride.endTime);
    let avgSpeed = '--';
    if (ride.totalDistance && ride.startTime && ride.endTime) {
      const hours = (new Date(ride.endTime) - new Date(ride.startTime)) / 3600000;
      if (hours > 0) avgSpeed = `${(ride.totalDistance / hours).toFixed(1)} km/h`;
    }
    html += `
      <section class="rd-section" style="padding:0;">
        <div style="padding:0 20px 12px;"><div class="rd-section-title" style="margin-bottom:0;">Ride Stats</div></div>
        <div class="rd-stats-grid">
          <div class="rd-stat-card"><div class="rd-stat-value">${distance}</div><div class="rd-stat-label">Distance</div></div>
          <div class="rd-stat-card"><div class="rd-stat-value">${duration}</div><div class="rd-stat-label">Duration</div></div>
          <div class="rd-stat-card"><div class="rd-stat-value">${avgSpeed}</div><div class="rd-stat-label">Avg Speed</div></div>
        </div>
      </section>
      <div class="rd-map-wrap">
        <div class="rd-section-title">Route</div>
        <div class="rd-map" id="rd-map"></div>
      </div>
    `;
  }

  // ---------- STICKY ACTION BAR ----------
  if (!guest) {
    let btn = '';
    if (ride.status === 'scheduled') {
      if (isCreator) {
        btn = `<button class="rd-btn success" id="rd-start-btn">Start Ride</button>`;
      } else if (isParticipant) {
        btn = `<button class="rd-btn outline" id="rd-leave-btn">Leave Ride</button>`;
      } else if (count < max || max === '--') {
        btn = `<button class="rd-btn primary" id="rd-join-btn">Join Ride</button>`;
      } else {
        btn = `<button class="rd-btn outline" disabled>Ride Full</button>`;
      }
    } else if (ride.status === 'active' || ride.status === 'live') {
      if (isCreator) {
        btn = `<button class="rd-btn primary" id="rd-end-btn">End Ride</button>`;
      } else if (isParticipant) {
        btn = `<button class="rd-btn outline" disabled>Ride in progress</button>`;
      }
    }
    if (btn) html += `<div class="rd-action-bar">${btn}</div>`;
  }

  return html;
}

/* -- Action handlers ---------------------------------- */

function attachActionHandlers(ride, isCreator, isParticipant) {
  const joinBtn = document.getElementById('rd-join-btn');
  const leaveBtn = document.getElementById('rd-leave-btn');
  const startBtn = document.getElementById('rd-start-btn');
  const endBtn = document.getElementById('rd-end-btn');

  const wire = (btn, originalLabel, busyLabel, fn) => {
    if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = busyLabel;
      try {
        const res = await fn();
        if (res?.success) {
          loadRideDetails();
        } else {
          btn.textContent = res?.error?.message || `Failed to ${originalLabel.toLowerCase()}`;
          setTimeout(() => { btn.textContent = originalLabel; btn.disabled = false; }, 2000);
        }
      } catch {
        btn.textContent = 'Failed';
        setTimeout(() => { btn.textContent = originalLabel; btn.disabled = false; }, 2000);
      }
    });
  };

  wire(joinBtn,  'Join Ride',  'Joining…',  () => api.post(`/api/rides/${rideId}/join`));
  wire(leaveBtn, 'Leave Ride', 'Leaving…',  () => api.post(`/api/rides/${rideId}/leave`));
  wire(startBtn, 'Start Ride', 'Starting…', () => api.put(`/api/rides/${rideId}/start`));
  wire(endBtn,   'End Ride',   'Ending…',   () => api.put(`/api/rides/${rideId}/end`));
}

function attachParticipantHandlers(participants, currentUserId) {
  document.querySelectorAll('.rd-participant').forEach((el) => {
    el.addEventListener('click', () => {
      const uid = el.dataset.userId;
      if (!uid) return;
      if (String(uid) === String(currentUserId)) {
        navigate('/profile');
      } else {
        navigate(`/user/${uid}`);
      }
    });
  });
}

/* -- Live map (active rides) -------------------------- */

function initLiveMap(ride) {
  const mapEl = document.getElementById('rd-map');
  if (!mapEl || typeof L === 'undefined') {
    if (mapEl) mapEl.innerHTML = '<div class="rd-map-empty">Map not available</div>';
    return;
  }

  let centerLat = 20.5937;
  let centerLng = 78.9629;
  let zoom = 5;

  if (ride.startCoords?.coordinates) {
    centerLng = ride.startCoords.coordinates[0];
    centerLat = ride.startCoords.coordinates[1];
    zoom = 13;
  }

  map = L.map(mapEl, {
    center: [centerLat, centerLng],
    zoom,
    zoomControl: true,
    attributionControl: true,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM &amp; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  addEndpointMarkers(ride);
  loadLiveLocations();

  socketManager.connect();
  socketManager.joinRide(rideId);

  locationHandler = (data) => {
    if (!map) return;
    const { userId, lat, lng, username } = data;
    if (!userId || lat == null || lng == null) return;

    if (riderMarkers[userId]) {
      riderMarkers[userId].setLatLng([lat, lng]);
    } else {
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:14px;height:14px;background:#22c55e;border-radius:50%;
          border:2px solid #fff;box-shadow:0 0 8px rgba(34,197,94,0.5);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      riderMarkers[userId] = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`<b style="color:#F3F3F3">${escapeHtml(username || 'Rider')}</b>`);
    }
  };

  socketManager.onRiderLocation(locationHandler);
}

async function loadLiveLocations() {
  try {
    const res = await api.get(`/api/rides/${rideId}/locations`);
    if (res.success && res.data && map) {
      const locations = Array.isArray(res.data) ? res.data : (res.data.locations || []);
      const bounds = [];

      locations.forEach((loc) => {
        const uid = loc.userId || loc.user;
        const lat = loc.lat || loc.latitude;
        const lng = loc.lng || loc.longitude;
        if (!uid || lat == null || lng == null) return;

        if (riderMarkers[uid]) {
          riderMarkers[uid].setLatLng([lat, lng]);
        } else {
          const icon = L.divIcon({
            className: '',
            html: `<div style="
              width:14px;height:14px;background:#22c55e;border-radius:50%;
              border:2px solid #fff;box-shadow:0 0 8px rgba(34,197,94,0.5);
            "></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });
          riderMarkers[uid] = L.marker([lat, lng], { icon })
            .addTo(map)
            .bindPopup(`<b style="color:#F3F3F3">${escapeHtml(loc.username || 'Rider')}</b>`);
        }
        bounds.push([lat, lng]);
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
      }
    }
  } catch {
    // silently fail
  }
}

/* -- Completed ride map ------------------------------- */

async function initCompletedMap(ride) {
  const mapEl = document.getElementById('rd-map');
  if (!mapEl || typeof L === 'undefined') {
    if (mapEl) mapEl.innerHTML = '<div class="rd-map-empty">Map not available</div>';
    return;
  }

  let centerLat = 20.5937;
  let centerLng = 78.9629;
  let zoom = 5;

  if (ride.startCoords?.coordinates) {
    centerLng = ride.startCoords.coordinates[0];
    centerLat = ride.startCoords.coordinates[1];
    zoom = 12;
  }

  map = L.map(mapEl, {
    center: [centerLat, centerLng],
    zoom,
    zoomControl: true,
    attributionControl: true,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM &amp; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  addEndpointMarkers(ride);

  try {
    const res = await api.get(`/api/rides/${rideId}/route`);
    if (res.success && res.data && map) {
      const routePoints = res.data.route || [];
      if (routePoints.length >= 2) {
        try {
          const coords = routePoints.map(p => [p.longitude, p.latitude]);
          const sampled = sampleCoordinates(coords, 50);
          const orsRes = await api.post('/api/routes/directions', {
            coordinates: sampled,
            profile: 'driving-car',
            instructions: false
          });
          if (orsRes.success && orsRes.data?.features?.[0]) {
            const geom = orsRes.data.features[0].geometry;
            const latlngs = geom.coordinates.map(c => [c[1], c[0]]);
            routeLayer = L.polyline(latlngs, {
              color: '#E53935', weight: 4, opacity: 0.85, lineCap: 'round', lineJoin: 'round'
            }).addTo(map);
            map.fitBounds(routeLayer.getBounds().pad(0.15));
            return;
          }
        } catch {
          // fallthrough
        }
        const latlngs = routePoints.map(p => [p.latitude, p.longitude]);
        routeLayer = L.polyline(latlngs, {
          color: '#E53935', weight: 4, opacity: 0.7, dashArray: '8,6'
        }).addTo(map);
        map.fitBounds(routeLayer.getBounds().pad(0.15));
      }
    }
  } catch {
    // route may not be available
  }
}

/* -- Planned route map (scheduled rides) -------------- */

async function initPlannedRouteMap(ride) {
  const mapEl = document.getElementById('rd-map');
  if (!mapEl || typeof L === 'undefined') return;
  if (!ride.startCoords?.coordinates || !ride.destinationCoords?.coordinates) return;

  // Clear empty placeholder if present
  mapEl.innerHTML = '';

  const [sLng, sLat] = ride.startCoords.coordinates;
  const [dLng, dLat] = ride.destinationCoords.coordinates;

  map = L.map(mapEl, {
    center: [(sLat + dLat) / 2, (sLng + dLng) / 2],
    zoom: 10,
    zoomControl: true,
    attributionControl: true,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM &amp; CARTO | Routing by <a href="https://openrouteservice.org">ORS</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  addEndpointMarkers(ride);

  try {
    const res = await api.post('/api/routes/directions', {
      coordinates: [[sLng, sLat], [dLng, dLat]],
      profile: 'driving-car',
      instructions: true
    });

    if (res.success && res.data?.features?.[0]) {
      const feature = res.data.features[0];
      const geom = feature.geometry;
      const latlngs = geom.coordinates.map(c => [c[1], c[0]]);

      routeLayer = L.polyline(latlngs, {
        color: '#E53935', weight: 4, opacity: 0.85, lineCap: 'round', lineJoin: 'round'
      }).addTo(map);
      map.fitBounds(routeLayer.getBounds().pad(0.15));

      const summary = feature.properties?.summary;
      if (summary) {
        const distKm = (summary.distance / 1000).toFixed(1);
        const hrs = Math.floor(summary.duration / 3600);
        const mins = Math.round((summary.duration % 3600) / 60);
        const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;

        const statsEl = document.getElementById('rd-planned-stats');
        if (statsEl) {
          statsEl.innerHTML = `
            <div class="rd-mini-stats">
              <div class="rd-mini-stat">
                <div class="rd-mini-stat-value">${distKm} km</div>
                <div class="rd-mini-stat-label">Distance</div>
              </div>
              <div class="rd-mini-stat">
                <div class="rd-mini-stat-value">${timeStr}</div>
                <div class="rd-mini-stat-label">Est. Time</div>
              </div>
            </div>
          `;
        }
      }
    }
  } catch {
    const group = L.featureGroup();
    map.eachLayer(l => { if (l instanceof L.Marker) group.addLayer(l); });
    if (group.getLayers().length > 0) {
      map.fitBounds(group.getBounds().pad(0.3));
    }
  }
}

/**
 * Sample coordinates array to reduce points for ORS (max waypoints limit)
 */
function sampleCoordinates(coords, maxPoints) {
  if (coords.length <= maxPoints) return coords;
  const result = [coords[0]];
  const step = (coords.length - 1) / (maxPoints - 1);
  for (let i = 1; i < maxPoints - 1; i++) {
    result.push(coords[Math.round(i * step)]);
  }
  result.push(coords[coords.length - 1]);
  return result;
}

/* -- Shared map helpers ------------------------------- */

function addEndpointMarkers(ride) {
  if (!map) return;

  if (ride.startCoords?.coordinates) {
    const [lng, lat] = ride.startCoords.coordinates;
    const startIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:28px;height:28px;background:#22c55e;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;
        border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);
      "><span style="transform:rotate(45deg);font-size:12px;color:#fff;font-weight:bold;">S</span></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    });
    L.marker([lat, lng], { icon: startIcon })
      .addTo(map)
      .bindPopup(`<b style="color:#F3F3F3">${escapeHtml(ride.startLocation || 'Start')}</b>`);
  }

  if (ride.destinationCoords?.coordinates) {
    const [lng, lat] = ride.destinationCoords.coordinates;
    const destIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:28px;height:28px;background:#E53935;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;
        border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);
      "><span style="transform:rotate(45deg);font-size:12px;color:#fff;font-weight:bold;">D</span></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    });
    L.marker([lat, lng], { icon: destIcon })
      .addTo(map)
      .bindPopup(`<b style="color:#F3F3F3">${escapeHtml(ride.destination || 'Destination')}</b>`);
  }
}

/* -- Cleanup ------------------------------------------ */

export function cleanup() {
  if (locationHandler) {
    socketManager.offRiderLocation(locationHandler);
    locationHandler = null;
  }
  if (rideId) {
    socketManager.leaveRide(rideId);
  }
  if (map) {
    map.remove();
    map = null;
  }
  riderMarkers = {};
  routeLayer = null;
  rideId = null;
}
