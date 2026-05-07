import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import TabBar from '../components/TabBar.jsx';

/**
 * Loads Leaflet's CSS + JS dynamically once. Returns a promise that resolves
 * to the global L when Leaflet is available.
 */
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
      existing.addEventListener('error', reject);
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

export default function Maps() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let map;

    async function init() {
      const L = await loadLeaflet();
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, {
        center: [20.5937, 78.9629], // India center
        zoom: 5,
        zoomControl: true
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM &amp; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      // Try to show user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled || !map) return;
            const { latitude, longitude } = pos.coords;
            L.marker([latitude, longitude]).addTo(map).bindPopup('You are here');
            map.setView([latitude, longitude], 13);
          },
          () => {}
        );
      }

      // Try to load nearby rides as markers
      try {
        const res = await api.get('/api/rides/nearby?radius=50');
        if (res?.success) {
          const rides = Array.isArray(res.data) ? res.data : (res.data?.rides || []);
          rides.forEach((ride) => {
            if (ride.startCoords?.coordinates) {
              const [lng, lat] = ride.startCoords.coordinates;
              L.marker([lat, lng])
                .addTo(map)
                .bindPopup(`<strong>${ride.title}</strong><br/><a href="#/rides/${ride._id}">View ride</a>`);
            }
          });
        }
      } catch { /* ignore */ }
    }

    init();
    return () => {
      cancelled = true;
      if (map) { map.remove(); }
    };
  }, []);

  return (
    <div className="page-dark" style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <header className="app-header">
        <div className="app-header-title">Map</div>
      </header>
      <div
        ref={containerRef}
        style={{ flex: 1, background: '#1E1E1E', minHeight: 200 }}
      />
      <TabBar />
    </div>
  );
}
