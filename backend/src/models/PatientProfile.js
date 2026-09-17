import mongoose from 'mongoose';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    relationship: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false }, // embedded sub-doc, no separate _id needed
);

const patientProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: {
        values: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'],
        message: 'Gender must be one of: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY',
      },
      trim: true,
    },
    bloodGroup: {
      type: String,
      enum: {
        values: BLOOD_GROUPS,
        message: `Blood group must be one of: ${BLOOD_GROUPS.join(', ')}`,
      },
    },
    emergencyContact: {
      type: emergencyContactSchema,
    },
  },
  { timestamps: true },
);

patientProfileSchema.index({ user: 1 }, { unique: true });

const PatientProfile = mongoose.model('PatientProfile', patientProfileSchema);

export default PatientProfile;
