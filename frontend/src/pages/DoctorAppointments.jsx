import { useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiFetch } from '../hooks/useApiFetch.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}
function fmtTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}
function displayName(email = '') {
  const [local] = email.split('@');
  return local.split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}
function initials(email = '') {
  return displayName(email).split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function Skeleton({ className = '' }) {
  return <div className={['animate-pulse bg-neutral-100 rounded', className].join(' ')} />;
}

// ---------------------------------------------------------------------------
// Filter tab bar
// ---------------------------------------------------------------------------
const FILTERS = [
  { key: '', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
];

function FilterBar({ active, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg w-fit">
      {FILTERS.map(f => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={[
            'px-3 py-1.5 rounded text-sm font-medium transition-colors',
            active === f.key
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700',
          ].join(' ')}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status action buttons for a doctor
// ---------------------------------------------------------------------------
function DoctorActions({ appt, onUpdateStatus, busy }) {
  if (appt.status !== 'SCHEDULED') return null;
  return (
    <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onUpdateStatus(appt._id, 'COMPLETED')}
        disabled={busy}
      >
        Mark Completed
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onUpdateStatus(appt._id, 'NO_SHOW')}
        disabled={busy}
        className="text-warning-600 hover:bg-warning-50"
      >
        No-show
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AppointmentCard
// ---------------------------------------------------------------------------
function AppointmentCard({ appt, onUpdateStatus, busy }) {
  const isPast = new Date(appt.scheduledAt) < new Date();

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary-600">
            {initials(appt.patient?.email)}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-neutral-900 truncate">
              {displayName(appt.patient?.email ?? '')}
            </p>
            <StatusBadge status={appt.status} />
          </div>

          <p className="text-sm text-neutral-600 mt-0.5">
            {fmt(appt.scheduledAt)} · {fmtTime(appt.scheduledAt)}
            <span className="text-neutral-400 ml-1">({appt.durationMinutes} min)</span>
          </p>

          {appt.reason && (
            <p className="text-xs text-neutral-400 mt-1 truncate">
              Reason: {appt.reason}
            </p>
          )}

          {!isPast && (
            <DoctorActions appt={appt} onUpdateStatus={onUpdateStatus} busy={busy} />
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// DoctorAppointments
// ---------------------------------------------------------------------------
export default function DoctorAppointments() {
  const { token } = useAuth();
  const [filter, setFilter] = useState('upcoming');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const { data, loading, error, refetch } = useApiFetch(
    (t) => api.appointments.getAll(t, filter),
    [filter],
  );

  const appointments = data?.appointments ?? [];

  const handleUpdateStatus = useCallback(async (id, status) => {
    setBusy(true);
    setActionError('');
    try {
      await api.appointments.updateStatus(token, id, status);
      refetch();
    } catch (err) {
      setActionError(err.message ?? 'Failed to update status.');
    } finally {
      setBusy(false);
    }
  }, [token, refetch]);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-heading-2">Appointments</h2>
        <p className="text-body-sm mt-0.5">Manage your patient visits.</p>
      </div>

      <FilterBar active={filter} onChange={setFilter} />

      {actionError && (
        <div role="alert" className="rounded border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {actionError}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-3">
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="text-sm text-neutral-400">No appointments in this view.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map(appt => (
            <AppointmentCard
              key={appt._id}
              appt={appt}
              onUpdateStatus={handleUpdateStatus}
              busy={busy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
