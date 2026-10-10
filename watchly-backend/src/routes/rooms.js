// ─── rooms.js ───────────────────────────────────────────────────
// REST API routes for room management

const express = require('express');
const router = express.Router();
const RoomModel = require('../models/Room.model');

/**
 * GET /api/rooms
 * Query: ?genre=anime
 * Returns list of active rooms (optionally filtered by genre)
 */
router.get('/', async (req, res) => {
  try {
    const { genre } = req.query;
    const registry = req.app.locals.registry;
    const { isDBConnected } = require('../db/mongodb');

    let dbRooms = [];
    if (isDBConnected()) {
      try {
        const filter = { isActive: true, visibility: { $ne: 'private' } };
        if (genre) filter.genre = genre.toLowerCase();
        dbRooms = await RoomModel
          .find(filter)
          .sort({ viewerCount: -1, createdAt: -1 })
          .limit(50)
          .select('roomId name genre visibility currentVideoId viewerCount createdAt')
          .lean();
      } catch (dbErr) {
        console.warn('[DB] Failed to query rooms:', dbErr.message);
      }
    }

    // Live in-memory rooms are always accurate and immediate
    const liveRooms = (genre ? registry.getByGenre(genre) : registry.getAll())
      .filter((r) => r.visibility !== 'private');
    const liveMap = new Map();

    liveRooms.forEach((r) => {
      liveMap.set(r.roomId, {
        roomId: r.roomId,
        name: r.name,
        genre: r.genre,
        visibility: r.visibility,
        currentVideoId: r.videoState.videoId || '',
        viewerCount: r.participants.size,
        createdAt: new Date(),
        isLive: true,
      });
    });

    // Merge any DB rooms not currently active in memory
    dbRooms.forEach((r) => {
      if (!liveMap.has(r.roomId)) {
        liveMap.set(r.roomId, { ...r, isLive: false });
      }
    });

    res.json({ success: true, rooms: Array.from(liveMap.values()) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/rooms/live
 * Returns in-memory active room counts per genre (uses registry)
 * Registry is injected via req.app.locals.registry
 */
router.get('/live', (req, res) => {
  try {
    const registry = req.app.locals.registry;
    const all = registry.getAll().filter((r) => r.visibility !== 'private');

    const genres = ['anime', 'education', 'movies', 'music', 'gaming', 'tvshows', 'other', 'sports'];
    const stats = {};
    genres.forEach((g) => {
      const rooms = registry.getByGenre(g).filter((r) => r.visibility !== 'private');
      stats[g] = {
        roomCount: rooms.length,
        viewerCount: rooms.reduce((sum, r) => sum + r.participants.size, 0),
        rooms: rooms.map((r) => r.getPublicState()),
      };
    });

    res.json({
      success: true,
      totalRooms: all.length,
      totalViewers: all.reduce((sum, r) => sum + r.participants.size, 0),
      byGenre: stats,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/rooms/:roomId
 * Get info about a specific room
 */
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const registry = req.app.locals.registry;

    // First check in-memory (live state)
    const liveRoom = registry.get(roomId.toUpperCase());
    if (liveRoom) {
      return res.json({ success: true, room: liveRoom.getPublicState(), isLive: true });
    }

    // Fall back to DB (room may be persisted but not currently active)
    const dbRoom = await RoomModel.findOne({ roomId: roomId.toUpperCase() }).lean();
    if (!dbRoom) return res.status(404).json({ success: false, error: 'Room not found' });

    res.json({ success: true, room: dbRoom, isLive: false });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/rooms
 * Create a new room. Returns roomId for client to then join via WebSocket.
 * Body: { name, genre, hostUsername }
 */
router.post('/', async (req, res) => {
  try {
    const { name, genre, hostUsername, visibility } = req.body;
    if (!name || !genre || !hostUsername) {
      return res.status(400).json({ success: false, error: 'name, genre, hostUsername required' });
    }

    const validGenres = ['anime', 'education', 'movies', 'music', 'gaming', 'tvshows', 'other', 'sports'];
    if (!validGenres.includes(genre.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Invalid genre' });
    }

    // Room is created in-memory when host joins via WebSocket.
    // This REST endpoint creates the DB record + returns an ID.
    const registry = req.app.locals.registry;

    // Create a temporary placeholder room to generate the ID
    const { customAlphabet } = require('nanoid');
    const generateRoomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);
    const roomId = generateRoomId();

    // Save to DB so it appears in room lists
    const dbRoom = await RoomModel.create({
      roomId,
      name: name.trim().slice(0, 80),
      genre: genre.toLowerCase(),
      visibility: visibility === 'private' ? 'private' : 'public',
      currentVideoId: '',
      viewerCount: 0,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      roomId: dbRoom.roomId,
      name: dbRoom.name,
      genre: dbRoom.genre,
      visibility: dbRoom.visibility,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'Room ID collision, please retry' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
