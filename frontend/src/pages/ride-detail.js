/**
 * Ride Detail page for Bikers Hub
 * Shows ride info, participants, action buttons, live map for active rides,
 * and stats/route for completed rides.
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser, isGuest } from '../utils/auth.js';
import { socketManager } from '../utils/socket.js';

/* -- SVG Icons ---------------------------------------- */

const BACK_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;

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

function statusBadge(status) {
  const colors = {
    scheduled: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
    active: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
    completed: { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af' },
  };
  const c = colors[status] || colors.scheduled;
  return `<span style="
    display:inline-block; padding:4px 12px; border-radius:12px; font-size:12px;
    font-weight:700; font-family:'Exo 2',sans-serif; text-transform:uppercase;
    background:${c.bg}; color:${c.text};
  ">${escapeHtml(status)}</span>`;
}

/* -- Render ------------------------------------------- */

export function render(context = {}) {
  rideId = context.params?.id || null;

  return `
    <div class="page-dark ride-detail-page">
      <style>
        .ride-detail-page {
          min-height:100dvh; background:#0d1117; color:#f9fafb;
          font-family:'Nunito',sans-serif; display:flex; flex-direction:column;
        }

        /* Header */
        .rd-header {
          display:flex; align-items:center; gap:12px;
          padding:12px 16px; background:#0d1117;
          border-bottom:1px solid #1f2937; flex-shrink:0;
        }
        .rd-header-back {
          background:none; border:none; cursor:pointer; padding:4px;
          display:flex; align-items:center; justify-content:center;
        }
        .rd-header-title {
          font-family:'Exo 2',sans-serif; font-weight:700; font-size:18px; color:#f9fafb;
        }

        /* Content */
        .rd-content { flex:1; overflow-y:auto; padding:16px; }

        /* Ride title section */
        .rd-ride-title {
          font-family:'Exo 2',sans-serif; font-weight:800; font-size:24px;
          color:#f9fafb; margin-bottom:4px; line-height:1.2;
        }
        .rd-ride-desc {
          font-size:14px; color:#9ca3af; margin-top:8px; line-height:1.5;
        }
        .rd-status-row {
          display:flex; align-items:center; gap:10px; margin-top:8px;
        }

        /* Info cards */
        .rd-info-cards {
          display:flex; gap:10px; margin-top:20px; overflow-x:auto;
          -webkit-overflow-scrolling:touch; scrollbar-width:none;
        }
        .rd-info-cards::-webkit-scrollbar { display:none; }
        .rd-info-card {
          flex:1; min-width:0; background:#1f2937; border-radius:14px; padding:14px;
        }
        .rd-info-card-label {
          font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700;
          letter-spacing:0.5px; margin-bottom:6px;
        }
        .rd-info-card-value {
          font-family:'Exo 2',sans-serif; font-weight:700; font-size:14px; color:#f9fafb;
          word-break:break-word;
        }

        /* Participants */
        .rd-participants-section { margin-top:24px; }
        .rd-section-title {
          font-family:'Exo 2',sans-serif; font-weight:700; font-size:16px;
          color:#f9fafb; margin-bottom:12px;
        }
        .rd-participants-scroll {
          display:flex; gap:14px; overflow-x:auto; padding-bottom:8px;
          -webkit-overflow-scrolling:touch; scrollbar-width:none;
        }
        .rd-participants-scroll::-webkit-scrollbar { display:none; }
        .rd-participant {
          display:flex; flex-direction:column; align-items:center; gap:6px; flex-shrink:0;
        }
        .rd-participant-avatar {
          width:44px; height:44px; border-radius:50%; background:#374151;
          display:flex; align-items:center; justify-content:center;
          font-family:'Exo 2',sans-serif; font-weight:700; font-size:16px; color:#f9fafb;
          border:2px solid #4b5563; overflow:hidden;
        }
        .rd-participant-avatar img {
          width:100%; height:100%; object-fit:cover;
        }
        .rd-participant-name {
          font-size:11px; color:#9ca3af; max-width:60px; text-align:center;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .rd-participant-creator {
          border-color:#E53935;
        }

        /* Action buttons */
        .rd-actions { margin-top:24px; display:flex; flex-direction:column; gap:10px; }
        .rd-btn {
          width:100%; height:48px; border:none; border-radius:24px;
          font-family:'Exo 2',sans-serif; font-weight:700; font-size:15px;
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          transition:opacity 0.15s;
        }
        .rd-btn:active { opacity:0.8; }
        .rd-btn:disabled { opacity:0.5; cursor:default; }
        .rd-btn-join { background:#E53935; color:#fff; }
        .rd-btn-leave { background:#374151; color:#f9fafb; }
        .rd-btn-start { background:#22c55e; color:#fff; }
        .rd-btn-end { background:#E53935; color:#fff; }

        /* Map */
        .rd-map-section { margin-top:24px; }
        .rd-map-container {
          width:100%; height:280px; border-radius:14px; overflow:hidden;
          background:#1a2332;
        }
        .rd-map-container .leaflet-control-zoom a {
          background:#1f2937 !important; color:#f9fafb !important; border-color:#374151 !important;
        }
        .rd-map-container .leaflet-control-attribution {
          background:rgba(13,17,23,0.7) !important; color:#6b7280 !important; font-size:9px !important;
        }
        .rd-map-container .leaflet-control-attribution a { color:#9ca3af !important; }
        .leaflet-popup-content-wrapper {
          background:#1f2937 !important; color:#f9fafb !important; border-radius:12px !important;
          box-shadow:0 4px 12px rgba(0,0,0,0.4) !important;
        }
        .leaflet-popup-tip { background:#1f2937 !important; }

        /* Stats */
        .rd-stats-section { margin-top:24px; }
        .rd-stats-grid {
          display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;
        }
        .rd-stat-card {
          background:#1f2937; border-radius:14px; padding:16px; text-align:center;
        }
        .rd-stat-value {
          font-family:'Exo 2',sans-serif; font-weight:800; font-size:22px; color:#E53935;
        }
        .rd-stat-label {
          font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:700;
          margin-top:4px;
        }

        /* Loading & Error */
        .rd-loading, .rd-error {
          display:flex; align-items:center; justify-content:center;
          flex:1; color:#6b7280; font-size:14px; text-align:center; padding:40px;
        }
        .rd-error { color:#E53935; }

        /* Bottom safe area */
        .rd-bottom-space { height:calc(env(safe-area-inset-bottom, 0px) + 16px); flex-shrink:0; }
      </style>

      <div class="rd-header">
        <button class="rd-header-back" id="rd-back-btn">${BACK_ICON}</button>
        <div class="rd-header-title">Ride Details</div>
      </div>

      <div class="rd-content" id="rd-content">
        <div class="rd-loading">Loading ride details...</div>
      </div>

      <div class="rd-bottom-space"></div>
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

    // Map for all ride states
    if (ride.status === 'active' || ride.status === 'live') {
      initLiveMap(ride);
    } else if (ride.status === 'completed') {
      initCompletedMap(ride);
    } else {
      // Scheduled rides — show planned ORS route between start and destination
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

  let html = '';

  // Title + status
  html += `
    <div class="rd-ride-title">${escapeHtml(ride.title || 'Untitled Ride')}</div>
    <div class="rd-status-row">${statusBadge(ride.status)}</div>
  `;

  // Description
  if (ride.description) {
    html += `<div class="rd-ride-desc">${escapeHtml(ride.description)}</div>`;
  }

  // Info cards
  html += `
    <div class="rd-info-cards">
      <div class="rd-info-card">
        <div class="rd-info-card-label">Date</div>
        <div class="rd-info-card-value">${escapeHtml(formatDate(ride.rideDate))}</div>
      </div>
      <div class="rd-info-card">
        <div class="rd-info-card-label">Route</div>
        <div class="rd-info-card-value">${escapeHtml(ride.startLocation || 'Start')} &rarr; ${escapeHtml(ride.destination || 'Destination')}</div>
      </div>
      <div class="rd-info-card">
        <div class="rd-info-card-label">Riders</div>
        <div class="rd-info-card-value">${count} / ${max}</div>
      </div>
    </div>
  `;

  // Participants horizontal scroll
  if (participants.length > 0) {
    const creatorId = ride.createdBy?._id || ride.createdBy?.id || ride.createdBy;

    html += `
      <div class="rd-participants-section">
        <div class="rd-section-title">Participants</div>
        <div class="rd-participants-scroll">
          ${participants.map((p) => {
            const pId = p._id || p.id || p;
            const name = p.username || p.name || 'Rider';
            const initial = name.charAt(0).toUpperCase();
            const isOwner = pId === creatorId;
            const avatarClass = isOwner ? 'rd-participant-avatar rd-participant-creator' : 'rd-participant-avatar';

            let avatarContent = initial;
            if (p.profilePic) {
              avatarContent = `<img src="${escapeHtml(p.profilePic)}" alt="${escapeHtml(name)}" />`;
            }

            return `
              <div class="rd-participant">
                <div class="${avatarClass}">${avatarContent}</div>
                <div class="rd-participant-name">${escapeHtml(name)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Action buttons (conditional)
  if (!guest) {
    html += '<div class="rd-actions">';

    if (ride.status === 'scheduled') {
      if (isCreator) {
        html += `<button class="rd-btn rd-btn-start" id="rd-start-btn">Start Ride</button>`;
      } else if (isParticipant) {
        html += `<button class="rd-btn rd-btn-leave" id="rd-leave-btn">Leave Ride</button>`;
      } else {
        html += `<button class="rd-btn rd-btn-join" id="rd-join-btn">Join Ride</button>`;
      }
    } else if (ride.status === 'active') {
      if (isCreator) {
        html += `<button class="rd-btn rd-btn-end" id="rd-end-btn">End Ride</button>`;
      }
    }

    html += '</div>';
  }

  // Map section for scheduled rides (planned route from ORS)
  if (ride.status === 'scheduled' && ride.startCoords?.coordinates && ride.destinationCoords?.coordinates) {
    html += `
      <div class="rd-map-section">
        <div class="rd-section-title">Planned Route</div>
        <div class="rd-map-container" id="rd-map"></div>
        <div id="rd-planned-stats"></div>
      </div>
    `;
  }

  // Map section for active rides
  if (ride.status === 'active' || ride.status === 'live') {
    html += `
      <div class="rd-map-section">
        <div class="rd-section-title">Live Tracking</div>
        <div class="rd-map-container" id="rd-map"></div>
      </div>
    `;
  }

  // Stats + map for completed rides
  if (ride.status === 'completed') {
    const distance = ride.totalDistance != null ? `${Number(ride.totalDistance).toFixed(1)} km` : '--';
    const duration = formatDuration(ride.startTime, ride.endTime);
    let avgSpeed = '--';
    if (ride.totalDistance && ride.startTime && ride.endTime) {
      const hours = (new Date(ride.endTime) - new Date(ride.startTime)) / 3600000;
      if (hours > 0) {
        avgSpeed = `${(ride.totalDistance / hours).toFixed(1)} km/h`;
      }
    }

    html += `
      <div class="rd-stats-section">
        <div class="rd-section-title">Ride Stats</div>
        <div class="rd-stats-grid">
          <div class="rd-stat-card">
            <div class="rd-stat-value">${distance}</div>
            <div class="rd-stat-label">Distance</div>
          </div>
          <div class="rd-stat-card">
            <div class="rd-stat-value">${duration}</div>
            <div class="rd-stat-label">Duration</div>
          </div>
          <div class="rd-stat-card">
            <div class="rd-stat-value">${avgSpeed}</div>
            <div class="rd-stat-label">Avg Speed</div>
          </div>
        </div>
      </div>
      <div class="rd-map-section" style="margin-top:16px;">
        <div class="rd-section-title">Route</div>
        <div class="rd-map-container" id="rd-map"></div>
      </div>
    `;
  }

  return html;
}

/* -- Action handlers ---------------------------------- */

function attachActionHandlers(ride, isCreator, isParticipant) {
  const joinBtn = document.getElementById('rd-join-btn');
  const leaveBtn = document.getElementById('rd-leave-btn');
  const startBtn = document.getElementById('rd-start-btn');
  const endBtn = document.getElementById('rd-end-btn');

  if (joinBtn) {
    joinBtn.addEventListener('click', async () => {
      joinBtn.disabled = true;
      joinBtn.textContent = 'Joining...';
      try {
        const res = await api.post(`/api/rides/${rideId}/join`);
        if (res.success) {
          loadRideDetails();
        } else {
          joinBtn.textContent = res.error?.message || 'Failed to join';
          setTimeout(() => { joinBtn.textContent = 'Join Ride'; joinBtn.disabled = false; }, 2000);
        }
      } catch {
        joinBtn.textContent = 'Failed';
        setTimeout(() => { joinBtn.textContent = 'Join Ride'; joinBtn.disabled = false; }, 2000);
      }
    });
  }

  if (leaveBtn) {
    leaveBtn.addEventListener('click', async () => {
      leaveBtn.disabled = true;
      leaveBtn.textContent = 'Leaving...';
      try {
        const res = await api.post(`/api/rides/${rideId}/leave`);
        if (res.success) {
          loadRideDetails();
        } else {
          leaveBtn.textContent = res.error?.message || 'Failed to leave';
          setTimeout(() => { leaveBtn.textContent = 'Leave Ride'; leaveBtn.disabled = false; }, 2000);
        }
      } catch {
        leaveBtn.textContent = 'Failed';
        setTimeout(() => { leaveBtn.textContent = 'Leave Ride'; leaveBtn.disabled = false; }, 2000);
      }
    });
  }

  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      startBtn.disabled = true;
      startBtn.textContent = 'Starting...';
      try {
        const res = await api.put(`/api/rides/${rideId}/start`);
        if (res.success) {
          loadRideDetails();
        } else {
          startBtn.textContent = res.error?.message || 'Failed to start';
          setTimeout(() => { startBtn.textContent = 'Start Ride'; startBtn.disabled = false; }, 2000);
        }
      } catch {
        startBtn.textContent = 'Failed';
        setTimeout(() => { startBtn.textContent = 'Start Ride'; startBtn.disabled = false; }, 2000);
      }
    });
  }

  if (endBtn) {
    endBtn.addEventListener('click', async () => {
      endBtn.disabled = true;
      endBtn.textContent = 'Ending...';
      try {
        const res = await api.put(`/api/rides/${rideId}/end`);
        if (res.success) {
          loadRideDetails();
        } else {
          endBtn.textContent = res.error?.message || 'Failed to end';
          setTimeout(() => { endBtn.textContent = 'End Ride'; endBtn.disabled = false; }, 2000);
        }
      } catch {
        endBtn.textContent = 'Failed';
        setTimeout(() => { endBtn.textContent = 'End Ride'; endBtn.disabled = false; }, 2000);
      }
    });
  }
}

/* -- Live map (active rides) -------------------------- */

function initLiveMap(ride) {
  const mapEl = document.getElementById('rd-map');
  if (!mapEl || typeof L === 'undefined') {
    if (mapEl) {
      mapEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;font-size:13px;">Map not available</div>';
    }
    return;
  }

  // Default center from start coords or India center
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

  // Add start and destination markers
  addEndpointMarkers(ride);

  // Load initial rider locations
  loadLiveLocations();

  // Socket.IO for real-time GPS updates
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
        .bindPopup(`<b style="color:#f9fafb">${escapeHtml(username || 'Rider')}</b>`);
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
            .bindPopup(`<b style="color:#f9fafb">${escapeHtml(loc.username || 'Rider')}</b>`);
        }
        bounds.push([lat, lng]);
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
      }
    }
  } catch {
    // Silently fail; markers update via socket
  }
}

/* -- Completed ride map ------------------------------- */

async function initCompletedMap(ride) {
  const mapEl = document.getElementById('rd-map');
  if (!mapEl || typeof L === 'undefined') {
    if (mapEl) {
      mapEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;font-size:13px;">Map not available</div>';
    }
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

  // Add start and destination markers
  addEndpointMarkers(ride);

  // Load recorded route and try to snap to roads via ORS
  try {
    const res = await api.get(`/api/rides/${rideId}/route`);
    if (res.success && res.data && map) {
      const routePoints = res.data.route || [];

      if (routePoints.length >= 2) {
        // Try snapping recorded GPS to actual roads via ORS
        try {
          const coords = routePoints.map(p => [p.longitude, p.latitude]);
          // Sample points to stay within ORS limits (max ~50 waypoints)
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
            return; // ORS route succeeded
          }
        } catch {
          // Fall through to raw GPS polyline
        }

        // Fallback: raw GPS points as polyline
        const latlngs = routePoints.map(p => [p.latitude, p.longitude]);
        routeLayer = L.polyline(latlngs, {
          color: '#E53935', weight: 4, opacity: 0.7, dashArray: '8,6'
        }).addTo(map);
        map.fitBounds(routeLayer.getBounds().pad(0.15));
      }
    }
  } catch {
    // Route may not be available
  }
}

/* -- Planned route map (scheduled rides) -------------- */

async function initPlannedRouteMap(ride) {
  const mapEl = document.getElementById('rd-map');
  if (!mapEl || typeof L === 'undefined') return;
  if (!ride.startCoords?.coordinates || !ride.destinationCoords?.coordinates) return;

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

  // Fetch planned route from ORS
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

      // Show route distance/time in the stats section if available
      const summary = feature.properties?.summary;
      if (summary) {
        const distKm = (summary.distance / 1000).toFixed(1);
        const hrs = Math.floor(summary.duration / 3600);
        const mins = Math.round((summary.duration % 3600) / 60);
        const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;

        const statsEl = document.getElementById('rd-planned-stats');
        if (statsEl) {
          statsEl.innerHTML = `
            <div style="display:flex;gap:12px;margin-top:12px;">
              <div style="flex:1;background:#1f2937;border-radius:10px;padding:10px;text-align:center;">
                <div style="font-family:'Exo 2',sans-serif;font-weight:800;font-size:18px;color:#f9fafb;">${distKm}</div>
                <div style="font-size:11px;color:#9ca3af;">km route</div>
              </div>
              <div style="flex:1;background:#1f2937;border-radius:10px;padding:10px;text-align:center;">
                <div style="font-family:'Exo 2',sans-serif;font-weight:800;font-size:18px;color:#f9fafb;">${timeStr}</div>
                <div style="font-size:11px;color:#9ca3af;">est. time</div>
              </div>
            </div>
          `;
        }
      }
    }
  } catch {
    // Route preview not available — just show markers
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
  const result = [coords[0]]; // always include first
  const step = (coords.length - 1) / (maxPoints - 1);
  for (let i = 1; i < maxPoints - 1; i++) {
    result.push(coords[Math.round(i * step)]);
  }
  result.push(coords[coords.length - 1]); // always include last
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
        border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);
      "><span style="transform:rotate(45deg);font-size:12px;color:#fff;font-weight:bold;">S</span></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    });
    L.marker([lat, lng], { icon: startIcon })
      .addTo(map)
      .bindPopup(`<b style="color:#f9fafb">${escapeHtml(ride.startLocation || 'Start')}</b>`);
  }

  if (ride.destinationCoords?.coordinates) {
    const [lng, lat] = ride.destinationCoords.coordinates;
    const destIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:28px;height:28px;background:#E53935;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;
        border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);
      "><span style="transform:rotate(45deg);font-size:12px;color:#fff;font-weight:bold;">D</span></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    });
    L.marker([lat, lng], { icon: destIcon })
      .addTo(map)
      .bindPopup(`<b style="color:#f9fafb">${escapeHtml(ride.destination || 'Destination')}</b>`);
  }
}

/* -- Cleanup ------------------------------------------ */

export function cleanup() {
  // Remove socket listeners and leave ride room
  if (locationHandler) {
    socketManager.offRiderLocation(locationHandler);
    locationHandler = null;
  }
  if (rideId) {
    socketManager.leaveRide(rideId);
  }

  // Destroy map
  if (map) {
    map.remove();
    map = null;
  }

  // Reset state
  riderMarkers = {};
  routeLayer = null;
  rideId = null;
}
