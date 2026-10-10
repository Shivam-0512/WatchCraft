// ─── Participant.js ─────────────────────────────────────────────
// OOP: Represents a single user in a watch party room

class Participant {
  /**
   * @param {object} opts
   * @param {string} opts.socketId   - Socket.IO socket id
   * @param {string} opts.username   - Display name chosen by user
   * @param {string} opts.role       - 'host' | 'moderator' | 'participant'
   */
  constructor({ socketId, username, role = 'participant', userId }) {
    this.socketId = socketId;
    this.username = username;
    this.role = role;
    this.userId = userId || socketId;
    this.joinedAt = new Date();
  }

  /** Returns true if this participant can control playback */
  canControl() {
    return this.role === 'host' || this.role === 'moderator';
  }

  /** Returns true if this participant is the room host */
  isHost() {
    return this.role === 'host';
  }

  /** Returns a safe public object (no internal socket details beyond id) */
  toPublic() {
    return {
      userId: this.userId,
      socketId: this.socketId,
      username: this.username,
      role: this.role,
      joinedAt: this.joinedAt,
    };
  }

  /** Serialize for storage / broadcast */
  toJSON() {
    return this.toPublic();
  }
}

module.exports = Participant;
