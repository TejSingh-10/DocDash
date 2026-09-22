import { Router } from 'express';
import Appointment from '../models/Appointment.js';
import PatientProfile from '../models/PatientProfile.js';
import { authenticate, authorize } from '../middleware/auth.js';

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

export default router;
