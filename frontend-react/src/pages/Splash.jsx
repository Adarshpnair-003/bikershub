import { Link } from 'react-router-dom';

export default function Splash() {
  return (
    <div className="splash-wrap">
      <div className="splash-hero">
        <div className="splash-logo">🏍</div>
        <h1 className="splash-title">BIKERS HUB</h1>
        <p className="splash-tag">Ride. Share. Connect.</p>
        <p className="splash-playground-badge">React Playground</p>
      </div>
      <div className="splash-actions">
        <Link to="/login" className="splash-btn primary">Log in</Link>
        <Link to="/register" className="splash-btn outline">Create account</Link>
      </div>
    </div>
  );
}
