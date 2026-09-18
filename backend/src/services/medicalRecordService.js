import Appointment from '../models/Appointment.js';

// ---------------------------------------------------------------------------
// Design notes
// ---------------------------------------------------------------------------
//
// This module centralises all access-control decisions for medical records so
// that route handlers stay thin and the rules are easy to unit test without
// spinning up Express.
//
// Every function returns a plain result object:
//
//   { ok: true }
//     → Access is permitted.
//
//   { ok: false, code: string, reason: string }
//     → Access is denied. `code` is a stable string for programmatic handling;
//       `reason` is a human-readable message for API responses.
//       Callers map `ok: false` to 403 (or 404 when revealing the record's
//       existence would itself be a leak).
//
// Synchronous vs asynchronous:
//   - canReadRecord, canUpdateRecord, canArchiveRecord accept an already-fetched
//     record object and are therefore synchronous (no DB I/O needed). This makes
//     them trivially unit-testable with plain objects.
//   - canDoctorCreateRecord requires a DB query to verify the appointment
//     relationship, so it is async.
//
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// canReadRecord
//
// Access rules:
//   PATIENT — can read their own records (record.patient matches userId).
//   DOCTOR  — can read records they authored (record.doctor matches userId).
//   Other   — denied.
//
// @param {string} userId  — req.user.id from the JWT (string)
// @param {string} role    — req.user.role from the JWT
// @param {object} record  — a lean MedicalRecord document (record.patient and
//                           record.doctor must be ObjectIds or strings)
// ---------------------------------------------------------------------------

export function canReadRecord(userId, role, record) {
  if (role === 'PATIENT') {
    if (record.patient.toString() === userId) {
      return { ok: true };
    }
    return {
      ok: false,
      code: 'ACCESS_DENIED',
      reason: 'Patients can only read their own medical records.',
    };
  }

  if (role === 'DOCTOR') {
    if (record.doctor.toString() === userId) {
      return { ok: true };
    }
    return {
      ok: false,
      code: 'ACCESS_DENIED',
      reason: 'Doctors can only read records they authored.',
    };
  }

  return {
    ok: false,
    code: 'ACCESS_DENIED',
    reason: 'Your role does not have access to medical records.',
  };
}

// ---------------------------------------------------------------------------
// canDoctorCreateRecord
//
// A doctor may only create a medical record for a patient if a COMPLETED or
// SCHEDULED appointment between them already exists. This establishes an
// explicit care relationship before allowing records to be written.
//
// Note: the appointment status list is intentionally permissive (SCHEDULED
// included) so a doctor can begin documenting during or immediately after a
// consultation before marking the appointment COMPLETED.
//
// @param {string|ObjectId} doctorId   — the requesting doctor's User._id
// @param {string|ObjectId} patientId  — the target patient's User._id
// ---------------------------------------------------------------------------

export async function canDoctorCreateRecord(doctorId, patientId) {
  const hasRelationship = await Appointment.exists({
    doctor: doctorId,
    patient: patientId,
    status: { $in: ['SCHEDULED', 'COMPLETED'] },
  });

  if (!hasRelationship) {
    return {
      ok: false,
      code: 'NO_APPOINTMENT_RELATIONSHIP',
      reason:
        'A medical record can only be created for a patient with whom you ' +
        'have a scheduled or completed appointment.',
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// canUpdateRecord
//
// Only the authoring doctor may update a record.
// Patients have read-only access to their records — they may never write them.
//
// @param {string} userId  — req.user.id from the JWT
// @param {string} role    — req.user.role from the JWT
// @param {object} record  — a lean MedicalRecord document
// ---------------------------------------------------------------------------

export function canUpdateRecord(userId, role, record) {
  if (role !== 'DOCTOR') {
    return {
      ok: false,
      code: 'ACCESS_DENIED',
      reason: 'Only the authoring doctor may update a medical record.',
    };
  }

  if (record.doctor.toString() !== userId) {
    return {
      ok: false,
      code: 'ACCESS_DENIED',
      reason: 'You can only update records that you authored.',
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// canArchiveRecord
//
// Soft-delete: sets isArchived = true. Same authorship rule as canUpdateRecord.
//
// Hard deletion is intentionally unsupported — no function for it exists in
// this service. Medical records must be retained for audit and legal purposes.
//
// @param {string} userId  — req.user.id from the JWT
// @param {string} role    — req.user.role from the JWT
// @param {object} record  — a lean MedicalRecord document
// ---------------------------------------------------------------------------

export function canArchiveRecord(userId, role, record) {
  if (role !== 'DOCTOR') {
    return {
      ok: false,
      code: 'ACCESS_DENIED',
      reason: 'Only the authoring doctor may archive a medical record.',
    };
  }

  if (record.doctor.toString() !== userId) {
    return {
      ok: false,
      code: 'ACCESS_DENIED',
      reason: 'You can only archive records that you authored.',
    };
  }

  return { ok: true };
}
