import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
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
 *   /                   → redirect to /dashboard
 *   / (AppShell layout)
 *     /dashboard        → DashboardPage
 *     /appointments     → AppointmentsPage
 *     /records          → RecordsPage
 *     /profile          → ProfilePage
 *   *                   → NotFoundPage
 *
 * Auth-guarded routes will be added in a later step once the auth context
 * (login/register flows) is wired up. For now all routes are accessible.
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',    element: <DashboardPage /> },
      { path: 'appointments', element: <AppointmentsPage /> },
      { path: 'records',      element: <RecordsPage /> },
      { path: 'profile',      element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
