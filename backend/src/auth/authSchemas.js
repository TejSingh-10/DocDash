import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const emailSchema = z
  .string({ required_error: 'Email is required' })
  .email('Must be a valid email address')
  .toLowerCase()
  .trim();

/**
 * Password rules:
 *   - At least 8 characters
 *   - At least one uppercase letter
 *   - At least one digit
 *   - At least one special character
 */
const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character',
  );

// ---------------------------------------------------------------------------
// Role-specific profile fields
// ---------------------------------------------------------------------------

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const doctorFields = z.object({
  role: z.literal('DOCTOR'),
  licenseNumber: z
    .string({ required_error: 'License number is required for doctors' })
    .trim()
    .min(1, 'License number cannot be empty'),
  specialization: z.string().trim().optional(),
  yearsOfExperience: z
    .number()
    .int('Years of experience must be a whole number')
    .min(0, 'Years of experience cannot be negative')
    .optional(),
  bio: z.string().trim().optional(),
});

const emergencyContactSchema = z
  .object({
    name: z.string().trim().optional(),
    relationship: z.string().trim().optional(),
    phone: z.string().trim().optional(),
  })
  .optional();

const patientFields = z.object({
  role: z.literal('PATIENT'),
  dateOfBirth: z.coerce.date().optional(),
  gender: z
    .enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'], {
      errorMap: () => ({
        message:
          'Gender must be one of: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY',
      }),
    })
    .optional(),
  bloodGroup: z
    .enum(VALID_BLOOD_GROUPS, {
      errorMap: () => ({
        message: `Blood group must be one of: ${VALID_BLOOD_GROUPS.join(', ')}`,
      }),
    })
    .optional(),
  emergencyContact: emergencyContactSchema,
});

// ---------------------------------------------------------------------------
// Register schema — discriminated union on `role`
// ---------------------------------------------------------------------------

export const registerSchema = z
  .discriminatedUnion('role', [
    z.object({ email: emailSchema, password: passwordSchema }).merge(doctorFields),
    z.object({ email: emailSchema, password: passwordSchema }).merge(patientFields),
  ]);

// ---------------------------------------------------------------------------
// Login schema
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});
