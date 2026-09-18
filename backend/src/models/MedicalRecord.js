import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient reference is required'],
    },
    // The doctor who authored this record.
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor (author) reference is required'],
    },
    // Optional link to the appointment that prompted this record.
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
      trim: true,
    },
    prescription: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    // Optional URL to a stored attachment (e.g. lab report, scan image).
    attachmentUrl: {
      type: String,
      trim: true,
    },
    // Soft-delete flag. No role may hard-delete a medical record — the audit
    // trail must be preserved. Set isArchived = true to hide a record from
    // normal queries without destroying it.
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Index for the most common read pattern: "all records for patient X, newest first."
// { patient: 1 } narrows to one patient; { createdAt: -1 } sorts descending without
// a separate sort stage, keeping list queries efficient as record volume grows.
medicalRecordSchema.index({ patient: 1, createdAt: -1 });

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

export default MedicalRecord;
