import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

// ---------------------------------------------------------------------------
// Loading spinner — shown by guards while the token is being verified.
// Kept intentionally minimal: a centred animated ring, no external deps.
// ---------------------------------------------------------------------------

function AuthLoadingScreen() {
  return (
    <div
      role="status"
      aria-label="Verifying session…"
      className="min-h-screen flex items-center justify-center bg-neutral-50"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-primary-500 animate-spin" />
        <p className="text-sm text-neutral-400">Verifying session…</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProtectedRoute
// Requires the user to be authenticated.
// Shows the loading screen while the initial token-verification is in progress,
// then redirects to /login (preserving the intended URL) if not authenticated.
// ---------------------------------------------------------------------------

/**
 * @param {{ children: React.ReactNode }} props
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Don't redirect until we know whether the stored token is valid.
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// ---------------------------------------------------------------------------
// PublicOnlyRoute
// Routes that should only be reachable when NOT signed in (login, register).
// Waits for loading before redirecting so a page-reload doesn't flash login
// before the token verification has a chance to succeed.
// ---------------------------------------------------------------------------

/**
 * @param {{ children: React.ReactNode }} props
 */
export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// ---------------------------------------------------------------------------
// RoleRoute
// Requires the user to have one of the specified roles.
// Must be nested inside a ProtectedRoute (assumes isAuthenticated is already true).
//
// Usage:
//   <RoleRoute roles={['DOCTOR']}>
//     <DoctorOnlyPage />
//   </RoleRoute>
//
//   <RoleRoute roles={['DOCTOR', 'ADMIN']}>
//     <StaffPage />
//   </RoleRoute>
//
// Redirects to /unauthorized on mismatch.
// ---------------------------------------------------------------------------

/**
 * @param {{ roles: string[], children: React.ReactNode }} props
 */
export function RoleRoute({ roles, children }) {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!roles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
