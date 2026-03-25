/**
 * Club card component for Bikers Hub
 * Renders a club card for horizontal scroll sections
 */

import { formatCount } from './post-card.js';

const PLACEHOLDER_BG = 'linear-gradient(135deg, #1f2937, #374151)';

/**
 * Render a club card HTML string
 * @param {object} club - Club object from API
 * @param {'discover'|'manage'} mode - Card display mode
 * @returns {string} HTML string
 */
export function renderClubCard(club, mode) {
  const coverImage = club.coverImage;
  const bgStyle = coverImage
    ? `background-image: url('${coverImage}')`
    : `background-image: ${PLACEHOLDER_BG}`;

  const name = club.name || 'Unnamed Club';

  if (mode === 'manage') {
    return `
      <div class="club-card" data-club-id="${club._id}" style="${bgStyle}; cursor: pointer;">
        <div class="club-card-overlay">
          <div class="club-card-name">${name}</div>
        </div>
      </div>
    `;
  }

  // discover mode (default)
  const privacy = club.privacy || 'public';
  const membersCount = club.membersCount != null ? club.membersCount : (Array.isArray(club.members) ? club.members.length : 0);

  return `
    <div class="club-card" data-club-id="${club._id}" style="${bgStyle}; cursor: pointer;">
      <div class="club-card-overlay">
        <div class="club-card-name">${name}</div>
        <div class="club-card-meta">${privacy} &middot; ${formatCount(membersCount)}</div>
        <button class="club-card-join" data-club-id="${club._id}">Join</button>
      </div>
    </div>
  `;
}
