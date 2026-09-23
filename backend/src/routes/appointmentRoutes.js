import { Router } from 'express';
import { z } from 'zod';
import Appointment from '../models/Appointment.js';
import DoctorProfile from '../models/DoctorProfile.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { checkAppointmentConflict } from '../services/appointmentService.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/appointments/me
// Returns the authenticated doctor's own appointments.
//
// Query params:
//   date  — ISO date string (YYYY-MM-DD). When provided, filters to
//            appointments that fall within that calendar day (in UTC).
//            Defaults to today when omitted.
//
// Response shape:
//   { appointments: [...], total: number, todayCount: number }
//
// The patient field is populated with { _id, email } from the User collection.
// PatientProfile name is not stored yet — the client should derive a display
// name from the email until a firstName/lastName field is added to the profile.
// ---------------------------------------------------------------------------

router.get(
  '/me',
  authenticate,
  authorize('DOCTOR'),
  async (req, res) => {
    try {
      // Resolve the requested date (defaults to today, UTC)
      const rawDate = req.query.date;
      const targetDate = rawDate ? new Date(rawDate) : new Date();

      // Clamp to midnight → midnight+1day in UTC so the filter is a full
      // calendar day regardless of when the server's clock is.
      const dayStart = new Date(targetDate);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      // Fetch today's appointments (for the summary panel)
      const todayAppointments = await Appointment.find({
        doctor: req.user.id,
        scheduledAt: { $gte: dayStart, $lt: dayEnd },
      })
        .populate('patient', 'email') // only email — no password hash exposed
        .sort({ scheduledAt: 1 })
        .lean();

      // Derive "recent patients" — distinct patients seen in the last 30 days,
      // ordered by most recent appointment. Used for the recent-patients panel.
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

      const recentAppointments = await Appointment.find({
        doctor: req.user.id,
        scheduledAt: { $gte: thirtyDaysAgo },
        status: { $in: ['SCHEDULED', 'COMPLETED'] },
      })
        .populate('patient', 'email')
        .sort({ scheduledAt: -1 })
        .lean();

      // De-duplicate by patient id, keep the most recent appointment per patient
      const seenIds = new Set();
      const recentPatients = [];
      for (const appt of recentAppointments) {
        const pid = appt.patient?._id?.toString();
        if (pid && !seenIds.has(pid)) {
          seenIds.add(pid);
          recentPatients.push({
            patientId:     pid,
            email:         appt.patient.email,
            lastSeen:      appt.scheduledAt,
            lastStatus:    appt.status,
          });
        }
        if (recentPatients.length >= 10) break; // cap the list
      }

      return res.status(200).json({
        date:             dayStart.toISOString().slice(0, 10),
        todayCount:       todayAppointments.length,
        appointments:     todayAppointments,
        recentPatients,
      });
    } catch (err) {
      console.error('[GET /api/appointments/me]', err);
      return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/appointments/patient-me
// Returns the authenticated PATIENT's own appointments.
//
// Response shape:
//   { nextAppointment: Appointment|null, recentAppointments: Appointment[] }
//
// nextAppointment — the next SCHEDULED appointment in the future (or null)
// recentAppointments — last 10 appointments (any status), newest first
//
// The doctor field is populated with { _id, email } from User.
// ---------------------------------------------------------------------------

router.get(
  '/patient-me',
  authenticate,
  authorize('PATIENT'),
  async (req, res) => {
    try {
      const now = new Date();

      // Next upcoming appointment — earliest future SCHEDULED one
      const nextAppointment = await Appointment.findOne({
        patient: req.user.id,
        status: 'SCHEDULED',
        scheduledAt: { $gt: now },
      })
        .populate('doctor', 'email')
        .sort({ scheduledAt: 1 })
        .lean();

      // Recent history — last 10 appointments regardless of status
      const recentAppointments = await Appointment.find({
        patient: req.user.id,
      })
        .populate('doctor', 'email')
        .sort({ scheduledAt: -1 })
        .limit(10)
        .lean();

      return res.status(200).json({
        nextAppointment,
        recentAppointments,
      });
    } catch (err) {
      console.error('[GET /api/appointments/patient-me]', err);
      return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/appointments/me/range
// Future: week/month view. Placeholder so the URL space is reserved.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// GET /api/appointments/all
// DOCTOR: all their own appointments, supports filter by status.
//
// Query params:
//   filter  — 'upcoming' | 'past' | 'cancelled' | '' (all, default)
//
// Response: { appointments: [...] }
// ---------------------------------------------------------------------------

router.get(
  '/all',
  authenticate,
  authorize('DOCTOR'),
  async (req, res) => {
    try {
      const { filter } = req.query;
      const now = new Date();
      let query = { doctor: req.user.id };

      if (filter === 'upcoming') {
        query.scheduledAt = { $gt: now };
        query.status = { $in: ['SCHEDULED'] };
      } else if (filter === 'past') {
        query.$or = [
          { scheduledAt: { $lte: now } },
          { status: { $in: ['COMPLETED', 'NO_SHOW'] } },
        ];
      } else if (filter === 'cancelled') {
        query.status = 'CANCELLED';
      }

      const appointments = await Appointment.find(query)
        .populate('patient', 'email')
        .sort({ scheduledAt: -1 })
        .lean();

      return res.status(200).json({ appointments });
    } catch (err) {
      console.error('[GET /api/appointments/all]', err);
      return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/appointments
// PATIENT only — book a new appointment.
//
// Body: { doctorId, scheduledAt, durationMinutes, reason? }
//
// Validates:
//   - doctorId references an active doctor
//   - Conflict check via appointmentService
//   - Working hours (9am–6pm UTC)
//   - Not in the past
//
// Error codes surfaced verbatim so the client can show specific messages:
//   APPOINTMENT_CONFLICT      — slot already taken
//   APPOINTMENT_IN_PAST       — selected time is in the past
//   OUTSIDE_WORKING_HOURS     — outside 9am–6pm UTC
//   DOCTOR_NOT_FOUND          — doctorId doesn't exist or is inactive
// ---------------------------------------------------------------------------

const bookSchema = z.object({
  doctorId:        z.string().length(24, 'Invalid doctorId'),
  scheduledAt:     z.string().datetime({ message: 'scheduledAt must be an ISO 8601 datetime' }),
  durationMinutes: z.number().int().min(15).max(120).default(30),
  reason:          z.string().trim().max(500).optional(),
});

router.post(
  '/',
  authenticate,
  authorize('PATIENT'),
  async (req, res) => {
    const parsed = bookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { doctorId, scheduledAt, durationMinutes, reason } = parsed.data;

    try {
      // Verify doctor exists and is active
      const doctorProfile = await DoctorProfile.findOne({ user: doctorId, isActive: true });
      if (!doctorProfile) {
        return res.status(404).json({ error: 'Doctor not found.', code: 'DOCTOR_NOT_FOUND' });
      }

      // Scheduling validation — conflict, past, working hours
      const check = await checkAppointmentConflict(
        doctorId,
        new Date(scheduledAt),
        durationMinutes,
      );

      if (!check.ok) {
        // Surface the machine-readable code so the client can show a specific
        // message (e.g. "This slot is no longer available") rather than generic text.
        return res.status(409).json({ error: check.reason, code: check.code });
      }

      const appointment = await Appointment.create({
        doctor:          doctorId,
        patient:         req.user.id,
        scheduledAt:     new Date(scheduledAt),
        durationMinutes,
        reason,
        status:          'SCHEDULED',
      });

      return res.status(201).json({ appointment });
    } catch (err) {
      console.error('[POST /api/appointments]', err);
      return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/appointments/:id/status
// Update appointment status with role-based constraints:
//   DOCTOR  → can set COMPLETED or NO_SHOW (only for their own appointments)
//   PATIENT → can set CANCELLED only (only for their own appointments)
// ---------------------------------------------------------------------------

router.patch(
  '/:id/status',
  authenticate,
  authorize('DOCTOR', 'PATIENT'),
  async (req, res) => {
    const { status } = req.body;
    const { id: userId, role } = req.user;

    const allowedByRole = role === 'DOCTOR'
      ? ['COMPLETED', 'NO_SHOW']
      : ['CANCELLED'];

    if (!status || !allowedByRole.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. ${role === 'DOCTOR' ? 'Doctors' : 'Patients'} may set: ${allowedByRole.join(', ')}.`,
      });
    }

    try {
      const appointment = await Appointment.findById(req.params.id).lean();
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found.' });
      }

      // Ownership check
      const ownerField = role === 'DOCTOR' ? 'doctor' : 'patient';
      if (appointment[ownerField].toString() !== userId) {
        return res.status(403).json({ error: 'You can only update your own appointments.' });
      }

      if (appointment.status === 'CANCELLED') {
        return res.status(409).json({ error: 'Cannot update a cancelled appointment.' });
      }

      const updated = await Appointment.findByIdAndUpdate(
        req.params.id,
        { $set: { status } },
        { new: true, select: '-__v' },
      ).lean();

      return res.status(200).json({ appointment: updated });
    } catch (err) {
      if (err.name === 'CastError') {
        return res.status(404).json({ error: 'Appointment not found.' });
      }
      console.error('[PATCH /api/appointments/:id/status]', err);
      return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/appointments/:id/reschedule
// PATIENT only — move an appointment to a new time.
// Re-runs the full conflict check against the new time.
// Cannot reschedule cancelled appointments.
// ---------------------------------------------------------------------------

const rescheduleSchema = z.object({
  scheduledAt:     z.string().datetime({ message: 'scheduledAt must be an ISO 8601 datetime' }),
  durationMinutes: z.number().int().min(15).max(120).optional(),
});

router.patch(
  '/:id/reschedule',
  authenticate,
  authorize('PATIENT'),
  async (req, res) => {
    const parsed = rescheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    try {
      const existing = await Appointment.findById(req.params.id).lean();
      if (!existing) return res.status(404).json({ error: 'Appointment not found.' });

      if (existing.patient.toString() !== req.user.id) {
        return res.status(403).json({ error: 'You can only reschedule your own appointments.' });
      }

      if (existing.status === 'CANCELLED') {
        return res.status(409).json({ error: 'Cannot reschedule a cancelled appointment.' });
      }

      const newStart    = new Date(parsed.data.scheduledAt);
      const newDuration = parsed.data.durationMinutes ?? existing.durationMinutes;

      // Temporarily exclude this appointment from conflict check so it doesn't
      // conflict with itself.
      const check = await checkAppointmentConflict(
        existing.doctor,
        newStart,
        newDuration,
        existing._id, // exclusion handled in the service (see note below)
      );

      if (!check.ok) {
        return res.status(409).json({ error: check.reason, code: check.code });
      }

      const updated = await Appointment.findByIdAndUpdate(
        req.params.id,
        { $set: { scheduledAt: newStart, durationMinutes: newDuration, status: 'SCHEDULED' } },
        { new: true, select: '-__v' },
      ).lean();

      return res.status(200).json({ appointment: updated });
    } catch (err) {
      if (err.name === 'CastError') return res.status(404).json({ error: 'Appointment not found.' });
      console.error('[PATCH /api/appointments/:id/reschedule]', err);
      return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  },
);

export default router;
