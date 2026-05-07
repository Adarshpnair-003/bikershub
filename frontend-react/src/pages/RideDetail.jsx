import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api.js';
import { getCurrentUser } from '../utils/auth.js';
import { socketManager } from '../utils/socket.js';

function formatDate(d) {
  if (!d) return 'TBD';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function loadLeaflet() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.L) return Promise.resolve(window.L);
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('leaflet-js');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L));
      return;
    }
    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function RideDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = getCurrentUser();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerStoreRef = useRef({});
  const locHandlerRef = useRef(null);

  const [ride, setRide] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await api.get(`/api/rides/${id}`);
      if (res?.success) setRide(res.data);
      else setError(res?.error?.message || 'Ride not found');
    } catch { setError('Network error'); }
  }

  useEffect(() => { load(); }, [id]);

  // Map setup once we have ride data
  useEffect(() => {
    if (!ride) return;
    let cancelled = false;
    async function init() {
      const L = await loadLeaflet();
      if (cancelled || !mapContainerRef.current) return;

      let centerLat = 20.5937, centerLng = 78.9629, zoom = 5;
      if (ride.startCoords?.coordinates) {
        [centerLng, centerLat] = ride.startCoords.coordinates;
        zoom = 12;
      }

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng], zoom, zoomControl: true
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM &amp; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      // Endpoint markers
      if (ride.startCoords?.coordinates) {
        const [lng, lat] = ride.startCoords.coordinates;
        L.marker([lat, lng]).addTo(map).bindPopup(`Start: ${ride.startLocation || ''}`);
      }
      if (ride.destinationCoords?.coordinates) {
        const [lng, lat] = ride.destinationCoords.coordinates;
        L.marker([lat, lng]).addTo(map).bindPopup(`End: ${ride.destination || ''}`);
      }

      // Live tracking for active ride
      if (ride.status === 'active' || ride.status === 'live') {
        try {
          const res = await api.get(`/api/rides/${id}/locations`);
          const locations = res?.success ? (Array.isArray(res.data) ? res.data : (res.data?.locations || [])) : [];
          locations.forEach((loc) => {
            const lat = loc.lat || loc.latitude;
            const lng = loc.lng || loc.longitude;
            const uid = loc.userId || loc.user;
            if (uid && lat != null && lng != null) {
              markerStoreRef.current[uid] = L.marker([lat, lng]).addTo(map).bindPopup(loc.username || 'Rider');
            }
          });
        } catch { /* */ }

        try {
          socketManager?.connect?.();
          socketManager?.joinRide?.(id);
          locHandlerRef.current = (data) => {
            if (!mapRef.current) return;
            const { userId, lat, lng, username } = data;
            if (!userId || lat == null || lng == null) return;
            if (markerStoreRef.current[userId]) {
              markerStoreRef.current[userId].setLatLng([lat, lng]);
            } else {
              markerStoreRef.current[userId] = L.marker([lat, lng]).addTo(mapRef.current).bindPopup(username || 'Rider');
            }
          };
          socketManager?.onRiderLocation?.(locHandlerRef.current);
        } catch { /* */ }
      }
    }
    init();
    return () => {
      cancelled = true;
      if (locHandlerRef.current) {
        socketManager?.offRiderLocation?.(locHandlerRef.current);
        locHandlerRef.current = null;
      }
      socketManager?.leaveRide?.(id);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerStoreRef.current = {};
    };
  }, [ride, id]);

  async function callRideAction(method, path, label) {
    setBusy(true);
    try {
      const res = method === 'PUT'
        ? await api.put(path)
        : await api.post(path);
      if (res?.success) load();
      else alert(res?.error?.message || `Failed to ${label}`);
    } finally { setBusy(false); }
  }

  if (error) return <div className="page-dark" style={{ padding: 60, textAlign: 'center', color: '#E53935' }}>{error}</div>;
  if (!ride) return <div className="page-dark" style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>Loading…</div>;

  const isCreator = String(ride.createdBy?._id || ride.createdBy) === String(me?.id);
  const participants = ride.participants || [];
  const isParticipant = participants.some((p) => String(p._id || p) === String(me?.id));
  const count = participants.length;
  const max = ride.maxParticipants || '--';

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-left">
          <button className="app-header-btn" onClick={() => navigate('/home')}>←</button>
        </div>
        <div className="app-header-title">Ride</div>
        <div className="app-header-actions" />
      </header>

      <section style={{ padding: '20px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 8px' }}>{ride.title}</h1>
        <div style={{ fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>{ride.status}</div>
        {ride.description && <p style={{ color: '#cbd5e1', fontSize: 14, margin: 0 }}>{ride.description}</p>}
      </section>

      <Row label="From" value={ride.startLocation} />
      <Row label="To" value={ride.destination} />
      <Row label="Date" value={formatDate(ride.rideDate)} />
      <Row label="Riders" value={`${count} / ${max}`} />

      <div style={{ padding: 16 }}>
        <div ref={mapContainerRef} style={{ height: 280, width: '100%', borderRadius: 14, background: '#1E1E1E' }} />
      </div>

      {participants.length > 0 && (
        <section style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Participants · {count}</div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {participants.map((p) => {
              const pid = p._id || p.id || p;
              const name = p.username || p.name || 'Rider';
              return (
                <button
                  key={pid}
                  onClick={() => navigate(`/user/${pid}`)}
                  style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#343434', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#F3F3F3' }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(243,243,243,0.7)' }}>{name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div style={{ padding: '8px 16px 32px' }}>
        {ride.status === 'scheduled' && (
          isCreator
            ? <button onClick={() => callRideAction('PUT', `/api/rides/${id}/start`, 'start')} disabled={busy} style={btnStyle('primary')}>{busy ? '…' : 'Start ride'}</button>
            : isParticipant
              ? <button onClick={() => callRideAction('POST', `/api/rides/${id}/leave`, 'leave')} disabled={busy} style={btnStyle('outline')}>{busy ? '…' : 'Leave ride'}</button>
              : <button onClick={() => callRideAction('POST', `/api/rides/${id}/join`, 'join')} disabled={busy} style={btnStyle('primary')}>{busy ? '…' : 'Join ride'}</button>
        )}
        {ride.status === 'active' && isCreator && (
          <button onClick={() => callRideAction('PUT', `/api/rides/${id}/end`, 'end')} disabled={busy} style={btnStyle('primary')}>{busy ? '…' : 'End ride'}</button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(243,243,243,0.06)' }}>
      <span style={{ fontSize: 12, color: 'rgba(243,243,243,0.5)', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 14.5, fontWeight: 600, maxWidth: '60%', textAlign: 'right' }}>{value || ''}</span>
    </div>
  );
}

function btnStyle(variant) {
  const base = { width: '100%', height: 48, borderRadius: 12, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', border: '1px solid transparent' };
  if (variant === 'primary') return { ...base, background: '#E53935', color: '#fff' };
  return { ...base, background: 'transparent', color: '#F3F3F3', borderColor: 'rgba(243,243,243,0.18)' };
}
