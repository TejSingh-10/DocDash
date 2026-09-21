/**
 * Vite dev proxy rewrites /api → http://localhost:5000 and strips the /api
 * prefix (see vite.config.js). So a fetch to /api/auth/login hits the backend
 * at http://localhost:5000/auth/login — but our backend mounts routes at
 * /api/auth/login. Fix: don't strip the prefix.
 *
 * Actually the proxy is: rewrite: (path) => path.replace(/^\/api/, '')
 * which means /api/auth/login → /auth/login on the target.
 * But our backend listens at /api/auth/login.
 *
 * Two options:
 *  A) Remove the rewrite in vite.config.js so /api passes through as-is.
 *  B) Call the backend directly at http://localhost:5000/api/...
 *
 * We go with option A (no rewrite) — cleaner for production where /api will
 * also be the real prefix. The proxy in vite.config.js is updated separately.
 *
 * In all environments, prefix every path with /api.
 */

const BASE = '/api';

/**
 * Base fetch wrapper. Returns parsed JSON on 2xx, throws on errors.
 * The thrown value has the shape: { status, error, issues? }
 *
 * @param {string} path  — e.g. '/auth/login'
 * @param {RequestInit & { token?: string }} options
 */
async function apiFetch(path, { token, ...options } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = Object.assign(new Error(data.error ?? 'Request failed'), {
      status: res.status,
      issues: data.issues,
    });
    throw err;
  }

  return data;
}

export const api = {
  /** POST /api/auth/register */
  register: (body) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  /** POST /api/auth/login */
  login: (body) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  /**
   * GET /api/me — verify a stored token is still valid and fetch fresh user data.
   * Called once on app load to confirm the persisted JWT hasn't expired.
   */
  me: (token) =>
    apiFetch('/me', { token }),
};
