// ─── Room.js ────────────────────────────────────────────────────
// OOP: Encapsulates all state and logic for a single watch party room

const Participant = require('./Participant');

class Room {
  /**
   * @param {object} opts
   * @param {string} opts.roomId        - Unique 6-char room code
   * @param {string} opts.name          - Human-readable room name
   * @param {string} opts.genre         - Genre category (anime, education, etc.)
   * @param {string} opts.hostSocketId  - Socket ID of the creator (auto Host)
   * @param {string} opts.hostUsername  - Display name of host
   * @param {'public'|'private'} [opts.visibility] - Room visibility
   * @param {object} opts.io            - Socket.IO server instance (for broadcast)
   */
  constructor({ roomId, name, genre, hostSocketId, hostUsername, hostUserId, visibility = 'public', io }) {
    this.roomId = roomId;
    this.name = name;
    this.genre = genre;
    this.visibility = visibility === 'private' ? 'private' : 'public';
    this.io = io;
    this.createdAt = new Date();

    // Persistent creator & host identity across reconnects / browser refreshes
    this.creatorUserId = hostUserId || hostSocketId;
    this.creatorUsername = hostUsername;
    this.hostUserId = hostUserId || hostSocketId;
    this.emptyTimeout = null;

    /** @type {Map<string, Participant>} socketId → Participant */
    this.participants = new Map();

    /** Current video playback state (server is authoritative) */
    this.videoState = {
      playState: 'paused',   // 'playing' | 'paused'
      currentTime: 0,        // seconds
      videoId: '',           // YouTube video ID
      updatedAt: Date.now(),
    };

    // Add host as first participant
    const host = new Participant({
      socketId: hostSocketId,
      username: hostUsername,
      role: 'host',
      userId: this.creatorUserId,
    });
    this.participants.set(hostSocketId, host);
  }

  // ── Participant Management ──────────────────────────────────────

  /**
   * Add a new participant (or reconnecting host) to this room.
   * If the user is the original creator, restores their Host role and demotes any temporary host!
   * @param {string} socketId
   * @param {string} username
   * @param {string} [userId]
   * @returns {{ participant: Participant, demotedUser: Participant|null }}
   */
  addParticipant(socketId, username, userId) {
    const effectiveUserId = userId || socketId;

    // Clean up any stale participant socket entries with the same userId or matching username
    for (const [sId, existing] of this.participants.entries()) {
      if (existing.userId === effectiveUserId || (existing.username && existing.username.toLowerCase() === (username || '').toLowerCase() && sId !== socketId)) {
        this.participants.delete(sId);
      }
    }

    // Role identification:
    // Only the original room creator can reclaim host role automatically!
    const isOriginalHost = Boolean(
      (this.creatorUserId && effectiveUserId === this.creatorUserId) ||
      (this.creatorUsername && username && username.trim().toLowerCase() === this.creatorUsername.trim().toLowerCase())
    );

    let role = 'participant';
    let demotedUser = null;

    if (isOriginalHost) {
      role = 'host';
      this.hostUserId = effectiveUserId;

      // If someone else was temporarily acting as host, demote them back to their prior role
      for (const existing of this.participants.values()) {
        if (existing.role === 'host' && existing.userId !== effectiveUserId) {
          existing.role = existing.previousRole || 'moderator';
          demotedUser = existing;
        }
      }
    } else {
      // If room has no active host at all, first joiner acts as host
      const hasHost = Array.from(this.participants.values()).some((p) => p.role === 'host');
      if (!hasHost) {
        role = 'host';
        this.hostUserId = effectiveUserId;
      }
    }

    // Cancel empty room cleanup if scheduled
    this.cancelCleanup();

    const p = new Participant({ socketId, username, role, userId: effectiveUserId });
    this.participants.set(socketId, p);
    return { participant: p, demotedUser };
  }

  /**
   * Schedule automatic cleanup for empty rooms.
   */
  scheduleCleanup(callback, delayMs = 15 * 60 * 1000) {
    this.cancelCleanup();
    this.emptyTimeout = setTimeout(callback, delayMs);
  }

  /**
   * Cancel any scheduled cleanup timer.
   */
  cancelCleanup() {
    if (this.emptyTimeout) {
      clearTimeout(this.emptyTimeout);
      this.emptyTimeout = null;
    }
  }

