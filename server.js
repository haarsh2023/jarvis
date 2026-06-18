require('dotenv').config();
const express = require('express');
const cors = require('cors');

const chatRoute = require('./routes/chat');

const app = express();

// --- CORS setup ---
// Only allow requests from your actual frontend (and localhost while developing).
// Update ALLOWED_ORIGINS in your .env / Render env vars.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (curl, server-to-server health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS: ' + origin));
    },
  })
);

app.use(express.json({ limit: '1mb' }));

// --- Health check (useful for Render + for you to confirm it's alive) ---
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'JARVIS backend is running.' });
});

// --- Main chat route (this is where the actual brain logic lives) ---
app.use('/api/chat', chatRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`JARVIS backend listening on port ${PORT}`);
});
