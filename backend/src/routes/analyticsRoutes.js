import { Router } from 'express';
import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/analytics/summary
// Roles: DOCTOR, ADMIN
//
// Returns three independent aggregation results in a single response:
//
//   appointmentsPerWeek   — last 8 ISO weeks, one data point per week.
//                           DOCTOR sees only their own appointments.
//                           ADMIN sees all appointments.
//
//   statusBreakdown       — count of appointments per status value.
//                           Same role scoping as above.
//
//   newPatientsPerMonth   — count of new PATIENT-role User docs per month,
//                           last 12 months (ADMIN only — doctors see an empty
//                           array and the UI hides that chart).
//
// All dates are computed server-side and returned as ISO strings so the client
// can parse them without timezone arithmetic.
// ---------------------------------------------------------------------------

router.get(
  '/summary',
  authenticate,
  authorize('DOCTOR', 'ADMIN'),
  async (req, res) => {
    try {
      const { id: userId, role } = req.user;

      // ── Shared time boundaries ────────────────────────────────────────────
      const now = new Date();

      // Start of 8 weeks ago (Monday of that week, UTC)
      const eightWeeksAgo = new Date(now);
      eightWeeksAgo.setUTCDate(now.getUTCDate() - 7 * 8);
      eightWeeksAgo.setUTCHours(0, 0, 0, 0);

      // Start of 12 months ago
      const twelveMonthsAgo = new Date(now);
      twelveMonthsAgo.setUTCMonth(now.getUTCMonth() - 11);
      twelveMonthsAgo.setUTCDate(1);
      twelveMonthsAgo.setUTCHours(0, 0, 0, 0);

      // ── Base match stage — scoped by role ─────────────────────────────────
      // DOCTOR: only their own appointments.
      // ADMIN:  all appointments.
      const apptMatchBase = role === 'DOCTOR'
        ? { doctor: new mongoose.Types.ObjectId(userId) }
        : {};

      // ── 1. Appointments per week (last 8 weeks) ───────────────────────────
      //
      // $dateToString with format "%G-W%V" produces ISO week strings like
      // "2024-W38", which sort lexicographically in calendar order.
      //
      // Note: $isoWeekYear / $isoWeek are used instead of $year / $week
      // because ISO weeks cross year boundaries (e.g. Jan 1 can be week 52
      // of the previous year).
      const appointmentsPerWeek = await Appointment.aggregate([
        {
          $match: {
            ...apptMatchBase,
            scheduledAt: { $gte: eightWeeksAgo },
            status: { $ne: 'CANCELLED' },
          },
        },
        {
          $group: {
            _id: {
              // Truncate to ISO week — produces a stable, sortable week key
              week: { $isoWeek: '$scheduledAt' },
              year: { $isoWeekYear: '$scheduledAt' },
            },
            count: { $sum: 1 },
            // Keep one representative date per group for the chart x-axis label
            weekStart: { $min: '$scheduledAt' },
          },
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } },
        {
          $project: {
            _id: 0,
            week:      { $concat: [{ $toString: '$_id.year' }, '-W', { $toString: '$_id.week' }] },
            weekStart: 1,
            count:     1,
          },
        },
      ]);

      // ── 2. Status breakdown ───────────────────────────────────────────────
      const statusBreakdown = await Appointment.aggregate([
        { $match: apptMatchBase },
        {
          $group: {
            _id:   '$status',
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id:    0,
            status: '$_id',
            count:  1,
          },
        },
        { $sort: { status: 1 } },
      ]);

      // ── 3. New patient registrations per month (last 12 months) ──────────
      //
      // Only meaningful for ADMIN (who sees all users).
      // Doctors receive an empty array and the UI hides the chart.
      const newPatientsPerMonth = role === 'ADMIN'
        ? await User.aggregate([
            {
              $match: {
                role:      'PATIENT',
                createdAt: { $gte: twelveMonthsAgo },
              },
            },
            {
              $group: {
                _id: {
                  year:  { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            {
              $project: {
                _id:   0,
                month: {
                  $concat: [
                    { $toString: '$_id.year' },
                    '-',
                    {
                      $cond: [
                        { $lt: ['$_id.month', 10] },
                        { $concat: ['0', { $toString: '$_id.month' }] },
                        { $toString: '$_id.month' },
                      ],
                    },
                  ],
                },
                count: 1,
              },
            },
          ])
        : [];

      return res.status(200).json({
        generatedAt: now.toISOString(),
        role,
        appointmentsPerWeek,
        statusBreakdown,
        newPatientsPerMonth,
      });
    } catch (err) {
      console.error('[GET /api/analytics/summary]', err);
      return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  },
);

export default router;
