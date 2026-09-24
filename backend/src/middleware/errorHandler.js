/**
 * Global Express error-handling middleware.
 *
 * Mount LAST in server.js — after all routes — with:
 *   app.use(errorHandler);
 *
 * Handles:
 *   MongooseError (ValidationError) → 400 with per-field messages
 *   MongooseError (CastError)       → 400 ("Invalid <path>")
 *   MongoServerError code 11000     → 409 Conflict (duplicate key)
 *   Everything else                 → 500 Internal Server Error
 *
 * Stack traces are NEVER sent to the client. In development they are logged
 * to stdout; in production only the message is logged.
 *
 * All responses share the same JSON shape:
 *   {
 *     error:   string,          // human-readable summary
 *     code:    string,          // machine-readable constant (optional)
 *     issues:  [                // only present for validation errors
 *       { field: string, message: string }
 *     ]
 *   }
 */

const IS_PROD = process.env.NODE_ENV === 'production';

export function errorHandler(err, _req, res, _next) {
  // ── Log ─────────────────────────────────────────────────────────────────
  if (IS_PROD) {
    // Production: log message only — no stack trace exposed in server logs
    console.error(`[ERROR] ${err.name}: ${err.message}`);
  } else {
    // Development: full stack for easier debugging
    console.error(err);
  }

  // ── Mongoose ValidationError → 400 with field-level details ─────────────
  if (err.name === 'ValidationError') {
    const issues = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
    return res.status(400).json({
      error:  'Validation failed.',
      code:   'VALIDATION_ERROR',
      issues,
    });
  }

  // ── Mongoose CastError → 400 (malformed ObjectId etc.) ──────────────────
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: `Invalid value for field '${err.path}'.`,
      code:  'CAST_ERROR',
    });
  }

  // ── MongoDB duplicate-key error → 409 Conflict ───────────────────────────
  if (err.name === 'MongoServerError' && err.code === 11000) {
    // err.keyValue is e.g. { email: 'foo@bar.com' }
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    return res.status(409).json({
      error: `A record with that ${field} already exists.`,
      code:  'DUPLICATE_KEY',
    });
  }

  // ── JWT errors (from jsonwebtoken library) ────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token.', code: 'INVALID_TOKEN' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token has expired.', code: 'TOKEN_EXPIRED' });
  }

  // ── HTTP errors with a known status (thrown deliberately) ────────────────
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message ?? 'Request error.' });
  }

  // ── Fallthrough: unexpected 500 ───────────────────────────────────────────
  // Never expose internal details (message may contain file paths, query strings,
  // or other sensitive context in third-party library errors).
  return res.status(500).json({
    error: 'An unexpected error occurred. Please try again later.',
    code:  'INTERNAL_ERROR',
  });
}
