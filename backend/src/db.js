import mongoose from 'mongoose';

/**
 * Connects to MongoDB using the MONGODB_URI environment variable.
 * Throws on failure so the caller can decide whether to abort startup.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  await mongoose.connect(uri);

  console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
}
