import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute, PublicOnlyRoute } from './components/auth/RouteGuards.jsx';
import AppShell from './components/layout/AppShell.jsx';
import LoginPage    from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import {
  DashboardPage,
  AppointmentsPage,
  RecordsPage,
  ProfilePage,
  NotFoundPage,
} from './pages/index.jsx';

/**
 * Application router.
 *
 * Structure:
 *   /login             → LoginPage    (public-only: redirects to /dashboard if signed in)
 *   /register          → RegisterPage (public-only)
 *   / (AppShell)       → protected: redirects to /login if not signed in
 *     /                → /dashboard
 *     /dashboard
 *     /appointments
 *     /records
 *     /profile
 *   *                  → NotFoundPage
 */
const router = createBrowserRouter([
  // ── Public-only routes ───────────────────────────────────────────────────
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

  // ── Protected app shell ──────────────────────────────────────────────────
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true,           element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',     element: <DashboardPage /> },
      { path: 'appointments',  element: <AppointmentsPage /> },
      { path: 'records',       element: <RecordsPage /> },
      { path: 'profile',       element: <ProfilePage /> },
    ],
  },

  // ── Catch-all ────────────────────────────────────────────────────────────
  { path: '*', element: <NotFoundPage /> },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
