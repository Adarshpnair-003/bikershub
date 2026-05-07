/**
 * Frontend mention helpers — linkify @username in text safely.
 *
 * Server populates `mentions: [{_id, username}]` on posts and comments.
 * Use that lookup so we resolve `@adarsh` → /user/<id> instead of guessing.
 */

const MENTION_REGEX = /@([a-zA-Z0-9_]{3,30})\b/g;

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Linkify @-mentions in `text` against an array of mention user objects.
 *
 * @param {string} text — raw user content (will be HTML-escaped)
 * @param {Array<{_id: string, username: string}>} mentions — populated mentions array
 * @returns {string} HTML-safe string with `@username` wrapped as <a>
 */
export function linkifyMentions(text, mentions) {
  if (!text) return '';
  const safe = escapeHtml(text);

  if (!Array.isArray(mentions) || mentions.length === 0) return safe;

  // Build a username → userId map (case-insensitive)
  const map = new Map();
  mentions.forEach((m) => {
    if (m && m.username && m._id) map.set(m.username.toLowerCase(), String(m._id));
  });

  return safe.replace(MENTION_REGEX, (full, name) => {
    const id = map.get(name.toLowerCase());
    if (!id) return full; // not a real user — leave as plain text
    return `<a class="mention-link" href="#/user/${id}">@${escapeHtml(name)}</a>`;
  });
}

/**
 * Find the @-token currently being typed at the cursor in a textarea/input.
 * Returns { match, start, end } where match is the partial username (no @)
 * or null if cursor isn't inside a mention.
 */
export function findActiveMention(value, cursorPos) {
  if (cursorPos == null || cursorPos <= 0) return null;
  let start = cursorPos - 1;
  while (start >= 0 && /[a-zA-Z0-9_]/.test(value[start])) start--;
  if (start < 0 || value[start] !== '@') return null;
  // Ensure @ is preceded by start-of-string or whitespace/punct
  if (start > 0 && /[a-zA-Z0-9_]/.test(value[start - 1])) return null;
  const end = cursorPos;
  const match = value.slice(start + 1, end);
  if (match.length === 0 || match.length > 30) return null;
  if (!/^[a-zA-Z0-9_]+$/.test(match)) return null;
  return { match, start, end };
}
