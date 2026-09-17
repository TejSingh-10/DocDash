import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      enum: {
        values: ['DOCTOR', 'PATIENT', 'ADMIN'],
        message: 'Role must be one of: DOCTOR, PATIENT, ADMIN',
      },
      required: [true, 'Role is required'],
    },
  },
  { timestamps: true },
);

// Explicit index declaration (unique: true above already creates it,
// but this makes the index intention self-documenting and easy to extend).
userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

export default User;
