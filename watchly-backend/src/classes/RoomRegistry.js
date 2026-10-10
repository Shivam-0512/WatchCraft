// ─── RoomRegistry.js ────────────────────────────────────────────
// OOP: Central registry for all active in-memory rooms

const Room = require('./Room');
const { customAlphabet } = require('nanoid');

// 6-char uppercase alphanumeric room codes (e.g., "AB12XY")
const generateRoomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

class RoomRegistry {
  constructor() {
    /** @type {Map<string, Room>} roomId → Room */
    this.rooms = new Map();

    /** Reverse index: socketId → roomId (fast lookup) */
    this._socketToRoom = new Map();
  }

  /**
   * Create and register a new room.
   * @param {object} opts - Passed to Room constructor (roomId is optional)
   * @returns {Room}
   */
  create(opts) {
    const roomId = (opts.roomId || generateRoomId()).toUpperCase();
    const room = new Room({ ...opts, roomId });
    this.rooms.set(roomId, room);
    if (opts.hostSocketId) {
      this._socketToRoom.set(opts.hostSocketId, roomId);
    }
    return room;
  }

  /**
   * Get a room by its ID (case-insensitive).
   * @param {string} roomId
   * @returns {Room|undefined}
   */
  get(roomId) {
    if (!roomId) return undefined;
    return this.rooms.get(String(roomId).toUpperCase());
  }

  /**
   * Find which room a socket belongs to.
   * @param {string} socketId
   * @returns {Room|null}
   */
  findBySocket(socketId) {
    const roomId = this._socketToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) : null;
  }

  /**
   * Register a socket → room mapping (when a joiner joins).
   */
  registerSocket(socketId, roomId) {
    this._socketToRoom.set(socketId, String(roomId).toUpperCase());
  }

  /**
   * Unregister a socket (on disconnect).
   * Gives a 15-minute grace period before cleaning up empty rooms,
   * allowing host and participants to refresh or reload the page without room loss.
   * @param {string} socketId
   * @returns {{ room: Room|null, result: object }}
   */
  unregisterSocket(socketId) {
    const room = this.findBySocket(socketId);
    this._socketToRoom.delete(socketId);

    if (!room) return { room: null, result: null };

    const result = room.removeParticipant(socketId);

    // If room is empty, schedule cleanup with a 15-minute grace period
    if (room.isEmpty()) {
      room.scheduleCleanup(() => {
        if (room.isEmpty()) {
          this.rooms.delete(room.roomId);
          console.log(`[ROOM ${room.roomId}] Cleaned up after 15m idle`);
        }
      }, 15 * 60 * 1000);
    }

    return { room, result };
  }

  /**
   * Delete a room explicitly.
   * @param {string} roomId
   */
  delete(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      // Unmap all participant sockets
      room.participants.forEach((p) => this._socketToRoom.delete(p.socketId));
      this.rooms.delete(roomId);
    }
  }

  /**
   * Get all active rooms.
   * @returns {Room[]}
   */
  getAll() {
    return Array.from(this.rooms.values());
  }

  /**
   * Get rooms filtered by genre (case-insensitive).
   * @param {string} genre
   * @returns {Room[]}
   */
  getByGenre(genre) {
    const g = genre.toLowerCase();
    return this.getAll().filter((r) => r.genre.toLowerCase() === g);
  }

  /** Stats for debugging / monitoring */
  stats() {
    return {
      totalRooms: this.rooms.size,
      totalConnections: this._socketToRoom.size,
    };
  }
}

module.exports = RoomRegistry;
