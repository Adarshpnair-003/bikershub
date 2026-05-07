import { Link } from 'react-router-dom';

/**
 * Shared top bar with title + optional left/right action buttons.
 *
 * <AppHeader title="Profile" left={<BackButton />} right={<EditButton />} />
 */
export default function AppHeader({ title, left, right }) {
  return (
    <header className="app-header">
      <div className="app-header-left">{left}</div>
      <div className="app-header-title">{title}</div>
      <div className="app-header-actions">{right}</div>
    </header>
  );
}

export function HomeTitle() {
  return (
    <Link to="/notifications" className="app-header-title-btn">
      BIKERS HUB
    </Link>
  );
}
