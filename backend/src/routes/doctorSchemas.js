import { z } from 'zod';

/**
 * Zod schema for PUT /api/doctors/me.
 *
 * Rules:
 *  - All fields are optional (partial update / PATCH semantics on a PUT endpoint).
 *  - licenseNumber is intentionally excluded — it is a permanent credential set
 *    at registration and must not be changed via this endpoint.
 *  - isActive is excluded — it is managed exclusively by DELETE /api/doctors/me.
 *  - `.strict()` rejects any extra keys, preventing accidental field injection.
 */
export const updateDoctorSchema = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be blank').optional(),
    specialization: z.string().trim().optional(),
    yearsOfExperience: z
      .number()
      .int('Years of experience must be a whole number')
      .min(0, 'Years of experience cannot be negative')
      .optional(),
    bio: z.string().trim().optional(),
  })
  .strict({ message: 'Unknown field(s) in request body.' });
