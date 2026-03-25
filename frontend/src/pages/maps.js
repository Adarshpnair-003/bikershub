/**
 * Maps page for Bikers Hub
 * Geolocation + Weather + Nearby Rides + Route Planning (OpenRouteService)
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';
import { isGuest } from '../utils/auth.js';
import { renderTabBar } from '../components/tabbar.js';

/* ── SVG Icons ────────────────────────────── */

const LOCATE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>`;
const REFRESH_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`;
const ROUTE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M12 19h4.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H12"/></svg>`;
const CLOSE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const NAV_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`;

/* ── Render ───────────────────────────────── */

export function render() {
  return `
    <div class="page-dark maps-page">
      <div class="app-header">
        <div class="app-header-title">Maps & Weather</div>
        <div class="app-header-actions" style="display:flex;gap:8px;">
          <button class="app-header-btn" id="maps-route-btn" title="Plan a route">${ROUTE_ICON}</button>
          <button class="app-header-btn" id="maps-locate-btn" title="My location">${LOCATE_ICON}</button>
        </div>
      </div>

      <!-- Weather widget overlay -->
      <div id="maps-weather" class="maps-weather maps-weather--loading">
        <div class="maps-weather-loading">Getting weather...</div>
      </div>

      <!-- Route planner overlay (hidden by default) -->
      <div id="maps-route-planner" class="maps-route-planner maps-route-planner--hidden">
        <div class="maps-route-planner-header">
          <span style="font-family:'Exo 2',sans-serif;font-weight:700;font-size:15px;color:#f9fafb;">Route Planner</span>
          <button class="maps-route-close" id="maps-route-close">${CLOSE_ICON}</button>
        </div>
        <div class="maps-route-inputs">
          <div class="maps-route-input-row">
            <div class="maps-route-dot" style="background:#22c55e;"></div>
            <input type="text" id="maps-route-start" placeholder="Start location (or use GPS)" class="maps-route-input" />
          </div>
          <div class="maps-route-input-row">
            <div class="maps-route-dot" style="background:#E53935;"></div>
            <input type="text" id="maps-route-end" placeholder="Destination" class="maps-route-input" />
          </div>
        </div>
        <div class="maps-route-actions">
          <select id="maps-route-profile" class="maps-route-select">
            <option value="driving-car">Car / Motorcycle</option>
            <option value="cycling-regular">Bicycle</option>
            <option value="foot-walking">Walking</option>
          </select>
          <button class="maps-route-go" id="maps-route-go">${NAV_ICON} Get Route</button>
        </div>
        <div id="maps-route-summary" class="maps-route-summary maps-route-summary--hidden"></div>
      </div>

      <!-- Directions panel (hidden by default) -->
      <div id="maps-directions" class="maps-directions maps-directions--hidden">
        <div class="maps-directions-header">
          <span style="font-family:'Exo 2',sans-serif;font-weight:700;font-size:13px;color:#f9fafb;">DIRECTIONS</span>
          <button class="maps-directions-close" id="maps-directions-close">${CLOSE_ICON}</button>
        </div>
        <div id="maps-directions-list" class="maps-directions-list"></div>
      </div>

      <!-- Map container -->
      <!-- POI toggles -->
      <div id="maps-poi-bar" class="maps-poi-bar">
        <button class="maps-poi-toggle" data-poi="cafe" id="maps-poi-cafe">☕ Cafes</button>
        <button class="maps-poi-toggle" data-poi="fuel" id="maps-poi-fuel">⛽ Fuel</button>
        <button class="maps-poi-toggle" data-poi="viewpoint" id="maps-poi-viewpoint">🏔️ Spots</button>
      </div>
      <div id="leaflet-map" class="maps-leaflet"></div>

      <!-- Bottom info panel -->
      <div id="maps-panel" class="maps-panel">
        <div class="maps-panel-header">
          <span class="maps-panel-title">Nearby Rides</span>
          <button class="maps-panel-refresh" id="maps-refresh-rides">${REFRESH_ICON} Refresh</button>
        </div>
        <div id="maps-rides-list" class="maps-rides-list">
          <div class="maps-rides-empty">Finding rides near you...</div>
        </div>
      </div>

      ${renderTabBar('maps')}

      <style>
        .maps-page { display:flex; flex-direction:column; min-height:100dvh; position:relative; }

        /* ── Weather widget ─────────────── */
        .maps-weather {
          position:absolute; top:60px; left:12px; right:12px; z-index:500;
          background:rgba(31,41,55,0.92); backdrop-filter:blur(10px);
          border-radius:16px; padding:14px 16px;
          display:flex; align-items:center; gap:14px;
          box-shadow:0 4px 20px rgba(0,0,0,0.3);
          transition: opacity 0.3s;
        }
        .maps-weather--loading { justify-content:center; }
        .maps-weather-loading { color:#9ca3af; font-size:13px; }
        .maps-weather-icon { width:48px; height:48px; flex-shrink:0; }
        .maps-weather-info { flex:1; }
        .maps-weather-temp {
          font-family:'Exo 2',sans-serif; font-weight:800; font-size:26px; color:#f9fafb; line-height:1;
        }
        .maps-weather-desc {
          font-size:13px; color:#d1d5db; text-transform:capitalize; margin-top:2px;
        }
        .maps-weather-details {
          display:flex; gap:12px; margin-top:6px;
        }
        .maps-weather-detail {
          font-size:11px; color:#9ca3af; display:flex; align-items:center; gap:4px;
        }
        .maps-weather-loc {
          font-size:11px; color:#6b7280; margin-top:4px;
        }

        /* ── Route planner ─────────────── */
        .maps-route-planner {
          position:absolute; top:60px; left:12px; right:12px; z-index:600;
          background:rgba(13,17,23,0.96); backdrop-filter:blur(12px);
          border-radius:16px; padding:16px;
          box-shadow:0 8px 32px rgba(0,0,0,0.5); border:1px solid #374151;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .maps-route-planner--hidden { display:none; }
        .maps-route-planner-header {
          display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;
        }
        .maps-route-close {
          background:none; border:none; color:#9ca3af; cursor:pointer; padding:4px;
          display:flex; align-items:center;
        }
        .maps-route-inputs { display:flex; flex-direction:column; gap:8px; margin-bottom:12px; }
        .maps-route-input-row { display:flex; align-items:center; gap:10px; }
        .maps-route-dot { width:12px; height:12px; border-radius:50%; flex-shrink:0; }
        .maps-route-input {
          flex:1; background:#1f2937; border:1px solid #374151; border-radius:10px;
          padding:10px 14px; color:#f9fafb; font-size:14px; font-family:'Nunito',sans-serif;
          outline:none; transition:border-color 0.2s;
        }
        .maps-route-input:focus { border-color:#E53935; }
        .maps-route-actions { display:flex; gap:8px; align-items:center; }
        .maps-route-select {
          flex:1; background:#1f2937; border:1px solid #374151; border-radius:10px;
          padding:8px 12px; color:#f9fafb; font-size:13px; font-family:'Nunito',sans-serif;
          outline:none;
        }
        .maps-route-go {
          background:#E53935; color:#fff; border:none; border-radius:10px;
          padding:8px 16px; font-size:13px; font-weight:700; cursor:pointer;
          display:flex; align-items:center; gap:6px; font-family:'Exo 2',sans-serif;
          white-space:nowrap; transition:opacity 0.2s;
        }
        .maps-route-go:disabled { opacity:0.5; cursor:not-allowed; }
        .maps-route-summary { margin-top:12px; }
        .maps-route-summary--hidden { display:none; }
        .maps-route-summary-cards {
          display:flex; gap:8px;
        }
        .maps-route-stat {
          flex:1; background:#1f2937; border-radius:10px; padding:10px 12px; text-align:center;
        }
        .maps-route-stat-val {
          font-family:'Exo 2',sans-serif; font-weight:800; font-size:18px; color:#f9fafb;
        }
        .maps-route-stat-label { font-size:11px; color:#9ca3af; margin-top:2px; }

        /* ── Directions panel ──────────── */
        .maps-directions {
          position:absolute; bottom:280px; left:12px; right:12px; z-index:500;
          background:rgba(13,17,23,0.95); backdrop-filter:blur(10px);
          border-radius:16px; padding:12px; max-height:200px; overflow-y:auto;
          border:1px solid #374151; box-shadow:0 -4px 20px rgba(0,0,0,0.3);
        }
        .maps-directions--hidden { display:none; }
        .maps-directions-header {
          display:flex; justify-content:space-between; align-items:center;
          margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid #1f2937;
        }
        .maps-directions-close {
          background:none; border:none; color:#9ca3af; cursor:pointer; padding:2px;
          display:flex; align-items:center;
        }
        .maps-directions-list { display:flex; flex-direction:column; gap:4px; }
        .maps-dir-step {
          display:flex; align-items:flex-start; gap:10px; padding:6px 4px;
          border-bottom:1px solid rgba(31,41,55,0.5);
        }
        .maps-dir-num {
          width:22px; height:22px; border-radius:50%; background:#E53935;
          color:#fff; font-size:11px; font-weight:700; display:flex;
          align-items:center; justify-content:center; flex-shrink:0;
        }
        .maps-dir-text { flex:1; font-size:13px; color:#d1d5db; line-height:1.4; }
        .maps-dir-dist { font-size:11px; color:#6b7280; flex-shrink:0; }

        /* ── Map ────────────────────────── */
        .maps-leaflet {
          flex:1; min-height:300px; z-index:1;
          background:#1a2332;
        }
        .maps-leaflet .leaflet-control-zoom a {
          background:#1f2937 !important; color:#f9fafb !important; border-color:#374151 !important;
        }
        .maps-leaflet .leaflet-control-attribution {
          background:rgba(13,17,23,0.7) !important; color:#6b7280 !important; font-size:9px !important;
        }
        .maps-leaflet .leaflet-control-attribution a { color:#9ca3af !important; }
        .leaflet-popup-content-wrapper {
          background:#1f2937 !important; color:#f9fafb !important; border-radius:12px !important;
          box-shadow:0 4px 12px rgba(0,0,0,0.4) !important;
        }
        .leaflet-popup-tip { background:#1f2937 !important; }

        /* ── Bottom panel ───────────────── */
        .maps-panel {
          position:relative; z-index:400;
          background:#0d1117; border-top:1px solid #1f2937;
          padding:12px 16px; max-height:220px; overflow-y:auto;
        }
        .maps-panel-header {
          display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;
        }
        .maps-panel-title {
          font-family:'Exo 2',sans-serif; font-weight:700; font-size:15px; color:#f9fafb;
        }
        .maps-panel-refresh {
          background:none; border:none; color:#E53935; font-size:12px; font-weight:700;
          cursor:pointer; display:flex; align-items:center; gap:4px;
        }
        .maps-panel-refresh svg { width:14px; height:14px; stroke:#E53935; }

        .maps-rides-list { display:flex; flex-direction:column; gap:8px; }
        .maps-rides-empty { color:#6b7280; font-size:13px; text-align:center; padding:16px 0; }

        .maps-ride-item {
          background:#1f2937; border-radius:12px; padding:12px 14px;
          display:flex; justify-content:space-between; align-items:center;
          cursor:pointer; transition:background 0.15s;
        }
        .maps-ride-item:active { background:#374151; }
        .maps-ride-info { flex:1; }
        .maps-ride-title {
          font-family:'Exo 2',sans-serif; font-weight:700; font-size:14px; color:#f9fafb;
        }
        .maps-ride-meta { font-size:11px; color:#9ca3af; margin-top:3px; display:flex; gap:10px; }
        .maps-ride-dist {
          background:rgba(229,57,53,0.15); color:#E53935; font-size:11px; font-weight:700;
          padding:4px 10px; border-radius:12px; white-space:nowrap;
        }
        /* ── POI bar ─────────────────── */
        .maps-poi-bar {
          position:absolute; top:60px; right:12px; z-index:500;
          display:flex; gap:6px;
        }
        .maps-poi-toggle {
          background:rgba(31,41,55,0.9); backdrop-filter:blur(8px);
          border:1px solid #374151; border-radius:20px;
          padding:6px 12px; color:#9ca3af; font-size:12px;
          font-family:'Nunito',sans-serif; cursor:pointer;
          transition:all 0.2s; white-space:nowrap;
        }
        .maps-poi-toggle.active { background:#E53935; color:#fff; border-color:#E53935; }
        .maps-poi-popup-title { font-size:13px; font-weight:700; color:#f9fafb; }
        .maps-poi-popup-sub { font-size:11px; color:#9ca3af; margin-top:2px; }
        @keyframes riderPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
        }
      </style>
    </div>
  `;
}

/* ── State ────────────────────────────────── */

let map = null;
let userMarker = null;
let rideMarkers = [];
let currentLat = null;
let currentLng = null;
let routeLayer = null;
let startMarker = null;
let endMarker = null;
let routePlannerOpen = false;
let poiMarkers = { cafe: [], fuel: [], viewpoint: [] };
let poiActive = { cafe: false, fuel: false, viewpoint: false };
let weatherMarkers = [];
let riderMarkers = [];
let riderInterval = null;

/* ── Mount ────────────────────────────────── */

export function mount() {
  initMap();

  document.getElementById('maps-locate-btn')?.addEventListener('click', () => {
    locateUser(true);
  });

  document.getElementById('maps-refresh-rides')?.addEventListener('click', () => {
    if (currentLat && currentLng) {
      loadNearbyRides(currentLat, currentLng);
    }
  });

  // Route planner toggle
  document.getElementById('maps-route-btn')?.addEventListener('click', toggleRoutePlanner);
  document.getElementById('maps-route-close')?.addEventListener('click', toggleRoutePlanner);
  document.getElementById('maps-route-go')?.addEventListener('click', calculateRoute);
  document.getElementById('maps-directions-close')?.addEventListener('click', () => {
    document.getElementById('maps-directions')?.classList.add('maps-directions--hidden');
  });

  // Allow Enter to trigger route
  document.getElementById('maps-route-end')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') calculateRoute();
  });

  // POI toggles
  document.querySelectorAll('.maps-poi-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.poi;
      poiActive[type] = !poiActive[type];
      btn.classList.toggle('active', poiActive[type]);
      if (poiActive[type]) {
        loadPOI(type);
      } else {
        clearPOI(type);
      }
    });
  });
}

export function cleanup() {
  if (map) {
    map.remove();
    map = null;
  }
  userMarker = null;
  rideMarkers = [];
  routeLayer = null;
  startMarker = null;
  endMarker = null;
  Object.values(poiMarkers).flat().forEach(m => m.remove());
  poiMarkers = { cafe: [], fuel: [], viewpoint: [] };
  poiActive = { cafe: false, fuel: false, viewpoint: false };
  weatherMarkers.forEach(m => m.remove());
  weatherMarkers = [];
  riderMarkers.forEach(m => m.remove());
  riderMarkers = [];
  if (riderInterval) { clearInterval(riderInterval); riderInterval = null; }
}

/* ── Route Planner ───────────────────────── */

function toggleRoutePlanner() {
  const planner = document.getElementById('maps-route-planner');
  const weather = document.getElementById('maps-weather');
  if (!planner) return;

  routePlannerOpen = !routePlannerOpen;
  planner.classList.toggle('maps-route-planner--hidden', !routePlannerOpen);

  // Hide weather when planner is open
  if (weather) {
    weather.style.display = routePlannerOpen ? 'none' : '';
  }

  // Pre-fill start with current location
  if (routePlannerOpen && currentLat && currentLng) {
    const startInput = document.getElementById('maps-route-start');
    if (startInput && !startInput.value) {
      startInput.value = 'My Location';
      startInput.dataset.lat = currentLat;
      startInput.dataset.lng = currentLng;
    }
  }
}

async function geocodeInput(value, inputEl) {
  // Check if we already have coords from GPS
  if (inputEl?.dataset.lat && inputEl?.dataset.lng && value === 'My Location') {
    return { lat: parseFloat(inputEl.dataset.lat), lng: parseFloat(inputEl.dataset.lng) };
  }

  if (!value || !value.trim()) return null;

  try {
    const res = await api.get(`/api/routes/geocode?text=${encodeURIComponent(value.trim())}${
      currentLat ? `&focusLat=${currentLat}&focusLng=${currentLng}` : ''
    }`);

    if (res.success && res.data) {
      return { lat: res.data.lat, lng: res.data.lng, label: res.data.label };
    }
  } catch {
    // fall through
  }
  return null;
}

async function calculateRoute() {
  const goBtn = document.getElementById('maps-route-go');
  const startInput = document.getElementById('maps-route-start');
  const endInput = document.getElementById('maps-route-end');
  const profile = document.getElementById('maps-route-profile')?.value || 'driving-car';
  const summaryEl = document.getElementById('maps-route-summary');

  if (!startInput?.value?.trim() || !endInput?.value?.trim()) return;

  goBtn.disabled = true;
  goBtn.innerHTML = '⏳ Calculating...';

  try {
    // Geocode both endpoints
    const [startGeo, endGeo] = await Promise.all([
      geocodeInput(startInput.value, startInput),
      geocodeInput(endInput.value, endInput)
    ]);

    if (!startGeo) {
      showRouteError('Could not find start location');
      return;
    }
    if (!endGeo) {
      showRouteError('Could not find destination');
      return;
    }

    // Request directions from ORS via backend
    const res = await api.post('/api/routes/directions', {
      coordinates: [[startGeo.lng, startGeo.lat], [endGeo.lng, endGeo.lat]],
      profile,
      instructions: true
    });

    if (!res.success || !res.data?.features?.[0]) {
      showRouteError('No route found');
      return;
    }

    const feature = res.data.features[0];
    const geom = feature.geometry;
    const props = feature.properties;
    const segments = props?.segments || [];

    // Draw route on map
    clearRoute();
    const latlngs = geom.coordinates.map(c => [c[1], c[0]]);

    routeLayer = L.polyline(latlngs, {
      color: '#E53935',
      weight: 5,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Start marker (green)
    startMarker = L.circleMarker([startGeo.lat, startGeo.lng], {
      radius: 8, fillColor: '#22c55e', color: '#fff', weight: 2, fillOpacity: 0.9
    }).addTo(map).bindPopup(`<b style="color:#f9fafb">Start</b><br><span style="color:#9ca3af;font-size:12px">${escapeHtml(startInput.value)}</span>`);

    // End marker (red)
    endMarker = L.circleMarker([endGeo.lat, endGeo.lng], {
      radius: 8, fillColor: '#E53935', color: '#fff', weight: 2, fillOpacity: 0.9
    }).addTo(map).bindPopup(`<b style="color:#f9fafb">Destination</b><br><span style="color:#9ca3af;font-size:12px">${escapeHtml(endInput.value)}</span>`);

    // Fit map to route
    map.fitBounds(routeLayer.getBounds().pad(0.15));

    // Show summary
    const totalDist = props.summary?.distance || 0;
    const totalTime = props.summary?.duration || 0;
    const distKm = (totalDist / 1000).toFixed(1);
    const hrs = Math.floor(totalTime / 3600);
    const mins = Math.round((totalTime % 3600) / 60);
    const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;

    if (summaryEl) {
      summaryEl.classList.remove('maps-route-summary--hidden');
      summaryEl.innerHTML = `
        <div class="maps-route-summary-cards">
          <div class="maps-route-stat">
            <div class="maps-route-stat-val">${distKm}</div>
            <div class="maps-route-stat-label">km</div>
          </div>
          <div class="maps-route-stat">
            <div class="maps-route-stat-val">${timeStr}</div>
            <div class="maps-route-stat-label">est. time</div>
          </div>
        </div>
      `;
    }

    // Show turn-by-turn directions
    if (segments.length > 0) {
      showDirections(segments);
    }

    // Load weather along route
    loadRouteWeather(geom.coordinates);
  } catch (err) {
    showRouteError(err?.message || 'Route calculation failed');
  } finally {
    goBtn.disabled = false;
    goBtn.innerHTML = `${NAV_ICON} Get Route`;
  }
}

function showRouteError(msg) {
  const summaryEl = document.getElementById('maps-route-summary');
  if (summaryEl) {
    summaryEl.classList.remove('maps-route-summary--hidden');
    summaryEl.innerHTML = `<div style="color:#ef4444;font-size:13px;text-align:center;padding:8px 0;">${escapeHtml(msg)}</div>`;
  }
}

function clearRoute() {
  if (routeLayer && map) { map.removeLayer(routeLayer); routeLayer = null; }
  if (startMarker && map) { map.removeLayer(startMarker); startMarker = null; }
  if (endMarker && map) { map.removeLayer(endMarker); endMarker = null; }
  weatherMarkers.forEach(m => map && map.removeLayer(m));
  weatherMarkers = [];
}

function showDirections(segments) {
  const panel = document.getElementById('maps-directions');
  const list = document.getElementById('maps-directions-list');
  if (!panel || !list) return;

  let html = '';
  let stepNum = 1;

  segments.forEach(seg => {
    (seg.steps || []).forEach(step => {
      const distKm = (step.distance / 1000).toFixed(1);
      const distStr = step.distance < 1000 ? `${Math.round(step.distance)}m` : `${distKm} km`;

      html += `
        <div class="maps-dir-step">
          <div class="maps-dir-num">${stepNum}</div>
          <div class="maps-dir-text">${escapeHtml(step.instruction)}</div>
          <div class="maps-dir-dist">${distStr}</div>
        </div>
      `;
      stepNum++;
    });
  });

  list.innerHTML = html;
  panel.classList.remove('maps-directions--hidden');
}

/* ── Map init ─────────────────────────────── */

function initMap() {
  const defaultLat = 20.5937;
  const defaultLng = 78.9629;
  const defaultZoom = 5;

  const mapEl = document.getElementById('leaflet-map');
  if (!mapEl || typeof L === 'undefined') {
    mapEl && (mapEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;">Map library not available offline</div>');
    return;
  }

  map = L.map('leaflet-map', {
    center: [defaultLat, defaultLng],
    zoom: defaultZoom,
    zoomControl: true,
    attributionControl: true,
  });

  // Dark tile layer — OpenStreetMap via CartoDB Dark Matter
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &amp; <a href="https://carto.com/">CARTO</a> | Routing by <a href="https://openrouteservice.org">ORS</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  // Start geolocation
  locateUser(false);
}

/* ── Geolocation ──────────────────────────── */

function locateUser(flyTo) {
  if (!navigator.geolocation) {
    showWeatherError('Geolocation not supported');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      currentLat = pos.coords.latitude;
      currentLng = pos.coords.longitude;

      if (map) {
        if (flyTo) {
          map.flyTo([currentLat, currentLng], 13, { duration: 1.2 });
        } else {
          map.setView([currentLat, currentLng], 13);
        }

        if (userMarker) {
          userMarker.setLatLng([currentLat, currentLng]);
        } else {
          const pulseIcon = L.divIcon({
            className: '',
            html: `<div style="
              width:18px;height:18px;background:#E53935;border-radius:50%;
              border:3px solid #fff;box-shadow:0 0 12px rgba(229,57,53,0.6);
              animation:pulse 2s infinite;
            "></div>
            <style>@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(229,57,53,0.5)}50%{box-shadow:0 0 0 12px rgba(229,57,53,0)}}</style>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });
          userMarker = L.marker([currentLat, currentLng], { icon: pulseIcon })
            .addTo(map)
            .bindPopup('<b style="color:#f9fafb">You are here</b>');
        }
      }

      loadWeather(currentLat, currentLng);
      loadNearbyRides(currentLat, currentLng);
      loadNearbyRiders();
      if (riderInterval) clearInterval(riderInterval);
      riderInterval = setInterval(loadNearbyRiders, 30000);
    },
    (err) => {
      console.warn('Geolocation error:', err.message);
      showWeatherError('Location access denied. Enable GPS to see weather & nearby rides.');
      loadNearbyRidesGlobal();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

/* ── Weather ──────────────────────────────── */

async function loadWeather(lat, lng) {
  const el = document.getElementById('maps-weather');
  if (!el) return;

  try {
    const res = await api.get(`/api/weather?lat=${lat}&lng=${lng}`);

    if (res.success && res.data) {
      const w = res.data;
      const temp = Math.round(w.temperature || w.temp || 0);
      const feelsLike = Math.round(w.feelsLike || w.feels_like || temp);
      const desc = w.description || 'Clear';
      const humidity = w.humidity || 0;
      const windSpeed = w.windSpeed || w.wind_speed || 0;
      const icon = w.icon || '01d';
      const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
      const locationName = w.locationName || w.name || '';

      // Safety warnings for bikers
      const warnings = [];
      if (windSpeed > 40) warnings.push('High winds');
      if (desc.toLowerCase().includes('rain') || desc.toLowerCase().includes('storm')) warnings.push('Rain expected');
      if (temp > 42) warnings.push('Extreme heat');

      el.className = 'maps-weather';
      el.innerHTML = `
        <img class="maps-weather-icon" src="${iconUrl}" alt="${desc}" />
        <div class="maps-weather-info">
          <div class="maps-weather-temp">${temp}°C</div>
          <div class="maps-weather-desc">${desc}</div>
          <div class="maps-weather-details">
            <span class="maps-weather-detail">Feels ${feelsLike}°</span>
            <span class="maps-weather-detail">💧 ${humidity}%</span>
            <span class="maps-weather-detail">💨 ${windSpeed} km/h</span>
          </div>
          ${locationName ? `<div class="maps-weather-loc">📍 ${locationName}</div>` : ''}
          ${warnings.length > 0 ? `<div style="margin-top:4px;font-size:11px;color:#fbbf24;font-weight:700;">⚠️ ${warnings.join(' · ')}</div>` : ''}
        </div>
      `;
    } else {
      showWeatherError('Weather data unavailable');
    }
  } catch {
    showWeatherError('Could not load weather');
  }
}

function showWeatherError(msg) {
  const el = document.getElementById('maps-weather');
  if (el) {
    el.className = 'maps-weather maps-weather--loading';
    el.innerHTML = `<div class="maps-weather-loading">${msg}</div>`;
  }
}

/* ── Nearby Rides ─────────────────────────── */

async function loadNearbyRides(lat, lng) {
  const listEl = document.getElementById('maps-rides-list');
  if (!listEl) return;

  listEl.innerHTML = '<div class="maps-rides-empty">Searching for nearby rides...</div>';

  rideMarkers.forEach((m) => map && map.removeLayer(m));
  rideMarkers = [];

  try {
    const res = await api.get(`/api/rides/nearby?lat=${lat}&lng=${lng}&radius=50`);

    let rides = [];
    if (res.success && Array.isArray(res.data)) {
      rides = res.data;
    } else if (res.success && res.data && Array.isArray(res.data.rides)) {
      rides = res.data.rides;
    }

    if (rides.length === 0) {
      const allRes = await api.get('/api/rides?page=1&limit=10');
      if (allRes.success) {
        rides = Array.isArray(allRes.data) ? allRes.data : (allRes.data?.rides || []);
      }
    }

    if (rides.length === 0) {
      listEl.innerHTML = '<div class="maps-rides-empty">No rides nearby. Create one!</div>';
      return;
    }

    renderRidesList(rides, listEl, lat, lng);
    addRideMarkers(rides);
  } catch {
    listEl.innerHTML = '<div class="maps-rides-empty">Could not load rides</div>';
  }
}

async function loadNearbyRidesGlobal() {
  const listEl = document.getElementById('maps-rides-list');
  if (!listEl) return;

  try {
    const res = await api.get('/api/rides?page=1&limit=10');
    let rides = [];
    if (res.success) {
      rides = Array.isArray(res.data) ? res.data : (res.data?.rides || []);
    }

    if (rides.length === 0) {
      listEl.innerHTML = '<div class="maps-rides-empty">No rides yet. Create one!</div>';
      return;
    }

    renderRidesList(rides, listEl, null, null);
    addRideMarkers(rides);
  } catch {
    listEl.innerHTML = '<div class="maps-rides-empty">Could not load rides</div>';
  }
}

function renderRidesList(rides, listEl, userLat, userLng) {
  listEl.innerHTML = rides.map((ride) => {
    const title = ride.title || 'Untitled Ride';
    const date = ride.rideDate ? new Date(ride.rideDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
    const riders = ride.participantsCount || ride.participants?.length || 0;
    const max = ride.maxParticipants || '∞';
    const startLoc = ride.startLocation || '';

    let distStr = '';
    if (userLat && userLng && ride.startCoords?.coordinates) {
      const [rLng, rLat] = ride.startCoords.coordinates;
      const dist = haversine(userLat, userLng, rLat, rLng);
      distStr = dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)} km`;
    } else if (ride.distance != null) {
      distStr = `${Number(ride.distance).toFixed(1)} km`;
    }

    return `
      <div class="maps-ride-item" data-ride-id="${ride._id}">
        <div class="maps-ride-info">
          <div class="maps-ride-title">${escapeHtml(title)}</div>
          <div class="maps-ride-meta">
            ${date ? `<span>📅 ${date}</span>` : ''}
            <span>🏍️ ${riders}/${max}</span>
            ${startLoc ? `<span>📍 ${escapeHtml(startLoc)}</span>` : ''}
          </div>
        </div>
        ${distStr ? `<span class="maps-ride-dist">${distStr}</span>` : ''}
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.maps-ride-item').forEach((item) => {
    item.addEventListener('click', () => {
      const rideId = item.dataset.rideId;
      if (!rideId) return;
      // Navigate to ride detail
      navigate(`/rides/${rideId}`);
    });
  });
}

function addRideMarkers(rides) {
  if (!map) return;

  rides.forEach((ride) => {
    if (!ride.startCoords?.coordinates) return;
    const [lng, lat] = ride.startCoords.coordinates;

    const rideIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:32px;height:32px;background:#E53935;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;
        border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);
      "><span style="transform:rotate(45deg);font-size:14px;">🏍️</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    const title = escapeHtml(ride.title || 'Ride');
    const date = ride.rideDate ? new Date(ride.rideDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const riders = ride.participantsCount || ride.participants?.length || 0;
    const max = ride.maxParticipants || '∞';
    const dest = ride.destination || '';

    const popup = `
      <div style="min-width:160px;">
        <b style="font-size:14px;color:#f9fafb;">${title}</b>
        ${date ? `<div style="font-size:11px;color:#9ca3af;margin-top:4px;">📅 ${date}</div>` : ''}
        <div style="font-size:11px;color:#9ca3af;">🏍️ ${riders}/${max} riders</div>
        ${dest ? `<div style="font-size:11px;color:#9ca3af;">📍 → ${escapeHtml(dest)}</div>` : ''}
        <div style="margin-top:6px;"><a href="#/rides/${ride._id}" style="color:#E53935;font-size:12px;font-weight:700;text-decoration:none;">View Details →</a></div>
      </div>
    `;

    const marker = L.marker([lat, lng], { icon: rideIcon })
      .addTo(map)
      .bindPopup(popup);

    rideMarkers.push(marker);
  });

  if (rideMarkers.length > 0 && userMarker) {
    const group = L.featureGroup([userMarker, ...rideMarkers]);
    map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 13 });
  }
}

/* ── POI (Points of Interest) ──────────── */

const POI_CONFIG = {
  cafe: { query: 'amenity=cafe', icon: '☕', color: '#f59e0b' },
  fuel: { query: 'amenity=fuel', icon: '⛽', color: '#3b82f6' },
  viewpoint: { query: 'tourism=viewpoint', icon: '🏔️', color: '#22c55e' }
};

async function loadPOI(type) {
  if (!map || !currentLat || !currentLng) return;

  clearPOI(type);
  const config = POI_CONFIG[type];
  if (!config) return;

  const bounds = map.getBounds();
  const south = bounds.getSouth();
  const west = bounds.getWest();
  const north = bounds.getNorth();
  const east = bounds.getEast();

  const overpassQuery = `
    [out:json][timeout:10];
    node[${config.query}](${south},${west},${north},${east});
    out body 30;
  `.trim();

  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
    const data = await res.json();

    if (!data.elements || data.elements.length === 0) return;

    data.elements.forEach((el) => {
      if (!el.lat || !el.lon) return;

      const name = el.tags?.name || type.charAt(0).toUpperCase() + type.slice(1);
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:28px;height:28px;background:${config.color};border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);
          font-size:14px;
        ">${config.icon}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16],
      });

      const popupHtml = `
        <div style="min-width:120px;">
          <div class="maps-poi-popup-title">${config.icon} ${escapeHtml(name)}</div>
          ${el.tags?.cuisine ? `<div class="maps-poi-popup-sub">${escapeHtml(el.tags.cuisine)}</div>` : ''}
          ${el.tags?.brand ? `<div class="maps-poi-popup-sub">${escapeHtml(el.tags.brand)}</div>` : ''}
          ${el.tags?.opening_hours ? `<div class="maps-poi-popup-sub">🕐 ${escapeHtml(el.tags.opening_hours)}</div>` : ''}
        </div>
      `;

      const marker = L.marker([el.lat, el.lon], { icon })
        .addTo(map)
        .bindPopup(popupHtml);

      poiMarkers[type].push(marker);
    });
  } catch {
    // Overpass API timeout or error — silently fail
  }
}

function clearPOI(type) {
  if (!map) return;
  (poiMarkers[type] || []).forEach(m => map.removeLayer(m));
  poiMarkers[type] = [];
}

/* ── Utilities ────────────────────────────── */

/* ── Weather Along Route ──────────────── */

async function loadRouteWeather(coordinates) {
  weatherMarkers.forEach(m => map && map.removeLayer(m));
  weatherMarkers = [];

  if (!coordinates || coordinates.length < 2 || !map) return;

  // Sample 3 evenly spaced points along route
  const total = coordinates.length;
  const indices = [
    Math.floor(total * 0.25),
    Math.floor(total * 0.5),
    Math.floor(total * 0.75)
  ];

  const points = indices.map(i => coordinates[Math.min(i, total - 1)]);

  for (const [lng, lat] of points) {
    try {
      const res = await api.get(`/api/weather?lat=${lat}&lng=${lng}`);
      if (!res.success || !res.data) continue;

      const w = res.data;
      const temp = Math.round(w.temperature || w.temp || 0);
      const icon = w.icon || '01d';
      const desc = w.description || '';

      const weatherIcon = L.divIcon({
        className: '',
        html: `<div style="
          background:rgba(31,41,55,0.9);backdrop-filter:blur(6px);
          border-radius:10px;padding:4px 8px;display:flex;align-items:center;gap:4px;
          border:1px solid #374151;box-shadow:0 2px 8px rgba(0,0,0,0.3);
          white-space:nowrap;
        ">
          <img src="https://openweathermap.org/img/wn/${icon}.png" width="24" height="24" />
          <span style="color:#f9fafb;font-size:12px;font-weight:700;">${temp}°</span>
        </div>`,
        iconSize: [80, 32],
        iconAnchor: [40, 16],
      });

      const marker = L.marker([lat, lng], { icon: weatherIcon, interactive: true })
        .addTo(map)
        .bindPopup(`<div style="text-align:center;"><b style="color:#f9fafb;">${temp}°C</b><br><span style="color:#9ca3af;font-size:12px;text-transform:capitalize;">${escapeHtml(desc)}</span></div>`);

      weatherMarkers.push(marker);
    } catch {
      // Skip this point
    }
  }
}

/* ── Nearby Riders ────────────────────── */

async function loadNearbyRiders() {
  if (!map || !currentLat || !currentLng) return;

  riderMarkers.forEach(m => map && map.removeLayer(m));
  riderMarkers = [];

  try {
    const res = await api.get('/api/rides?status=active&page=1&limit=20');
    let rides = [];
    if (res.success) {
      rides = Array.isArray(res.data) ? res.data : (res.data?.rides || []);
    }

    for (const ride of rides) {
      if (!ride._id) continue;
      try {
        const locRes = await api.get(`/api/rides/${ride._id}/locations`);
        if (!locRes.success || !locRes.data) continue;

        const locations = Array.isArray(locRes.data) ? locRes.data : (locRes.data.locations || []);
        locations.forEach((loc) => {
          if (!loc.lat && !loc.latitude) return;
          const lat = loc.lat || loc.latitude;
          const lng = loc.lng || loc.longitude;
          const username = loc.username || loc.user?.username || 'Rider';

          const riderIcon = L.divIcon({
            className: '',
            html: `<div style="
              width:14px;height:14px;background:#22c55e;border-radius:50%;
              border:2px solid #fff;box-shadow:0 0 8px rgba(34,197,94,0.5);
              animation:riderPulse 2s infinite;
            "></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });

          const marker = L.marker([lat, lng], { icon: riderIcon })
            .addTo(map)
            .bindPopup(`<b style="color:#f9fafb;">🏍️ ${escapeHtml(username)}</b><br><span style="color:#9ca3af;font-size:11px;">${escapeHtml(ride.title || 'Active ride')}</span>`);

          riderMarkers.push(marker);
        });
      } catch {
        // Skip this ride
      }
    }
  } catch {
    // silently fail
  }
}

/* ── Utilities ────────────────────────── */

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
