import Appointment from '../models/Appointment.js';

// ---------------------------------------------------------------------------
// Working hours configuration
// ---------------------------------------------------------------------------
//
// These are UTC-hour boundaries used as a placeholder until per-doctor working
// hours are modeled (e.g. a `workingHours` sub-document on DoctorProfile).
//
// IMPORTANT — timezone caveat:
//   All Date values stored in MongoDB are UTC. If your deployment spans multiple
//   timezones, "9am–6pm" means different wall-clock times for each user.
//   The correct long-term solution is to store the doctor's IANA timezone
//   (e.g. "Asia/Kolkata") and convert scheduledAt to local time before the
//   hours check. For now we apply the rule in UTC and note it here.
//
const WORKING_HOURS_START_UTC = 9;  // 09:00 UTC
const WORKING_HOURS_END_UTC   = 18; // 18:00 UTC

// ---------------------------------------------------------------------------
// checkAppointmentConflict
// ---------------------------------------------------------------------------

/**
 * Pure scheduling-validation function.
 *
 * Performs three checks in order:
 *   1. Rejects appointments in the past.
 *   2. Rejects appointments that start or end outside working hours (9am–6pm UTC).
 *   3. Queries the database for overlapping, non-cancelled appointments.
 *
 * Returns a plain result object so that route handlers and unit tests can
 * inspect the outcome without coupling to Express (req/res):
 *
 *   { ok: true }
 *     → No conflict; the appointment window is valid.
 *
 *   { ok: false, code: string, reason: string }
 *     → Validation failed or a conflict was found. `code` is a stable string
 *       suitable for programmatic handling by clients; `reason` is a
 *       human-readable message for API responses.
 *
 * @param {string|import('mongoose').Types.ObjectId} doctorId
 * @param {Date} scheduledAt   - The requested start time (must be a JS Date).
 * @param {number} durationMinutes - Length of the appointment in minutes (> 0).
 * @returns {Promise<{ ok: true } | { ok: false, code: string, reason: string }>}
 */
export async function checkAppointmentConflict(doctorId, scheduledAt, durationMinutes) {
  const requestedStart = new Date(scheduledAt);
  const requestedEnd   = new Date(requestedStart.getTime() + durationMinutes * 60_000);

  // ------------------------------------------------------------------
  // 1. Reject past appointments
  // ------------------------------------------------------------------
  if (requestedStart <= new Date()) {
    return {
      ok: false,
      code: 'APPOINTMENT_IN_PAST',
      reason: 'Appointment must be scheduled in the future.',
    };
  }

  // ------------------------------------------------------------------
  // 2. Working-hours check (placeholder: 9am–6pm UTC)
  //
  //    TODO: Replace with doctor's configured timezone/hours from
  //    DoctorProfile.workingHours once that field is modeled.
  // ------------------------------------------------------------------
  const startHour = requestedStart.getUTCHours() + requestedStart.getUTCMinutes() / 60;
  const endHour   = requestedEnd.getUTCHours()   + requestedEnd.getUTCMinutes()   / 60;

  if (startHour < WORKING_HOURS_START_UTC || endHour > WORKING_HOURS_END_UTC) {
    return {
      ok: false,
      code: 'OUTSIDE_WORKING_HOURS',
      reason: `Appointments must fall within working hours (${WORKING_HOURS_START_UTC}:00–${WORKING_HOURS_END_UTC}:00 UTC).`,
    };
  }

  // ------------------------------------------------------------------
  // 3. Overlap check — application-level, not a DB constraint
  //
  //    MongoDB has no native range-overlap constraint. A unique index on
  //    { doctor, scheduledAt } would only catch exact-start-time collisions;
  //    it cannot detect the case where a new 60-minute appointment starts
  //    30 minutes into an existing 60-minute one. This check must live here.
  //
  //    Two windows [A_start, A_end) and [B_start, B_end) overlap iff:
  //      A_start < B_end  AND  A_end > B_start
  //
  //    Translated to this query:
  //      - existing.scheduledAt        < requestedEnd    (existing starts before new one ends)
  //      - existing.scheduledAt
  //          + existing.durationMinutes < requestedStart  (existing ends after new one starts)
  //
  //    The second condition cannot be expressed as a simple field comparison
  //    because `scheduledAt + durationMinutes` is a derived value, so we use
  //    MongoDB's $expr + $add to compute it at query time.
  //
  //    The compound index { doctor: 1, scheduledAt: 1 } on Appointment makes
  //    the `scheduledAt: { $lt: requestedEnd }` range bound efficient.
  // ------------------------------------------------------------------

  const conflicting = await Appointment.findOne({
    doctor: doctorId,
    status: { $ne: 'CANCELLED' },           // cancelled slots don't block the calendar
    scheduledAt: { $lt: requestedEnd },      // existing appointment starts before new one ends
    $expr: {
      $gt: [
        // existing appointment's end time = scheduledAt + durationMinutes (in ms)
        { $add: ['$scheduledAt', { $multiply: ['$durationMinutes', 60_000] }] },
        requestedStart.getTime(),            // must be > new appointment's start
      ],
    },
  }).lean();

  if (conflicting) {
    const conflictEnd = new Date(
      conflicting.scheduledAt.getTime() + conflicting.durationMinutes * 60_000,
    );
    return {
      ok: false,
      code: 'APPOINTMENT_CONFLICT',
      reason:
        `The doctor already has an appointment from ` +
        `${conflicting.scheduledAt.toISOString()} to ${conflictEnd.toISOString()}.`,
    };
  }

  return { ok: true };
}
