// ─── index.js ───────────────────────────────────────────────────
// Watchly Backend — Express + Socket.IO entry point

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { connectDB } = require('./db/mongodb');
const RoomRegistry = require('./classes/RoomRegistry');
const MessageHandler = require('./classes/MessageHandler');
const roomsRouter = require('./routes/rooms');

const PORT = process.env.PORT || 10000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ── Express Setup ────────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

app.use(cors({
  origin: [CLIENT_URL, /\.onrender\.com$/, /\.netlify\.app$/, /\.vercel\.app$/],
  credentials: true,
}));
app.use(express.json());

// ── Socket.IO Setup ───────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: [CLIENT_URL, /\.onrender\.com$/, /\.netlify\.app$/, /\.vercel\.app$/],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── OOP Instances ─────────────────────────────────────────────────
const registry = new RoomRegistry();
const messageHandler = new MessageHandler(io, registry);

// Expose registry to REST routes via app.locals
app.locals.registry = registry;

// ── Routes ───────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    ...registry.stats(),
  });
});

app.use('/api/rooms', roomsRouter);

// ── WebSocket Connections ─────────────────────────────────────────
io.on('connection', (socket) => {
  messageHandler.handle(socket);
});


// ── Startup ──────────────────────────────────────────────────────
async function start() {
  await connectDB();

  httpServer.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════╗
║   🎬 WATCHLY BACKEND                ║
║   Port   : ${PORT}                     ║
║   Client : ${CLIENT_URL}   ║
╚══════════════════════════════════════╝
    `);
  });
}

start();