  /**
   * Remove a participant by socket ID.
   * If host leaves:
   * 1. If any moderator exists, promote one of the moderators to become the host.
   * 2. If no moderator exists (only participants), promote one of the participants to become the host.
   * Original creator info remains intact so original host can reclaim host upon rejoining.
   * @param {string} socketId
   * @returns {{ wasHost: boolean, newHost: Participant|null }}
   */
  removeParticipant(socketId) {
    const leaving = this.participants.get(socketId);
    this.participants.delete(socketId);

    const wasHost = leaving?.isHost() ?? false;
    let newHost = null;

    if (wasHost && this.participants.size > 0) {
      // 1. Look for a moderator first
      let candidate = Array.from(this.participants.values()).find((p) => p.role === 'moderator');

      // 2. If no moderator exists, promote any remaining participant
      if (!candidate) {
        candidate = Array.from(this.participants.values())[0];
      }

      if (candidate) {
        candidate.previousRole = candidate.role;
        candidate.role = 'host';
        this.hostUserId = candidate.userId;
        newHost = candidate;
      }
    }

    return { wasHost, newHost };
  }

  /**
   * Get a participant by socket ID or persistent userId.
   * @param {string} id
   * @returns {Participant|undefined}
   */
  getParticipant(id) {
    if (!id) return undefined;
    if (this.participants.has(id)) return this.participants.get(id);
    for (const p of this.participants.values()) {
      if (p.userId === id || p.socketId === id) return p;
    }
    return undefined;
  }

  /**
   * Assign a new role to a participant.
   * Only host may do this — validation done in MessageHandler.
   * @param {string} targetId - socketId or userId
   * @param {'moderator'|'participant'} role
   */
  assignRole(targetId, role) {
    const target = this.getParticipant(targetId);
    if (!target) throw new Error('Participant not found');
    if (target.isHost()) throw new Error('Cannot change host role');
    target.role = role;
    return target;
  }

  /**
   * Transfer the host role from current host to another participant.
   * @param {string} currentHostId
   * @param {string} targetId
   */
  transferHost(currentHostId, targetId) {
    const current = this.getParticipant(currentHostId);
    const target = this.getParticipant(targetId);
    if (!current || !target) throw new Error('Participant not found');
    current.role = 'participant';
    target.role = 'host';
    this.hostUserId = target.userId;
    return { oldHost: current, newHost: target };
  }

  // ── Video State ─────────────────────────────────────────────────

  /**
   * Returns current video state with elapsed time calculated if currently playing.
   */
  getCurrentVideoState() {
    let currentTime = this.videoState.currentTime || 0;
    if (this.videoState.playState === 'playing' && this.videoState.updatedAt) {
      const elapsed = (Date.now() - this.videoState.updatedAt) / 1000;
      currentTime = Math.max(0, currentTime + elapsed);
    }
    return {
      ...this.videoState,
      currentTime,
    };
  }

  /**
   * Update the server-authoritative video state.
   * @param {Partial<Room['videoState']>} patch
   */
  updateVideoState(patch) {
    let currentCalc = this.videoState.currentTime || 0;
    if (this.videoState.playState === 'playing' && this.videoState.updatedAt) {
      currentCalc += (Date.now() - this.videoState.updatedAt) / 1000;
    }
    const currentTime = patch.currentTime !== undefined ? patch.currentTime : currentCalc;
    this.videoState = {
      ...this.videoState,
      ...patch,
      currentTime,
      updatedAt: Date.now(),
    };
  }

  // ── Broadcasting ────────────────────────────────────────────────

  /**
   * Broadcast an event to ALL participants in this room.
   * @param {string} event
   * @param {object} data
   * @param {string} [excludeSocketId]  - Optionally skip sender
   */
  broadcast(event, data, excludeSocketId = null) {
    this.io.to(this.roomId).emit(event, data);
  }

  /**
   * Broadcast to all EXCEPT one socket.
   */
  broadcastExcept(event, data, excludeSocketId) {
    this.participants.forEach((p) => {
      if (p.socketId !== excludeSocketId) {
        this.io.to(p.socketId).emit(event, data);
      }
    });
  }

  // ── Serialization ───────────────────────────────────────────────

  /**
   * Public state for API responses and sync_state events.
   */
  getPublicState() {
    return {
      roomId: this.roomId,
      name: this.name,
      genre: this.genre,
      visibility: this.visibility,
      videoState: this.getCurrentVideoState(),
      participants: this.getParticipantsList(),
      viewerCount: this.participants.size,
      createdAt: this.createdAt,
      hostUsername: this.creatorUsername,
      creatorUsername: this.creatorUsername,
      creatorUserId: this.creatorUserId,
      hostUserId: this.hostUserId,
    };
  }

  getParticipantsList() {
    return Array.from(this.participants.values()).map((p) => p.toPublic());
  }

  isEmpty() {
    return this.participants.size === 0;
  }

  /** MongoDB-ready representation for persistence */
  toDBObject() {
    return {
      roomId: this.roomId,
      name: this.name,
      genre: this.genre,
      visibility: this.visibility,
      currentVideoId: this.videoState.videoId,
      viewerCount: this.participants.size,
      isActive: !this.isEmpty(),
      createdAt: this.createdAt,
    };
  }
}

module.exports = Room;
