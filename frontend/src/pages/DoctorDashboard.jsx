import { api } from '../lib/api.js';
import { useApiFetch } from '../hooks/useApiFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import Card from '../components/ui/Card.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a date as "Mon, Sep 22" */
function formatDay(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

/** Format a time as "9:30 AM" */
function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

/**
 * Derive a short display name from an email address.
 * "john.doe@clinic.com" → "John Doe"
 * "j.smith@example.org" → "J Smith"
 * Falls back to the email itself.
 */
function displayName(email = '') {
  const [local] = email.split('@');
  return local
    .split(/[._-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Patient's initials for the avatar */
function initials(email = '') {
  const parts = displayName(email).split(' ');
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

// ---------------------------------------------------------------------------
// Skeleton loading block
// ---------------------------------------------------------------------------

function Skeleton({ className = '' }) {
  return (
    <div className={['animate-pulse bg-neutral-100 rounded', className].join(' ')} />
  );
}

// ---------------------------------------------------------------------------
// StatCard — top-row summary tile
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub, loading }) {
  return (
    <Card className="flex flex-col gap-1 p-5">
      <p className="text-meta">{label}</p>
      {loading ? (
        <Skeleton className="h-8 w-16 mt-1" />
      ) : (
        <p className="text-3xl font-bold text-neutral-900 leading-none">{value}</p>
      )}
      {sub && !loading && (
        <p className="text-xs text-neutral-400 mt-1">{sub}</p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AppointmentRow — single row in today's list
// ---------------------------------------------------------------------------

function AppointmentRow({ appt }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
        <span className="text-xs font-semibold text-primary-600">
          {initials(appt.patient?.email)}
        </span>
      </div>

      {/* Patient info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 truncate">
          {displayName(appt.patient?.email ?? '')}
        </p>
        {appt.reason && (
          <p className="text-xs text-neutral-400 truncate">{appt.reason}</p>
        )}
      </div>

      {/* Time + status */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs font-medium text-neutral-600 tabular-nums">
          {formatTime(appt.scheduledAt)}
        </span>
        <StatusBadge status={appt.status} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecentPatientRow
// ---------------------------------------------------------------------------

function RecentPatientRow({ patient }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0">
      <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
        <span className="text-xs font-semibold text-neutral-500">
          {initials(patient.email)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 truncate">
          {displayName(patient.email)}
        </p>
        <p className="text-xs text-neutral-400 truncate">
          Last seen {formatDay(patient.lastSeen)}
        </p>
      </div>
      <StatusBadge status={patient.lastStatus} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState({ message }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm text-neutral-400">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error banner
// ---------------------------------------------------------------------------

function ErrorBanner({ message }) {
  return (
    <div className="rounded border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardPage — doctor view
// ---------------------------------------------------------------------------

export default function DoctorDashboard() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  // Single fetch for all dashboard data
  const { data, loading, error } = useApiFetch(
    (token) => api.appointments.getMyDashboard(token),
    [],
  );

  const appointments    = data?.appointments    ?? [];
  const recentPatients  = data?.recentPatients  ?? [];
  const todayCount      = data?.todayCount      ?? 0;

  // Upcoming = SCHEDULED only, in the future
  const now = Date.now();
  const upcoming = appointments.filter(
    (a) => a.status === 'SCHEDULED' && new Date(a.scheduledAt) > now,
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Page header */}
      <div>
        <h2 className="text-heading-2">
          {greeting()}{user?.email ? `, ${displayName(user.email)}` : ''}
        </h2>
        <p className="text-body-sm mt-0.5">
          {formatDay(new Date())} · Doctor dashboard
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* ── Row 1: Stat cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Today's Appointments"
          value={todayCount}
          sub={`${upcoming.length} upcoming`}
          loading={loading}
        />
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          sub="yet to start"
          loading={loading}
        />
        <StatCard
          label="Recent Patients"
          value={recentPatients.length}
          sub="last 30 days"
          loading={loading}
        />
      </div>

      {/* ── Row 2: Today's list + Recent patients ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Today's appointments — takes 2/3 width on desktop */}
        <Card className="lg:col-span-2">
          <Card.Header>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-800">
                Today&apos;s Appointments
              </p>
              <span className="text-meta">{today}</span>
            </div>
          </Card.Header>
          <Card.Body className="py-0 px-4">
            {loading ? (
              <div className="py-4 space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded" />
                  </div>
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <EmptyState message="No appointments scheduled for today." />
            ) : (
              <div>
                {appointments.map((appt) => (
                  <AppointmentRow key={appt._id} appt={appt} />
                ))}
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Recent patients — 1/3 width on desktop */}
        <Card>
          <Card.Header>
            <p className="text-sm font-semibold text-neutral-800">
              Recent Patients
            </p>
          </Card.Header>
          <Card.Body className="py-0 px-4">
            {loading ? (
              <div className="py-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentPatients.length === 0 ? (
              <EmptyState message="No patients seen in the last 30 days." />
            ) : (
              <div>
                {recentPatients.map((p) => (
                  <RecentPatientRow key={p.patientId} patient={p} />
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
