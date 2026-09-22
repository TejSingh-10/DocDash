import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useApiFetch } from '../hooks/useApiFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

// ---------------------------------------------------------------------------
// Formatting helpers — same as DoctorDashboard for visual consistency
// ---------------------------------------------------------------------------

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatShortDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

/** Time remaining until appointment, e.g. "in 2 days" / "in 3 hours" */
function timeUntil(date) {
  const diffMs  = new Date(date) - Date.now();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHrs / 24);
  if (diffDay >= 1) return `in ${diffDay} day${diffDay !== 1 ? 's' : ''}`;
  if (diffHrs >= 1) return `in ${diffHrs} hour${diffHrs !== 1 ? 's' : ''}`;
  if (diffMin >= 1) return `in ${diffMin} min`;
  return 'starting now';
}

function displayName(email = '') {
  const [local] = email.split('@');
  return local
    .split(/[._-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton({ className = '' }) {
  return <div className={['animate-pulse bg-neutral-100 rounded', className].join(' ')} />;
}

// ---------------------------------------------------------------------------
// NextAppointmentCard — hero section at the top
// ---------------------------------------------------------------------------

function NextAppointmentCard({ appt, loading }) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40 mt-2" />
        </div>
      </Card>
    );
  }

  if (!appt) {
    return (
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-meta mb-1">Next Appointment</p>
            <p className="text-heading-3 text-neutral-400">No upcoming appointments</p>
            <p className="text-body-sm mt-1">Book one to get started.</p>
          </div>
          {/* Book CTA — rendered inline when there's no appointment */}
          <Button variant="primary" size="md" className="shrink-0" asChild>
            <Link to="/appointments">Book Appointment</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-l-4 border-l-primary-500">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Detail block */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-meta">Next Appointment</p>
            <StatusBadge status={appt.status} />
          </div>

          {/* Date + time — prominent */}
          <p className="text-heading-3 text-neutral-900 leading-tight">
            {formatDate(appt.scheduledAt)}
          </p>
          <p className="text-body-sm font-medium text-primary-600">
            {formatTime(appt.scheduledAt)} · {timeUntil(appt.scheduledAt)}
          </p>

          {/* Doctor */}
          {appt.doctor?.email && (
            <p className="text-body-sm text-neutral-500 mt-1">
              with Dr. {displayName(appt.doctor.email)}
            </p>
          )}

          {/* Reason */}
          {appt.reason && (
            <p className="text-body-sm text-neutral-400 truncate">
              Reason: {appt.reason}
            </p>
          )}
        </div>

        {/* Duration chip */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          <span className="text-xs font-medium text-neutral-500 bg-neutral-100 rounded px-2 py-1">
            {appt.durationMinutes} min
          </span>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// RecordDetailModal — inline detail overlay
// ---------------------------------------------------------------------------

function RecordDetailModal({ record, onClose }) {
  if (!record) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Record details"
    >
      <div
        className="surface w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-meta mb-1">Medical Record</p>
            <p className="text-heading-3">{record.diagnosis}</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 focus-ring rounded p-1 mt-0.5"
            aria-label="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-neutral-400">
          {formatShortDate(record.createdAt)}
        </p>

        {record.prescription && (
          <div>
            <p className="text-meta mb-1">Prescription</p>
            <p className="text-body-sm">{record.prescription}</p>
          </div>
        )}

        {record.notes && (
          <div>
            <p className="text-meta mb-1">Notes</p>
            <p className="text-body-sm">{record.notes}</p>
          </div>
        )}

        {record.attachmentUrl && (
          <a
            href={record.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View Attachment ↗
          </a>
        )}

        <div className="pt-2 divider" />
        <Button variant="secondary" size="sm" className="w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecentRecordRow
// ---------------------------------------------------------------------------

function RecentRecordRow({ record, onClick }) {
  return (
    <button
      onClick={() => onClick(record)}
      className="w-full flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0 text-left hover:bg-neutral-50 -mx-4 px-4 transition-colors rounded"
    >
      {/* Record icon */}
      <div className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 0 1 2-2h4.586A2 2 0 0 1 12 2.586L15.414 6A2 2 0 0 1 16 7.414V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4zm6 1V2.5L14.5 7H10V5z" clipRule="evenodd" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 truncate">{record.diagnosis}</p>
        <p className="text-xs text-neutral-400">{formatShortDate(record.createdAt)}</p>
      </div>

      <svg className="w-4 h-4 text-neutral-300 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 0 1 0-1.414L10.586 10 7.293 6.707a1 1 0 0 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z" clipRule="evenodd" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// AppointmentHistoryRow
// ---------------------------------------------------------------------------

function AppointmentHistoryRow({ appt }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 truncate">
          {appt.doctor?.email ? `Dr. ${displayName(appt.doctor.email)}` : 'Doctor'}
        </p>
        <p className="text-xs text-neutral-400">
          {formatShortDate(appt.scheduledAt)} · {formatTime(appt.scheduledAt)}
        </p>
      </div>
      <StatusBadge status={appt.status} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PatientDashboard
// ---------------------------------------------------------------------------

export default function PatientDashboard() {
  const { user } = useAuth();
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Fetch appointments
  const {
    data: apptData,
    loading: apptLoading,
    error: apptError,
  } = useApiFetch((token) => api.appointments.getPatientDashboard(token), []);

  // Fetch own records (pass user id as patientId)
  const {
    data: recordsData,
    loading: recordsLoading,
    error: recordsError,
  } = useApiFetch(
    (token) => user?.id ? api.records.getForPatient(token, user.id) : Promise.resolve({ records: [] }),
    [user?.id],
  );

  const nextAppt           = apptData?.nextAppointment ?? null;
  const recentAppointments = apptData?.recentAppointments ?? [];
  const recentRecords      = (recordsData?.records ?? []).slice(0, 5);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const hasError = apptError || recordsError;

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-heading-2">
            {greeting()}{user?.email ? `, ${displayName(user.email)}` : ''}
          </h2>
          <p className="text-body-sm mt-0.5">Patient dashboard</p>
        </div>

        {/* Book CTA — always visible in the header */}
        <Button variant="primary" size="md" className="shrink-0 sm:self-start" asChild>
          <Link to="/appointments">Book Appointment</Link>
        </Button>
      </div>

      {hasError && (
        <div
          role="alert"
          className="rounded border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-700"
        >
          {apptError || recordsError}
        </div>
      )}

      {/* ── Next appointment ─────────────────────────────────────────── */}
      <NextAppointmentCard appt={nextAppt} loading={apptLoading} />

      {/* ── Records + History grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent medical records */}
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-800">
                Recent Medical Records
              </p>
              {recentRecords.length > 0 && (
                <Link
                  to="/records"
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  View all →
                </Link>
              )}
            </div>
          </Card.Header>
          <Card.Body className="py-0 px-4">
            {recordsLoading ? (
              <div className="py-4 space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentRecords.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-neutral-400">No medical records yet.</p>
              </div>
            ) : (
              <div>
                {recentRecords.map((r) => (
                  <RecentRecordRow
                    key={r._id}
                    record={r}
                    onClick={setSelectedRecord}
                  />
                ))}
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Appointment history */}
        <Card>
          <Card.Header>
            <p className="text-sm font-semibold text-neutral-800">
              Appointment History
            </p>
          </Card.Header>
          <Card.Body className="py-0 px-4">
            {apptLoading ? (
              <div className="py-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-36" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded" />
                  </div>
                ))}
              </div>
            ) : recentAppointments.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-neutral-400">No appointment history yet.</p>
              </div>
            ) : (
              <div>
                {recentAppointments.map((a) => (
                  <AppointmentHistoryRow key={a._id} appt={a} />
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>

      {/* Record detail modal */}
      <RecordDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  );
}
