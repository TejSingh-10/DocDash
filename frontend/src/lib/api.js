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
      code:   data.code,   // machine-readable code, e.g. APPOINTMENT_CONFLICT
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
   * GET /api/me — verify a stored token and fetch fresh user data on app load.
   */
  me: (token) =>
    apiFetch('/me', { token }),

  appointments: {
    /** GET /api/appointments/me — doctor dashboard data */
    getMyDashboard: (token, date) => {
      const qs = date ? `?date=${date}` : '';
      return apiFetch(`/appointments/me${qs}`, { token });
    },

    /** GET /api/appointments/all?filter=upcoming|past|cancelled — doctor full list */
    getAll: (token, filter = '') =>
      apiFetch(`/appointments/all${filter ? `?filter=${filter}` : ''}`, { token }),

    /** GET /api/appointments/patient-me — patient dashboard data */
    getPatientDashboard: (token) =>
      apiFetch('/appointments/patient-me', { token }),

    /** GET /api/appointments/patient-me — patient full appointments list */
    getPatientAll: (token) =>
      apiFetch('/appointments/patient-me', { token }),

    /**
     * POST /api/appointments — patient books a slot.
     * Body: { doctorId, scheduledAt, durationMinutes, reason? }
     * Throws with .code on conflict (APPOINTMENT_CONFLICT, OUTSIDE_WORKING_HOURS, …)
     */
    book: (token, body) =>
      apiFetch('/appointments', { token, method: 'POST', body: JSON.stringify(body) }),

    /**
     * PATCH /api/appointments/:id/status
     * Doctor: COMPLETED | NO_SHOW
     * Patient: CANCELLED
     */
    updateStatus: (token, id, status) =>
      apiFetch(`/appointments/${id}/status`, {
        token, method: 'PATCH', body: JSON.stringify({ status }),
      }),

    /**
     * PATCH /api/appointments/:id/reschedule — patient reschedules.
     * Body: { scheduledAt, durationMinutes? }
     */
    reschedule: (token, id, body) =>
      apiFetch(`/appointments/${id}/reschedule`, {
        token, method: 'PATCH', body: JSON.stringify(body),
      }),
  },

  doctors: {
    /** GET /api/doctors — list active doctors (public fields). */
    list: (token) => apiFetch('/doctors', { token }),
  },

  records: {
    /** GET /api/records/patient/:patientId — patient's own records */
    getForPatient: (token, patientId) =>
      apiFetch(`/records/patient/${patientId}`, { token }),

    /** GET /api/records/mine?patientId= — doctor's authored records */
    getMine: (token, patientId = '') => {
      const qs = patientId ? `?patientId=${patientId}` : '';
      return apiFetch(`/records/mine${qs}`, { token });
    },

    /** GET /api/records/mine/patients — distinct patients doctor has records for */
    getMinePatients: (token) =>
      apiFetch('/records/mine/patients', { token }),

    /** POST /api/records — create a record (DOCTOR only) */
    create: (token, body) =>
      apiFetch('/records', { token, method: 'POST', body: JSON.stringify(body) }),

    /** PATCH /api/records/:id — update prescription/notes (author DOCTOR only) */
    update: (token, id, body) =>
      apiFetch(`/records/${id}`, { token, method: 'PATCH', body: JSON.stringify(body) }),

    /** PATCH /api/records/:id/archive — soft-delete (author DOCTOR only) */
    archive: (token, id) =>
      apiFetch(`/records/${id}/archive`, { token, method: 'PATCH' }),
  },
};
