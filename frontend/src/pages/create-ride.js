/**
 * Create Ride page for Bikers Hub
 * Form to create a new ride with ORS route preview
 */

import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';

const BACK_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9fafb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;

let previewMap = null;
let previewRoute = null;
let previewStart = null;
let previewEnd = null;
let previewTimer = null;

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

          <!-- Route preview map -->
          <div id="cr-route-preview" style="display:none;">
            <div id="cr-preview-map" style="height:180px;border-radius:12px;overflow:hidden;background:#1a2332;"></div>
            <div id="cr-route-info" style="display:flex;gap:8px;margin-top:8px;">
            </div>
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

  // Auto-preview route when both locations are filled
  const startInput = document.getElementById('cr-start');
  const destInput = document.getElementById('cr-dest');

  const triggerPreview = () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      const s = startInput?.value?.trim();
      const d = destInput?.value?.trim();
      if (s && d && s.length > 2 && d.length > 2) {
        loadRoutePreview(s, d);
      }
    }, 1000); // 1s debounce
  };

  startInput?.addEventListener('blur', triggerPreview);
  destInput?.addEventListener('blur', triggerPreview);
}

export function cleanup() {
  clearTimeout(previewTimer);
  if (previewMap) { previewMap.remove(); previewMap = null; }
  previewRoute = null;
  previewStart = null;
  previewEnd = null;
}

async function loadRoutePreview(startText, destText) {
  const previewEl = document.getElementById('cr-route-preview');
  const mapEl = document.getElementById('cr-preview-map');
  const infoEl = document.getElementById('cr-route-info');
  if (!previewEl || !mapEl || typeof L === 'undefined') return;

  previewEl.style.display = 'block';

  // Initialize map if needed
  if (!previewMap) {
    previewMap = L.map(mapEl, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(previewMap);
  }

  // Clear previous route
  if (previewRoute) { previewMap.removeLayer(previewRoute); previewRoute = null; }
  if (previewStart) { previewMap.removeLayer(previewStart); previewStart = null; }
  if (previewEnd) { previewMap.removeLayer(previewEnd); previewEnd = null; }

  if (infoEl) {
    infoEl.innerHTML = '<div style="color:#9ca3af;font-size:12px;text-align:center;width:100%;">Calculating route...</div>';
  }

  try {
    // Geocode both locations
    const [startGeo, destGeo] = await Promise.all([
      api.get(`/api/routes/geocode?text=${encodeURIComponent(startText)}`),
      api.get(`/api/routes/geocode?text=${encodeURIComponent(destText)}`)
    ]);

    if (!startGeo.success || !startGeo.data || !destGeo.success || !destGeo.data) {
      if (infoEl) infoEl.innerHTML = '<div style="color:#ef4444;font-size:12px;text-align:center;width:100%;">Could not find locations</div>';
      return;
    }

    const s = startGeo.data;
    const d = destGeo.data;

    // Get route from ORS
    const routeRes = await api.post('/api/routes/directions', {
      coordinates: [[s.lng, s.lat], [d.lng, d.lat]],
      profile: 'driving-car',
      instructions: false
    });

    if (!routeRes.success || !routeRes.data?.features?.[0]) {
      if (infoEl) infoEl.innerHTML = '<div style="color:#ef4444;font-size:12px;text-align:center;width:100%;">No route found</div>';
      return;
    }

    const feature = routeRes.data.features[0];
    const latlngs = feature.geometry.coordinates.map(c => [c[1], c[0]]);

    // Draw route
    previewRoute = L.polyline(latlngs, {
      color: '#E53935', weight: 3, opacity: 0.8
    }).addTo(previewMap);

    // Markers
    previewStart = L.circleMarker([s.lat, s.lng], {
      radius: 6, fillColor: '#22c55e', color: '#fff', weight: 2, fillOpacity: 0.9
    }).addTo(previewMap);

    previewEnd = L.circleMarker([d.lat, d.lng], {
      radius: 6, fillColor: '#E53935', color: '#fff', weight: 2, fillOpacity: 0.9
    }).addTo(previewMap);

    previewMap.fitBounds(previewRoute.getBounds().pad(0.15));

    // Show info
    const summary = feature.properties?.summary;
    if (summary && infoEl) {
      const distKm = (summary.distance / 1000).toFixed(1);
      const hrs = Math.floor(summary.duration / 3600);
      const mins = Math.round((summary.duration % 3600) / 60);
      const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;

      infoEl.innerHTML = `
        <div style="flex:1;background:#1f2937;border-radius:10px;padding:8px;text-align:center;">
          <div style="font-family:'Exo 2',sans-serif;font-weight:800;font-size:16px;color:#f9fafb;">${distKm} km</div>
          <div style="font-size:10px;color:#9ca3af;">distance</div>
        </div>
        <div style="flex:1;background:#1f2937;border-radius:10px;padding:8px;text-align:center;">
          <div style="font-family:'Exo 2',sans-serif;font-weight:800;font-size:16px;color:#f9fafb;">${timeStr}</div>
          <div style="font-size:10px;color:#9ca3af;">est. time</div>
        </div>
      `;
    }
  } catch {
    if (infoEl) infoEl.innerHTML = '<div style="color:#6b7280;font-size:12px;text-align:center;width:100%;">Route preview unavailable</div>';
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
      const rideId = res.data?._id || res.data?.id;
      navigate(rideId ? `/rides/${rideId}` : '/clubs');
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
