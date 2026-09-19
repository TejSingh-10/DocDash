import { z } from 'zod';

/**
 * Schema for POST /api/records (create a medical record).
 * All clinical fields except diagnosis are optional at creation time.
 */
export const createRecordSchema = z
  .object({
    patientId: z
      .string({ required_error: 'patientId is required' })
      .length(24, 'patientId must be a valid MongoDB ObjectId'),
    appointmentId: z
      .string()
      .length(24, 'appointmentId must be a valid MongoDB ObjectId')
      .optional(),
    diagnosis: z
      .string({ required_error: 'Diagnosis is required' })
      .trim()
      .min(1, 'Diagnosis cannot be blank'),
    prescription: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    attachmentUrl: z.string().url('attachmentUrl must be a valid URL').optional(),
  })
  .strict({ message: 'Unknown field(s) in request body.' });

/**
 * Schema for PATCH /api/records/:id (update a record).
 * All fields optional — at least one must be present (enforced in the handler).
 * diagnosis, patientId, and doctor cannot be changed after creation.
 */
export const updateRecordSchema = z
  .object({
    prescription: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    attachmentUrl: z.string().url('attachmentUrl must be a valid URL').optional(),
  })
  .strict({ message: 'Unknown field(s) in request body.' });
