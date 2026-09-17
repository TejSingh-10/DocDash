import { Router } from 'express';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import PatientProfile from '../models/PatientProfile.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/me
// Protected: any authenticated user (DOCTOR or PATIENT).
// Returns the User document + the role-specific profile in one response.
// ---------------------------------------------------------------------------

router.get('/me', authenticate, async (req, res) => {
  try {
    // req.user is guaranteed by authenticate middleware
    const { id, role } = req.user;

    // Fetch the base user (omit passwordHash from the response)
    const user = await User.findById(id).select('-passwordHash').lean();
    if (!user) {
      // Shouldn't happen for a valid JWT, but guard anyway (e.g. deleted account)
      return res.status(401).json({ error: 'User not found. Please log in again.' });
    }

    // Fetch the role-specific profile. The profile collections store a `user`
    // reference, so we look up by that field rather than relying on User having
    // a back-reference to the profile.
    let profile = null;
    if (role === 'DOCTOR') {
      profile = await DoctorProfile.findOne({ user: id }).lean();
    } else if (role === 'PATIENT') {
      profile = await PatientProfile.findOne({ user: id }).lean();
    }
    // ADMIN has no dedicated profile collection — profile stays null.

    return res.status(200).json({ user, profile });
  } catch (err) {
    console.error('[GET /api/me] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

export default router;
