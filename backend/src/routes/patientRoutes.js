import { Router } from 'express';
import PatientProfile from '../models/PatientProfile.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { updatePatientSchema } from './patientSchemas.js';

const router = Router();

// ---------------------------------------------------------------------------
// Design notes
// ---------------------------------------------------------------------------
//
// Patient data is intentionally narrow-scoped:
//   - There is NO "list all patients" endpoint. Doctors look up a specific
//     patient by ID (subject to an appointment-relationship check — see /:id).
//   - Patients can only read and edit their own profile.
//   - Doctors see a patient's profile only when an appointment relationship
//     exists (stubbed as a TODO until the Appointment model is built).
//
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// GET /api/patients/me
// PATIENT only — returns the authenticated patient's own full profile.
// ---------------------------------------------------------------------------

router.get('/me', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const profile = await PatientProfile
      .findOne({ user: req.user.id })
      .select('-__v')
      .lean();

    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }

    return res.status(200).json({ profile });
  } catch (err) {
    console.error('[GET /api/patients/me] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/patients/:id
// DOCTOR only — fetch a specific patient's profile.
//
// Appointment-relationship check (STUBBED):
//   In production this endpoint should verify that the requesting doctor has
//   at least one appointment (past or upcoming) with the target patient before
//   returning their profile — preventing any doctor from looking up any patient.
//
//   TODO: Replace the stub below with a real Appointment.exists() query once
//   the Appointment model and routes are implemented, e.g.:
//
//     const hasRelationship = await Appointment.exists({
//       doctor: req.user.id,
//       patient: patientProfileId,
//       // optionally filter by status: { $in: ['CONFIRMED', 'COMPLETED'] }
//     });
//     if (!hasRelationship) {
//       return res.status(403).json({ error: 'Access denied.' });
//     }
//
// For now we enforce DOCTOR role only and skip the relationship check.
// ---------------------------------------------------------------------------

router.get('/:id', authenticate, authorize('DOCTOR'), async (req, res) => {
  try {
    // STUB: appointment-relationship check goes here (see TODO above).

    const profile = await PatientProfile
      .findOne({ _id: req.params.id })
      .select('-__v')
      .lean();

    if (!profile) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    return res.status(200).json({ profile });
  } catch (err) {
    // Malformed ObjectId → treat as not found, not a 500
    if (err.name === 'CastError') {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    console.error('[GET /api/patients/:id] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/patients/me
// PATIENT only — update the authenticated patient's own profile.
// Ownership is baked into the query via { user: req.user.id } — a patient can
// only ever modify the document linked to their own JWT.
// ---------------------------------------------------------------------------

router.put('/me', authenticate, authorize('PATIENT'), async (req, res) => {
  // 1. Validate
  const parseResult = updatePatientSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: parseResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  const updates = parseResult.data;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided.' });
  }

  try {
    // 2. Update — ownership enforced via { user: req.user.id }
    const profile = await PatientProfile.findOneAndUpdate(
      { user: req.user.id },
      { $set: updates },
      {
        new: true,           // return updated document
        runValidators: true, // enforce schema-level enum/min constraints
        select: '-__v',
      },
    ).lean();

    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }

    return res.status(200).json({ message: 'Profile updated successfully.', profile });
  } catch (err) {
    console.error('[PUT /api/patients/me] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

export default router;
