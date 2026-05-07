import { Link } from 'react-router-dom';
import TabBar from '../components/TabBar.jsx';

export default function Placeholder({ name }) {
  return (
    <div className="page-dark" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header">
        <div className="app-header-left">
          <Link to="/home" className="app-header-btn" style={{ textDecoration: 'none', color: '#F3F3F3' }}>←</Link>
        </div>
        <div className="app-header-title">{name}</div>
        <div className="app-header-actions" />
      </header>

      <section style={{ flex: 1, padding: '60px 24px', textAlign: 'center', color: 'rgba(243,243,243,0.6)' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🚧</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F3F3F3', margin: '0 0 12px' }}>
          {name} — not converted yet
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
          This is the React playground. Only a few key pages are converted to give you a feel for the React pattern.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 320, margin: '12px auto 0', color: 'rgba(243,243,243,0.45)' }}>
          For the full app, run the vanilla version in <code>frontend/</code>.
        </p>
        <p style={{ marginTop: 28 }}>
          <Link to="/home" style={{ color: '#E53935', textDecoration: 'none', fontWeight: 600 }}>← Back to Home</Link>
        </p>
      </section>

      <TabBar />
    </div>
  );
}
