import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor reference is required'],
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient reference is required'],
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled date/time is required'],
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [5, 'Duration must be at least 5 minutes'],
      max: [480, 'Duration cannot exceed 8 hours'],
    },
    status: {
      type: String,
      enum: {
        values: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
        message: 'Status must be one of: SCHEDULED, COMPLETED, CANCELLED, NO_SHOW',
      },
      default: 'SCHEDULED',
    },
    reason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

// Compound index on { doctor, scheduledAt } — the conflict-check query in
// appointmentService.js always filters by both fields, so this index ensures
// that query is a covered index scan rather than a full collection scan.
appointmentSchema.index({ doctor: 1, scheduledAt: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
