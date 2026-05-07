import { Link } from 'react-router-dom';

function formatCount(n) {
  if (n == null) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(1) + 'K';
  return (n / 1_000_000).toFixed(1) + 'M';
}

const PLACEHOLDER_BG = 'linear-gradient(135deg, #1f2937, #374151)';

export default function ClubCard({ club, mode = 'discover', onJoin }) {
  const bgStyle = club.coverImage
    ? { backgroundImage: `url('${club.coverImage}')` }
    : { backgroundImage: PLACEHOLDER_BG };

  const name = club.name || 'Unnamed Club';
  const privacy = club.privacy || 'public';
  const members = club.membersCount ?? (Array.isArray(club.members) ? club.members.length : 0);

  return (
    <Link to={`/clubs/${club._id}`} className="club-card" style={bgStyle}>
      <div className="club-card-overlay">
        <div className="club-card-name">{name}</div>
        {mode === 'discover' && (
          <>
            <div className="club-card-meta">{privacy} · {formatCount(members)}</div>
            {onJoin && (
              <button
                className="club-card-join"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onJoin(club._id); }}
              >
                Join
              </button>
            )}
          </>
        )}
      </div>
    </Link>
  );
}
