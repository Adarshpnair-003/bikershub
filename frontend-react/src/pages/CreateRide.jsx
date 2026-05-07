import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';

export default function CreateRide() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [rideDate, setRideDate] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function geocode(addr) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`);
      const j = await r.json();
      if (j.length > 0) return [parseFloat(j[0].lon), parseFloat(j[0].lat)];
    } catch { /* ignore */ }
    return null;
  }

  async function handleSubmit() {
    if (!title.trim() || !startLocation.trim() || !destination.trim() || !rideDate) {
      setError('All fields except description are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const [startCoords, destCoords] = await Promise.all([
        geocode(startLocation),
        geocode(destination)
      ]);

      const body = {
        title: title.trim(),
        description: description.trim(),
        startLocation: startLocation.trim(),
        destination: destination.trim(),
        rideDate,
        maxParticipants: parseInt(maxParticipants, 10) || 10
      };
      if (startCoords) body.startCoords = { type: 'Point', coordinates: startCoords };
      if (destCoords) body.destinationCoords = { type: 'Point', coordinates: destCoords };

      const res = await api.post('/api/rides', body);
      if (res?.success) navigate(`/rides/${res.data._id}`);
      else { setError(res?.error?.message || 'Failed.'); setBusy(false); }
    } catch {
      setError('Network error.');
      setBusy(false);
    }
  }

  return (
    <div className="page-dark">
      <header className="app-header">
        <div className="app-header-left">
          <button className="app-header-btn" onClick={() => navigate('/home')}>←</button>
        </div>
        <div className="app-header-title">New ride</div>
        <div className="app-header-actions">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            style={{ background: 'transparent', border: 'none', color: '#E53935', fontSize: 14, fontWeight: 700, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {busy ? '…' : 'Create'}
          </button>
        </div>
      </header>

      {error && <div style={{ margin: '12px 16px', padding: 10, background: 'rgba(229,57,53,0.10)', color: '#E53935', borderRadius: 10, fontSize: 13 }}>{error}</div>}

      <form>
        <Field label="Title" value={title} onChange={setTitle} maxLength={80} />
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(243,243,243,0.06)' }}>
          <label style={fieldLabelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            style={{ ...fieldInputStyle, resize: 'vertical' }}
          />
        </div>
        <Field label="Start location" value={startLocation} onChange={setStartLocation} />
        <Field label="Destination" value={destination} onChange={setDestination} />
        <Field label="Date & Time" type="datetime-local" value={rideDate} onChange={setRideDate} />
        <Field label="Max participants" type="number" min={2} max={50} value={maxParticipants} onChange={setMaxParticipants} />
      </form>
    </div>
  );
}

const fieldLabelStyle = {
  fontSize: 11, color: 'rgba(243,243,243,0.5)',
  textTransform: 'uppercase', fontWeight: 600
};
const fieldInputStyle = {
  background: 'transparent', border: 'none', outline: 'none',
  padding: '6px 0', color: '#F3F3F3', fontSize: 16, width: '100%',
  fontFamily: 'inherit', display: 'block'
};

function Field({ label, value, onChange, ...rest }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(243,243,243,0.06)' }}>
      <label style={fieldLabelStyle}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest} style={fieldInputStyle} />
    </div>
  );
}
