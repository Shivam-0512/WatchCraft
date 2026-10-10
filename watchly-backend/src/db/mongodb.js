// ─── mongodb.js ─────────────────────────────────────────────────
// MongoDB connection using Mongoose

const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const localUri = 'mongodb://127.0.0.1:27017/watchly';
  const uri = process.env.MONGODB_URI || localUri;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    isConnected = true;
    console.log(`[DB] Connected to MongoDB (${uri.includes('127.0.0.1') ? 'Local' : 'Atlas'})`);
  } catch (err) {
    if (uri !== localUri) {
      console.warn(`[DB] Primary connection failed (${err.message}). Trying local MongoDB fallback...`);
      try {
        await mongoose.connect(localUri, {
          serverSelectionTimeoutMS: 3000,
        });
        isConnected = true;
        console.log('[DB] Connected to Local MongoDB (127.0.0.1:27017)');
        return;
      } catch (localErr) {
        console.warn('[DB] Local MongoDB fallback failed:', localErr.message);
      }
    }
    console.error('[DB] MongoDB connection failed:', err.message);
    console.warn('[DB] Continuing without database persistence');
  }
}

function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDBConnected };
