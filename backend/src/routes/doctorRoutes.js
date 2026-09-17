import { Router } from 'express';
import DoctorProfile from '../models/DoctorProfile.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { updateDoctorSchema } from './doctorSchemas.js';

const router = Router();

// ---------------------------------------------------------------------------
// Public-field projection
// ---------------------------------------------------------------------------

/**
 * Fields excluded from every public-facing response via Mongoose .select().
 * Using an exclusion projection means new public fields added to the schema
 * appear automatically — only sensitive additions need to be listed here.
 *
 * Excluded:
 *  - licenseNumber  — permanent credential, not for public display
 *  - isActive       — internal flag; inactive doctors are filtered out at the
 *                     query level, so there's no value exposing the field
 *  - __v            — Mongoose version key, irrelevant to API consumers
 */
const PUBLIC_SELECT = '-licenseNumber -isActive -__v';

// ---------------------------------------------------------------------------
// GET /api/doctors
// Authenticated: DOCTOR or PATIENT
// Returns the list of active doctors with public fields only.
// ---------------------------------------------------------------------------

router.get('/', authenticate, authorize('DOCTOR', 'PATIENT'), async (req, res) => {
  try {
    const doctors = await DoctorProfile
      .find({ isActive: true })
      .select(PUBLIC_SELECT)
      .lean();

    return res.status(200).json({ count: doctors.length, doctors });
  } catch (err) {
    console.error('[GET /api/doctors] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/doctors/:id
// Authenticated: DOCTOR or PATIENT
// Returns a single active doctor's public profile.
// ---------------------------------------------------------------------------

router.get('/:id', authenticate, authorize('DOCTOR', 'PATIENT'), async (req, res) => {
  try {
    const doctor = await DoctorProfile
      .findOne({ _id: req.params.id, isActive: true })
      .select(PUBLIC_SELECT)
      .lean();

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    return res.status(200).json({ doctor });
  } catch (err) {
    // Malformed ObjectId → treat as not found, not a 500
    if (err.name === 'CastError') {
      return res.status(404).json({ error: 'Doctor not found.' });
    }
    console.error('[GET /api/doctors/:id] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/doctors/me
// DOCTOR only — updates the authenticated doctor's own profile.
// Ownership is enforced by looking up the profile via req.user.id (from the JWT),
// so a doctor can never modify another doctor's document even if they craft a
// request with a different ID.
// ---------------------------------------------------------------------------

router.put('/me', authenticate, authorize('DOCTOR'), async (req, res) => {
  // 1. Validate the request body
  const parseResult = updateDoctorSchema.safeParse(req.body);
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
    // 2. Find and update — ownership enforced by matching on req.user.id
    const profile = await DoctorProfile.findOneAndUpdate(
      { user: req.user.id },      // ownership: this doctor's profile only
      { $set: updates },
      {
        new: true,                // return the updated document
        runValidators: true,      // run schema-level validators on update
        select: PUBLIC_SELECT,    // return only public fields
      },
    ).lean();

    if (!profile) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    return res.status(200).json({ message: 'Profile updated successfully.', profile });
  } catch (err) {
    console.error('[PUT /api/doctors/me] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/doctors/me
// DOCTOR only — soft-deletes (deactivates) the authenticated doctor's account.
// Sets isActive = false instead of removing the document, preserving audit
// history and any foreign-key references (e.g. appointments) that may exist.
// ---------------------------------------------------------------------------

router.delete('/me', authenticate, authorize('DOCTOR'), async (req, res) => {
  try {
    const profile = await DoctorProfile.findOneAndUpdate(
      { user: req.user.id },    // ownership enforced via JWT
      { $set: { isActive: false } },
      { new: true },
    );

    if (!profile) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    return res.status(200).json({ message: 'Account deactivated successfully.' });
  } catch (err) {
    console.error('[DELETE /api/doctors/me] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

export default router;
