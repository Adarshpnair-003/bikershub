/**
 * Simple hash-based router for Bikers Hub SPA
 */

const routes = [];

/**
 * Navigate to a path by setting the hash
 * @param {string} path
 */
export function navigate(path) {
  window.location.hash = '#' + path;
}

// Expose navigate globally for inline onclick handlers
window.navigate = navigate;

/**
 * Register a route with a path pattern and handler function
 * Supports dynamic segments like /clubs/:id
 * @param {string} path - Route pattern (e.g. '/clubs/:id')
 * @param {Function} handler - Called with { params } when route matches
 */
export function registerRoute(path, handler) {
  // Convert path pattern to regex
  const paramNames = [];
  const regexStr = path
    .replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    })
    .replace(/\//g, '\\/');

  routes.push({
    path,
    regex: new RegExp('^' + regexStr + '$'),
    paramNames,
    handler,
  });
}

/**
 * Match the current hash against registered routes and call the handler
 */
function resolveRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const [pathname, queryString] = hash.split('?');

  for (const route of routes) {
    const match = pathname.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });

      // Parse query params
      const query = {};
      if (queryString) {
        const searchParams = new URLSearchParams(queryString);
        for (const [key, value] of searchParams) {
          query[key] = value;
        }
      }

      route.handler({ params, query });
      return;
    }
  }

  // No route matched - go to default
  navigate('/');
}

/**
 * Start listening for hash changes and resolve the initial route
 */
export function startRouter() {
  window.addEventListener('hashchange', resolveRoute);
  resolveRoute();
}

/**
 * Get the current hash path
 * @returns {string}
 */
export function getCurrentPath() {
  return window.location.hash.slice(1) || '/';
}
