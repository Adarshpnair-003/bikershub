/**
 * Tiny router shim — keeps the imperative `navigate()` API used by api.js / auth.js
 * working unchanged. React Router's HashRouter listens to `hashchange` and reacts.
 *
 * Inside React components, prefer `useNavigate()` from react-router-dom.
 */

export function navigate(path) {
  if (!path) return;
  const target = path.startsWith('#') ? path : `#${path.startsWith('/') ? path : '/' + path}`;
  if (window.location.hash !== target) {
    window.location.hash = target;
  } else {
    // Same path — force a router re-evaluation
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}
