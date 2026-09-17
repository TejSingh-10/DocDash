import mongoose from 'mongoose';

const doctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    specialization: {
      type: String,
      trim: true,
    },
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
  },
  { timestamps: true },
);

doctorProfileSchema.index({ user: 1 }, { unique: true });
doctorProfileSchema.index({ licenseNumber: 1 }, { unique: true });

const DoctorProfile = mongoose.model('DoctorProfile', doctorProfileSchema);

export default DoctorProfile;
