import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import PatientProfile from '../models/PatientProfile.js';
import { registerSchema, loginSchema } from './authSchemas.js';

const BCRYPT_SALT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Signs a JWT containing `userId` and `role`.
 * Reads JWT_SECRET and JWT_EXPIRES_IN from the environment.
 */
function signToken(userId, role) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }

  return jwt.sign({ userId: userId.toString(), role }, secret, { expiresIn });
}

/**
 * Returns a sanitised user object safe to include in API responses.
 * Deliberately omits `passwordHash`.
 */
function sanitiseUser(user) {
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

/**
 * Creates a User + the matching DoctorProfile or PatientProfile inside a
 * Mongoose session/transaction so that a failure mid-way cannot leave an
 * orphaned User document without a profile.
 *
 * IMPORTANT — Transactions require MongoDB to be running as a replica set:
 *   - Atlas free-tier (M0/M2/M5) is always a replica set — no extra config needed.
 *   - Local mongod: start with `mongod --replSet rs0` and run `rs.initiate()`
 *     once in mongosh.  Alternatively, point MONGODB_URI at an Atlas cluster
 *     during local development to avoid this entirely.
 */
export async function register(req, res) {
  // 1. Validate input
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: parseResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  const data = parseResult.data;
  const { email, password, role, ...profileFields } = data;

  // 2. Start a Mongoose session and wrap everything in a transaction.
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 3. Guard against duplicate emails before writing anything.
    const existing = await User.findOne({ email }).session(session).lean();
    if (existing) {
      await session.abortTransaction();
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    // 4. Hash the password.
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // 5. Create the User document (inside the transaction).
    const [user] = await User.create([{ email, passwordHash, role }], { session });

    // 6. Create the role-specific profile (inside the same transaction).
    if (role === 'DOCTOR') {
      const { licenseNumber, specialization, yearsOfExperience, bio } = profileFields;
      await DoctorProfile.create(
        [{ user: user._id, licenseNumber, specialization, yearsOfExperience, bio }],
        { session },
      );
    } else {
      // PATIENT
      const { dateOfBirth, gender, bloodGroup, emergencyContact } = profileFields;
      await PatientProfile.create(
        [{ user: user._id, dateOfBirth, gender, bloodGroup, emergencyContact }],
        { session },
      );
    }

    // 7. Commit — both documents land atomically.
    await session.commitTransaction();

    // 8. Issue a JWT and respond.
    const token = signToken(user._id, user.role);

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: sanitiseUser(user),
    });
  } catch (err) {
    await session.abortTransaction();

    // MongoDB duplicate-key error (e.g. licenseNumber already exists)
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
      return res.status(409).json({
        error: `A record with that ${field} already exists.`,
      });
    }

    console.error('[register] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  } finally {
    await session.endSession();
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

export async function login(req, res) {
  // 1. Validate input.
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: parseResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  const { email, password } = parseResult.data;

  try {
    // 2. Look up the user — deliberately use a single generic error message for
    //    both "no user found" and "wrong password" to prevent email enumeration.
    const user = await User.findOne({ email }).lean();

    const passwordMatches =
      user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // 3. Sign and return the JWT.
    const token = signToken(user._id, user.role);

    return res.status(200).json({
      token,
      user: sanitiseUser(user),
    });
  } catch (err) {
    console.error('[login] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
}
