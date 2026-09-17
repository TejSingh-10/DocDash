import mongoose from 'mongoose';

const doctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    // Display name shown to patients (e.g. "Dr. Jane Smith").
    // Optional — not collected at registration but editable via PUT /api/doctors/me.
    name: {
      type: String,
      trim: true,
    },
    specialization: {
      type: String,
      trim: true,
    },
    // licenseNumber is a permanent credential — it is set at registration and
    // intentionally excluded from the public list/detail endpoints via .select().
    licenseNumber: {
      type: String,
      required: [true, 'License number is required'],
      unique: true,
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      min: [0, 'Years of experience cannot be negative'],
    },
    bio: {
      type: String,
      trim: true,
    },
    // Soft-delete flag — set to false by DELETE /api/doctors/me.
    // Defaults to true so existing documents are unaffected by the migration.
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

doctorProfileSchema.index({ user: 1 }, { unique: true });
doctorProfileSchema.index({ licenseNumber: 1 }, { unique: true });

const DoctorProfile = mongoose.model('DoctorProfile', doctorProfileSchema);

export default DoctorProfile;
