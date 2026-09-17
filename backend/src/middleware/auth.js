import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// authenticate
// ---------------------------------------------------------------------------

/**
 * Verifies the JWT from the `Authorization: Bearer <token>` header.
 * On success, attaches `req.user = { id, role }` and calls next().
 * Returns 401 for a missing, malformed, expired, or otherwise invalid token.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Provide a Bearer token.' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Misconfiguration — never expose the detail to the client.
    console.error('[authenticate] JWT_SECRET is not defined.');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    const payload = jwt.verify(token, secret);
    // Attach a lean user object — downstream handlers must not trust anything
    // beyond what the JWT itself asserts (userId, role).
    req.user = { id: payload.userId, role: payload.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

// ---------------------------------------------------------------------------
// authorize
// ---------------------------------------------------------------------------

/**
 * Factory that returns a middleware enforcing role-based access control.
 * Must be used AFTER `authenticate` (relies on `req.user` being set).
 *
 * Usage:
 *   router.get('/admin-only', authenticate, authorize('ADMIN'), handler)
 *   router.get('/staff',      authenticate, authorize('DOCTOR', 'ADMIN'), handler)
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      // Guard against being called without authenticate in the chain.
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${allowedRoles.join(', ')}.`,
      });
    }

    next();
  };
}
