import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

// ---------------------------------------------------------------------------
// Nav items — add new routes here; the sidebar renders them automatically.
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { to: '/dashboard',    label: 'Dashboard',     icon: DashboardIcon },
  { to: '/appointments', label: 'Appointments',  icon: CalendarIcon  },
  { to: '/records',      label: 'Records',       icon: RecordsIcon   },
  { to: '/profile',      label: 'Profile',       icon: ProfileIcon   },
];

// ---------------------------------------------------------------------------
// SVG icons — kept as tiny inline components so no icon library is needed
// at this stage. Replace with a library (e.g. lucide-react) later.
// ---------------------------------------------------------------------------

function DashboardIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm8-5a1 1 0 0 1 1 1v3.586l2.707 2.707a1 1 0 0 1-1.414 1.414l-3-3A1 1 0 0 1 9 10V6a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function CalendarIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M6 2a1 1 0 0 0-1 1v1H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1V3a1 1 0 1 0-2 0v1H7V3a1 1 0 0 0-1-1zm0 5a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2H6z" clipRule="evenodd" />
    </svg>
  );
}

function RecordsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 0 1 2-2h4.586A2 2 0 0 1 12 2.586L15.414 6A2 2 0 0 1 16 7.414V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4zm2 6a1 1 0 0 1 1-1h6a1 1 0 1 0 0 2H7a1 1 0 0 1-1-1zm1 3a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H7z" clipRule="evenodd" />
    </svg>
  );
}

function ProfileIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-7 9a7 7 0 1 1 14 0H3z" clipRule="evenodd" />
    </svg>
  );
}

function MenuIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 5h14a1 1 0 1 1 0 2H3a1 1 0 0 1 0-2zm0 4h14a1 1 0 1 1 0 2H3a1 1 0 0 1 0-2zm0 4h14a1 1 0 1 1 0 2H3a1 1 0 0 1 0-2z" clipRule="evenodd" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function Sidebar({ collapsed, onToggle, user }) {
  return (
    <aside
      className={[
        'flex flex-col h-full bg-white border-r border-neutral-200',
        'transition-all duration-200 ease-in-out overflow-hidden',
        collapsed ? 'w-14' : 'w-60',
      ].join(' ')}
    >
      {/* Logo / toggle */}
      <div className="flex items-center h-14 px-3 border-b border-neutral-200 shrink-0">
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-2 rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors focus-ring"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
        {!collapsed && (
          <span className="ml-3 text-sm font-semibold text-primary-700 truncate">
            DocDash
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-3 overflow-y-auto" aria-label="Main navigation">
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 px-2 py-2 rounded text-sm font-medium',
                    'transition-colors duration-100',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800',
                  ].join(' ')
                }
                title={collapsed ? label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom user stub */}
      <div className="shrink-0 px-2 py-3 border-t border-neutral-200">
        <div className="flex items-center gap-3 px-2 py-2 rounded">
          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-primary-700">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-800 truncate">{user?.email ?? '—'}</p>
              <p className="text-xs text-neutral-500 truncate capitalize">{user?.role?.toLowerCase() ?? ''}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------

function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="h-14 shrink-0 flex items-center gap-4 px-4 bg-white border-b border-neutral-200">
      {/* Mobile menu toggle */}
      <button
        className="md:hidden p-2 rounded text-neutral-500 hover:bg-neutral-100 focus-ring"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <MenuIcon className="w-5 h-5" />
      </button>

      {/* Page title */}
      <h1 className="text-base font-semibold text-neutral-800 flex-1 truncate">
        Healthcare Management Dashboard
      </h1>

      {/* Right-side: user badge + logout */}
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-sm text-neutral-500">
          {user?.email}
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-neutral-500 hover:text-danger-700 transition-colors focus-ring rounded px-2 py-1"
        >
          Sign out
        </button>
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary-700">
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </span>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// AppShell — root layout
// ---------------------------------------------------------------------------

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      {/* Sidebar — hidden on mobile, always visible on md+ */}
      <div className="hidden md:flex">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} user={user} />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setCollapsed((c) => !c)} />

        {/* Page content — routed pages render here via <Outlet> */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
