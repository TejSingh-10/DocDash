import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    message: 'Hello World from Healthcare Management Dashboard API 🏥',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

// Connect to MongoDB first; only start the HTTP server if it succeeds.
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1); // Abort startup — don't serve traffic without a DB.
  });
