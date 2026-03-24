/**
 * API client for Bikers Hub backend
 */

import { getToken, setTokens, clearTokens } from './auth.js';
import { navigate } from './router.js';

/**
 * Auto-detect base URL:
 * - Use env override if set
 * - Android WebView (Capacitor) uses 10.0.2.2
 * - Browser uses localhost
 */
function detectBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  const ua = navigator.userAgent || '';
  if (ua.includes('Android') && typeof window.Capacitor !== 'undefined') {
    return 'http://10.0.2.2:5002';
  }

  return 'http://localhost:5002';
}

export const API_BASE_URL = detectBaseUrl();

let isRefreshing = false;
let refreshPromise = null;

/**
 * Attempt to refresh the access token using the stored refresh token
 * @returns {Promise<boolean>} true if refresh succeeded
 */
async function tryRefreshToken() {
  if (isRefreshing) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('bh_refresh_token');
      if (!refreshToken) {
        return false;
      }

      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      if (data.success && data.data) {
        setTokens(
          data.data.token,
          data.data.refreshToken || refreshToken
        );
        return true;
      }

      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Build headers for a request
 * @param {boolean} isFormData - If true, don't set Content-Type (browser sets multipart boundary)
 * @returns {Headers}
 */
function buildHeaders(isFormData = false) {
  const headers = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Core request function with auto-retry on 401
 * @param {string} url - API path (e.g. '/api/posts')
 * @param {object} options - fetch options
 * @param {boolean} isRetry - whether this is a retry after token refresh
 * @returns {Promise<any>} parsed JSON response
 */
async function request(url, options = {}, isRetry = false) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const res = await fetch(fullUrl, options);

  // Handle 401 - try to refresh token
  if (res.status === 401 && !isRetry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Rebuild headers with new token
      const newHeaders = buildHeaders(options.body instanceof FormData);
      options.headers = newHeaders;
      return request(url, options, true);
    }

    // Refresh failed - redirect to login
    clearTokens();
    navigate('/login');
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json();
  return data;
}

/**
 * API client with convenience methods
 */
export const api = {
  /**
   * GET request
   * @param {string} url
   * @returns {Promise<any>}
   */
  async get(url) {
    return request(url, {
      method: 'GET',
      headers: buildHeaders(),
    });
  },

  /**
   * POST request with JSON body
   * @param {string} url
   * @param {object} body
   * @returns {Promise<any>}
   */
  async post(url, body) {
    return request(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
  },

  /**
   * PUT request with JSON body
   * @param {string} url
   * @param {object} body
   * @returns {Promise<any>}
   */
  async put(url, body) {
    return request(url, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
  },

  /**
   * DELETE request
   * @param {string} url
   * @param {object} [body]
   * @returns {Promise<any>}
   */
  async delete(url, body) {
    const options = {
      method: 'DELETE',
      headers: buildHeaders(),
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    return request(url, options);
  },

  /**
   * Upload files using FormData (multipart/form-data)
   * @param {string} url
   * @param {FormData} formData
   * @returns {Promise<any>}
   */
  async upload(url, formData) {
    return request(url, {
      method: 'POST',
      headers: buildHeaders(true),
      body: formData,
    });
  },
};
