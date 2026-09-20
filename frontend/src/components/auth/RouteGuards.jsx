import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * ProtectedRoute
 * Wraps any route that requires authentication.
 * Redirects to /login (preserving the intended URL) if the user is not signed in.
 *
 * Usage:
 *   { path: '/', element: <ProtectedRoute><AppShell /></ProtectedRoute>, children: [...] }
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/**
 * PublicOnlyRoute
 * Wraps routes that should only be accessible when NOT signed in (login, register).
 * Redirects to /dashboard if the user already has a session.
 */
export function PublicOnlyRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
