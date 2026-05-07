/**
 * @-mention helpers.
 *
 * Usernames may contain a-z, A-Z, 0-9, underscore — 3 to 30 chars.
 * Mentions matched as `@username` followed by non-word char (or end of string).
 */

const User = require("../models/User");

const MENTION_REGEX = /@([a-zA-Z0-9_]{3,30})\b/g;

/**
 * Extract unique usernames (no `@`) from text.
 */
function extractUsernames(text) {
  if (!text || typeof text !== "string") return [];
  const set = new Set();
  let m;
  MENTION_REGEX.lastIndex = 0;
  while ((m = MENTION_REGEX.exec(text)) !== null) {
    set.add(m[1].toLowerCase());
  }
  return Array.from(set);
}

/**
 * Resolve usernames to userIds. Excludes the author so users don't notify themselves.
 * @param {string} text — content with @mentions
 * @param {string|ObjectId} excludeUserId — author id to skip
 * @returns {Promise<Array<ObjectId>>}
 */
async function resolveMentionedUserIds(text, excludeUserId) {
  const usernames = extractUsernames(text);
  if (usernames.length === 0) return [];

  // Case-insensitive username lookup
  const users = await User.find({
    username: { $in: usernames.map((u) => new RegExp(`^${u}$`, "i")) }
  }).select("_id").lean();

  const ids = users
    .map((u) => u._id)
    .filter((id) => String(id) !== String(excludeUserId));

  return ids;
}

module.exports = { extractUsernames, resolveMentionedUserIds, MENTION_REGEX };
