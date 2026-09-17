import { z } from 'zod';

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Zod schema for PUT /api/patients/me.
 *
 * Rules:
 *  - All fields are optional (partial / PATCH-style update on a PUT endpoint).
 *  - `user` and any internal fields are intentionally absent — they cannot be
 *    changed through this endpoint.
 *  - `.strict()` rejects any extra keys to prevent field injection.
 */
export const updatePatientSchema = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be blank').optional(),
    dateOfBirth: z.coerce.date().optional(),
    gender: z
      .enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'], {
        errorMap: () => ({
          message: 'Gender must be one of: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY',
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
    emergencyContact: z
      .object({
        name: z.string().trim().optional(),
        relationship: z.string().trim().optional(),
        phone: z.string().trim().optional(),
      })
      .optional(),
  })
  .strict({ message: 'Unknown field(s) in request body.' });
