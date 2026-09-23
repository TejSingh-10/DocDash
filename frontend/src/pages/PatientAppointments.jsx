import { useState, useCallback, useMemo } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiFetch } from '../hooks/useApiFetch.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtShort(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
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

/**
 * Map backend error codes to user-friendly messages.
 * Returns the original message as fallback so nothing is swallowed.
 */
function friendlyError(err) {
  const CODE_MESSAGES = {
    APPOINTMENT_CONFLICT:    'This slot is no longer available — the doctor is already booked. Please choose another time.',
    APPOINTMENT_IN_PAST:     'The selected time is in the past. Please pick a future slot.',
    OUTSIDE_WORKING_HOURS:   'That time is outside available hours (9 AM – 6 PM UTC). Please choose a slot within working hours.',
    DOCTOR_NOT_FOUND:        'This doctor is no longer available.',
  };
  const raw = err?.message ?? 'Something went wrong. Please try again.';
  // Try to extract a code from the error object itself (thrown from apiFetch)
  const code = err?.code;
  return CODE_MESSAGES[code] ?? raw;
}

// ---------------------------------------------------------------------------
// Time slots
// Generates 30-minute slots between 9:00 and 17:30 UTC for the selected date.
// The backend uses 9–18 UTC working hours, so the last 30-min slot starts 17:30.
// ---------------------------------------------------------------------------
function generateSlots(dateStr) {
  if (!dateStr) return [];
  const slots = [];
  // Build slots in UTC so they align with the backend's working-hours check
  for (let h = 9; h < 18; h++) {
    for (const m of [0, 30]) {
      if (h === 17 && m === 30) break; // last slot: 17:30 → ends 18:00
      const d = new Date(`${dateStr}T00:00:00.000Z`);
      d.setUTCHours(h, m, 0, 0);
      // Skip slots that are in the past
      if (d > new Date()) slots.push(d);
    }
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function Skeleton({ className = '' }) {
  return <div className={['animate-pulse bg-neutral-100 rounded', className].join(' ')} />;
}

// ---------------------------------------------------------------------------
// DoctorCard — shown in the doctor search list
// ---------------------------------------------------------------------------
function DoctorCard({ doctor, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(doctor)}
      className={[
        'w-full text-left p-4 rounded-lg border transition-all',
        selected
          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-400'
          : 'border-neutral-200 bg-white hover:border-primary-300 hover:bg-neutral-50',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary-600">
            {(doctor.name ?? doctor.specialization ?? 'Dr').slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900 truncate">
            {doctor.name ?? 'Doctor'}
          </p>
          <p className="text-xs text-neutral-500 truncate">
            {doctor.specialization ?? 'General Practice'}
            {doctor.yearsOfExperience ? ` · ${doctor.yearsOfExperience}y exp` : ''}
          </p>
        </div>
        {selected && (
          <svg className="w-5 h-5 text-primary-500 shrink-0 ml-auto" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      {doctor.bio && (
        <p className="text-xs text-neutral-400 mt-2 line-clamp-2">{doctor.bio}</p>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// BookingPanel — shown after a doctor is selected
// ---------------------------------------------------------------------------
function BookingPanel({ doctor, token, onBooked, onCancel }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const slots = useMemo(() => generateSlots(date), [date]);

  const handleBook = async () => {
    if (!selectedSlot) { setError('Please select a time slot.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.appointments.book(token, {
        doctorId:        doctor.user.toString(),
        scheduledAt:     selectedSlot.toISOString(),
        durationMinutes: 30,
        reason:          reason.trim() || undefined,
      });
      onBooked();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-5 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-meta mb-0.5">Booking with</p>
          <p className="text-sm font-semibold text-neutral-900">
            {doctor.name ?? 'Doctor'}{doctor.specialization ? ` · ${doctor.specialization}` : ''}
          </p>
        </div>
        <button onClick={onCancel} className="text-xs text-neutral-400 hover:text-neutral-600 underline">
          Change doctor
        </button>
      </div>

      {/* Date picker */}
      <div>
        <label className="text-meta mb-1 block">Select date</label>
        <input
          type="date"
          min={today}
          value={date}
          onChange={e => { setDate(e.target.value); setSelectedSlot(null); setError(''); }}
          className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 bg-white"
        />
      </div>

      {/* Time slots */}
      {date && (
        <div>
          <p className="text-meta mb-2">Available slots</p>
          {slots.length === 0 ? (
            <p className="text-sm text-neutral-400">No available slots for this date. All times have passed.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map(slot => {
                const isSelected = selectedSlot?.getTime() === slot.getTime();
                return (
                  <button
                    key={slot.toISOString()}
                    onClick={() => { setSelectedSlot(slot); setError(''); }}
                    className={[
                      'py-2 text-xs font-medium rounded border transition-colors',
                      isSelected
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-primary-400 hover:bg-primary-50',
                    ].join(' ')}
                  >
                    {fmtTime(slot)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reason */}
      {selectedSlot && (
        <div>
          <label className="text-meta mb-1 block">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Brief description of your visit…"
            maxLength={500}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 bg-white resize-none"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="text-sm text-danger-700 bg-danger-50 border border-danger-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Submit */}
      {date && slots.length > 0 && (
        <Button
          variant="primary"
          size="md"
          className="w-full"
          onClick={handleBook}
          disabled={!selectedSlot || submitting}
        >
          {submitting ? 'Booking…' : selectedSlot ? `Confirm for ${fmtTime(selectedSlot)}` : 'Select a slot above'}
        </Button>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// RescheduleModal — inline modal for moving an appointment
// ---------------------------------------------------------------------------
function RescheduleModal({ appt, token, onDone, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const slots = useMemo(() => generateSlots(date), [date]);

  const handleReschedule = async () => {
    if (!selectedSlot) { setError('Please select a new slot.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.appointments.reschedule(token, appt._id, {
        scheduledAt: selectedSlot.toISOString(),
      });
      onDone();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-900">Reschedule appointment</p>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 p-1">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-neutral-400">
          Current: {fmtShort(appt.scheduledAt)} at {fmtTime(appt.scheduledAt)}
        </p>

        <div>
          <label className="text-meta mb-1 block">New date</label>
          <input
            type="date"
            min={today}
            value={date}
            onChange={e => { setDate(e.target.value); setSelectedSlot(null); setError(''); }}
            className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 bg-white"
          />
        </div>

        {date && (
          <div>
            <p className="text-meta mb-2">New slot</p>
            {slots.length === 0 ? (
              <p className="text-sm text-neutral-400">No slots available for this date.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map(slot => {
                  const isSel = selectedSlot?.getTime() === slot.getTime();
                  return (
                    <button
                      key={slot.toISOString()}
                      onClick={() => { setSelectedSlot(slot); setError(''); }}
                      className={[
                        'py-2 text-xs font-medium rounded border transition-colors',
                        isSel
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-primary-400 hover:bg-primary-50',
                      ].join(' ')}
                    >
                      {fmtTime(slot)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {error && (
          <div role="alert" className="text-sm text-danger-700 bg-danger-50 border border-danger-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={handleReschedule}
            disabled={!selectedSlot || submitting}
          >
            {submitting ? 'Saving…' : 'Confirm new time'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PatientAppointmentCard
// ---------------------------------------------------------------------------
function PatientAppointmentCard({ appt, token, onRefetch }) {
  const [busy, setBusy] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [error, setError] = useState('');

  const isCancellable = appt.status === 'SCHEDULED' && new Date(appt.scheduledAt) > new Date();

  const handleCancel = async () => {
    if (!window.confirm('Cancel this appointment?')) return;
    setBusy(true);
    setError('');
    try {
      await api.appointments.updateStatus(token, appt._id, 'CANCELLED');
      onRefetch();
    } catch (err) {
      setError(err.message ?? 'Failed to cancel.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-neutral-900">
                {appt.doctor?.email ? `Dr. ${displayName(appt.doctor.email)}` : 'Doctor'}
              </p>
              <StatusBadge status={appt.status} />
            </div>
            <p className="text-sm text-neutral-600">
              {fmtShort(appt.scheduledAt)} · {fmtTime(appt.scheduledAt)}
              <span className="text-neutral-400 ml-1">({appt.durationMinutes} min)</span>
            </p>
            {appt.reason && (
              <p className="text-xs text-neutral-400 truncate">Reason: {appt.reason}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {isCancellable && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRescheduling(true)}
              className="text-primary-600 hover:bg-primary-50"
            >
              Reschedule
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={busy}
              className="text-danger-600 hover:bg-danger-50"
            >
              {busy ? 'Cancelling…' : 'Cancel'}
            </Button>
          </div>
        )}

        {error && (
          <p className="text-xs text-danger-600 mt-2">{error}</p>
        )}
      </Card>

      {rescheduling && (
        <RescheduleModal
          appt={appt}
          token={token}
          onDone={() => { setRescheduling(false); onRefetch(); }}
          onClose={() => setRescheduling(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// PatientAppointments — the full page
// ---------------------------------------------------------------------------
export default function PatientAppointments() {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Doctor list
  const { data: doctorsData, loading: doctorsLoading } = useApiFetch(
    (t) => api.doctors.list(t),
    [],
  );

  // Patient's own appointments — re-fetch when booking succeeds
  const { data: apptData, loading: apptLoading, refetch } = useApiFetch(
    (t) => api.appointments.getPatientAll(t),
    [],
  );

  const doctors = doctorsData?.doctors ?? [];
  const allAppts = apptData?.recentAppointments ?? [];

  // Client-side doctor search filter
  const filteredDoctors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return doctors;
    return doctors.filter(d =>
      (d.name ?? '').toLowerCase().includes(q) ||
      (d.specialization ?? '').toLowerCase().includes(q),
    );
  }, [doctors, searchQuery]);

  const handleBooked = () => {
    setSelectedDoctor(null);
    setBookingSuccess(true);
    refetch();
    setTimeout(() => setBookingSuccess(false), 4000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-heading-2">Appointments</h2>
        <p className="text-body-sm mt-0.5">Book new appointments and manage existing ones.</p>
      </div>

      {/* ── Success toast ─────────────────────────────────────────────── */}
      {bookingSuccess && (
        <div role="status" className="rounded border border-success-500 bg-success-50 px-4 py-3 text-sm text-success-700 font-medium">
          ✓ Appointment booked successfully!
        </div>
      )}

      {/* ── Book section ──────────────────────────────────────────────── */}
      <section>
        <h3 className="text-heading-3 mb-4">Book an Appointment</h3>

        {!selectedDoctor ? (
          <div className="space-y-3">
            {/* Search */}
            <Input
              placeholder="Search by name or specialization…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />

            {doctorsLoading ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-4 border border-neutral-200 rounded-lg">
                    <div className="flex gap-3">
                      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredDoctors.length === 0 ? (
              <p className="text-sm text-neutral-400 py-6 text-center">
                {searchQuery ? 'No doctors match your search.' : 'No doctors available.'}
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {filteredDoctors.map(d => (
                  <DoctorCard
                    key={d._id}
                    doctor={d}
                    selected={false}
                    onSelect={setSelectedDoctor}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <BookingPanel
            doctor={selectedDoctor}
            token={token}
            onBooked={handleBooked}
            onCancel={() => setSelectedDoctor(null)}
          />
        )}
      </section>

      {/* ── My appointments ───────────────────────────────────────────── */}
      <section>
        <h3 className="text-heading-3 mb-4">My Appointments</h3>

        {apptLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </Card>
            ))}
          </div>
        ) : allAppts.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-sm text-neutral-400">You have no appointments yet. Book one above!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {allAppts.map(appt => (
              <PatientAppointmentCard
                key={appt._id}
                appt={appt}
                token={token}
                onRefetch={refetch}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
