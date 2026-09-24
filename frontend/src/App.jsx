import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import {
  ProtectedRoute,
  PublicOnlyRoute,
  RoleRoute,
} from './components/auth/RouteGuards.jsx';
import AppShell from './components/layout/AppShell.jsx';
import LoginPage    from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import {
  DashboardPage,
  AppointmentsPage,
  RecordsPage,
  ProfilePage,
  NotFoundPage,
  NotAuthorizedPage,
} from './pages/index.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';

/**
 * Route structure:
 *
 *   /login              → LoginPage       (public-only)
 *   /register           → RegisterPage    (public-only)
 *   /unauthorized       → NotAuthorizedPage (public, no auth required)
 *
 *   / (AppShell)        → ProtectedRoute (redirects to /login if not authenticated)
 *     /                 → /dashboard
 *     /dashboard        → DOCTOR | PATIENT  (role differences handled inside page)
 *     /appointments     → DOCTOR | PATIENT
 *     /records          → DOCTOR | PATIENT  (role differences handled inside page)
 *     /profile          → DOCTOR | PATIENT
 *
 *   *                   → NotFoundPage
 *
 * RoleRoute is wired here for future single-role routes.
 * Multi-role pages (dashboard, appointments, records, profile) handle per-role
 * UI differences internally rather than splitting into separate routes.
 */
const router = createBrowserRouter([
  // ── Public-only ──────────────────────────────────────────────────────────
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicOnlyRoute>
        <RegisterPage />
      </PublicOnlyRoute>
    ),
  },

  // ── Public error page (no auth required) ─────────────────────────────────
  { path: '/unauthorized', element: <NotAuthorizedPage /> },

  // ── Protected app shell ──────────────────────────────────────────────────
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // Open to both DOCTOR and PATIENT — per-role UI handled inside each page.
      {
        path: 'dashboard',
        element: (
          <RoleRoute roles={['DOCTOR', 'PATIENT']}>
            <DashboardPage />
          </RoleRoute>
        ),
      },
      {
        path: 'appointments',
        element: (
          <RoleRoute roles={['DOCTOR', 'PATIENT']}>
            <AppointmentsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'records',
        element: (
          <RoleRoute roles={['DOCTOR', 'PATIENT']}>
            <RecordsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <RoleRoute roles={['DOCTOR', 'PATIENT']}>
            <ProfilePage />
          </RoleRoute>
        ),
      },
      {
        path: 'analytics',
        element: (
          // ADMIN + DOCTOR only — patients are redirected to /unauthorized.
          // The backend also enforces this, but the route guard is the first wall.
          <RoleRoute roles={['DOCTOR', 'ADMIN']}>
            <AnalyticsPage />
          </RoleRoute>
        ),
      },
    ],
  },

  // ── Catch-all ─────────────────────────────────────────────────────────────
  { path: '*', element: <NotFoundPage /> },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
