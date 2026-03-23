/**
 * Escape special regex characters in a string.
 * Use this on any user-supplied string before passing it to new RegExp().
 * Without this, a crafted input like "(a+)+" can cause catastrophic backtracking (ReDoS).
 */
function escapeRegex(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { escapeRegex };
