import { Router } from 'express';
import MedicalRecord from '../models/MedicalRecord.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  canDoctorCreateRecord,
  canReadRecord,
  canUpdateRecord,
  canArchiveRecord,
} from '../services/medicalRecordService.js';
import { withAudit } from '../services/auditService.js';
import { createRecordSchema, updateRecordSchema } from './recordSchemas.js';

const router = Router();
const RESOURCE_TYPE = 'MedicalRecord';

// ---------------------------------------------------------------------------
// Audit contract for this router
// ---------------------------------------------------------------------------
//
// RULE: Every handler in this file MUST obtain its DB result via `withAudit`.
//       Do not call MedicalRecord methods directly outside of a `withAudit`
//       callback — that would bypass the audit trail.
//
// Actions used:
//   CREATE  — POST /api/records
//   LIST    — GET  /api/records/patient/:patientId
//   UPDATE  — PATCH /api/records/:id
//   ARCHIVE — PATCH /api/records/:id/archive
//
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// POST /api/records
// DOCTOR only. Subject to appointment-relationship check.
// ---------------------------------------------------------------------------

router.post('/', authenticate, authorize('DOCTOR'), async (req, res) => {
  // 1. Validate input
  const parseResult = createRecordSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: parseResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  const { patientId, appointmentId, diagnosis, prescription, notes, attachmentUrl } =
    parseResult.data;

  // 2. Appointment-relationship check
  const accessCheck = await canDoctorCreateRecord(req.user.id, patientId);
  if (!accessCheck.ok) {
    return res.status(403).json({ error: accessCheck.reason });
  }

  try {
    // 3. Create record — resourceId is a lazy function because the _id only
    //    exists after the document is written.
    const record = await withAudit(
      {
        userId: req.user.id,
        action: 'CREATE',
        resourceType: RESOURCE_TYPE,
        resourceId: (r) => r._id,
        metadata: { patientId, appointmentId: appointmentId ?? null },
      },
      () =>
        MedicalRecord.create({
          patient: patientId,
          doctor: req.user.id,
          appointment: appointmentId,
          diagnosis,
          prescription,
          notes,
          attachmentUrl,
        }),
    );

    return res.status(201).json({ record });
  } catch (err) {
    console.error('[POST /api/records] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/records/patient/:patientId
// DOCTOR or PATIENT.
//   - PATIENT: patientId must match req.user.id (own records only).
//   - DOCTOR:  returns only records the doctor authored for that patient.
// ---------------------------------------------------------------------------

router.get(
  '/patient/:patientId',
  authenticate,
  authorize('DOCTOR', 'PATIENT'),
  async (req, res) => {
    const { patientId } = req.params;
    const { id: userId, role } = req.user;

    // Patients can only view their own records
    if (role === 'PATIENT' && patientId !== userId) {
      return res.status(403).json({ error: 'Patients can only view their own records.' });
    }

    try {
      // Build query — always exclude archived records from normal listing
      const query =
        role === 'DOCTOR'
          ? { patient: patientId, doctor: userId, isArchived: false }
          : { patient: patientId, isArchived: false };

      const records = await withAudit(
        {
          userId,
          action: 'LIST',
          resourceType: RESOURCE_TYPE,
          resourceId: null, // list action has no single resource ID
          metadata: { patientId, role, filter: query },
        },
        () =>
          MedicalRecord.find(query)
            .sort({ createdAt: -1 }) // newest first — matches the index direction
            .select('-__v')
            .lean(),
      );

      return res.status(200).json({ count: records.length, records });
    } catch (err) {
      console.error('[GET /api/records/patient/:patientId] Unexpected error:', err);
      return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/records/:id
// Author DOCTOR only. Updates prescription, notes, and/or attachmentUrl.
// diagnosis and patient are immutable after creation.
// ---------------------------------------------------------------------------

router.patch('/:id', authenticate, authorize('DOCTOR'), async (req, res) => {
  // 1. Validate input
  const parseResult = updateRecordSchema.safeParse(req.body);
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
    // 2. Fetch record to check authorship
    const existing = await MedicalRecord.findById(req.params.id).lean();
    if (!existing) {
      return res.status(404).json({ error: 'Medical record not found.' });
    }

    // 3. Access check
    const accessCheck = canUpdateRecord(req.user.id, req.user.role, existing);
    if (!accessCheck.ok) {
      return res.status(403).json({ error: accessCheck.reason });
    }

    // 4. Update (wrapped in audit)
    const record = await withAudit(
      {
        userId: req.user.id,
        action: 'UPDATE',
        resourceType: RESOURCE_TYPE,
        resourceId: existing._id,
        metadata: { fieldsUpdated: Object.keys(updates) },
      },
      () =>
        MedicalRecord.findByIdAndUpdate(
          req.params.id,
          { $set: updates },
          { new: true, runValidators: true, select: '-__v' },
        ).lean(),
    );

    return res.status(200).json({ message: 'Record updated successfully.', record });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: 'Medical record not found.' });
    }
    console.error('[PATCH /api/records/:id] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/records/:id/archive
// Soft-delete — author DOCTOR only.
// Hard deletion is intentionally absent from this router (and from the model
// service) to preserve the audit trail.
// ---------------------------------------------------------------------------

router.patch('/:id/archive', authenticate, authorize('DOCTOR'), async (req, res) => {
  try {
    // 1. Fetch record to check authorship
    const existing = await MedicalRecord.findById(req.params.id).lean();
    if (!existing) {
      return res.status(404).json({ error: 'Medical record not found.' });
    }

    if (existing.isArchived) {
      return res.status(409).json({ error: 'This record is already archived.' });
    }

    // 2. Access check
    const accessCheck = canArchiveRecord(req.user.id, req.user.role, existing);
    if (!accessCheck.ok) {
      return res.status(403).json({ error: accessCheck.reason });
    }

    // 3. Soft-delete (wrapped in audit)
    await withAudit(
      {
        userId: req.user.id,
        action: 'ARCHIVE',
        resourceType: RESOURCE_TYPE,
        resourceId: existing._id,
        metadata: { patientId: existing.patient.toString() },
      },
      () =>
        MedicalRecord.findByIdAndUpdate(
          req.params.id,
          { $set: { isArchived: true } },
          { new: true },
        ).lean(),
    );

    return res.status(200).json({ message: 'Record archived successfully.' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: 'Medical record not found.' });
    }
    console.error('[PATCH /api/records/:id/archive] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

export default router;
