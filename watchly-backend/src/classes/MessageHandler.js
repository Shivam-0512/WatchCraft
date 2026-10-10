// ─── MessageHandler.js ──────────────────────────────────────────
// OOP: Handles all WebSocket events for a single socket connection.
// Encapsulates role validation, event routing, and broadcast logic.

const RoomModel = require('../models/Room.model');

class MessageHandler {
  /**
   * @param {import('socket.io').Server} io        - Socket.IO server
   * @param {import('./RoomRegistry')} registry     - In-memory room registry
   */
  constructor(io, registry) {
    this.io = io;
    this.registry = registry;
  }

  /**
   * Attach all event listeners to a newly connected socket.
   * Called once per connection from index.js.
   * @param {import('socket.io').Socket} socket
   */
  handle(socket) {
    console.log(`[WS] Connected: ${socket.id}`);

    socket.on('create_room',         (data, callback) => this._onCreateRoom(socket, data, callback));
    socket.on('join_room',           (data, callback) => this._onJoinRoom(socket, data, callback));
    socket.on('leave_room',          (data) => this._onLeaveRoom(socket, data));
    socket.on('play',                (data) => this._onPlay(socket, data));
    socket.on('pause',               (data) => this._onPause(socket, data));
    socket.on('seek',                (data) => this._onSeek(socket, data));
    socket.on('change_video',        (data) => this._onChangeVideo(socket, data));
    socket.on('assign_role',         (data) => this._onAssignRole(socket, data));
    socket.on('remove_participant',  (data) => this._onRemoveParticipant(socket, data));
    socket.on('transfer_host',       (data) => this._onTransferHost(socket, data));
    socket.on('request_control',     ()     => this._onRequestControl(socket));
    socket.on('chat_message',        (data) => this._onChatMessage(socket, data));
    socket.on('reaction',            (data) => this._onReaction(socket, data));
    socket.on('disconnect',          ()     => this._onDisconnect(socket));
  }

  // ── Event Handlers ──────────────────────────────────────────────

  /**
   * create_room: Host creates room via WebSocket.
   * Payload: { name, genre, username, visibility, userId }
   */
  async _onCreateRoom(socket, data, callback) {
    try {
      const { name, genre, username, visibility, userId } = data || {};
      if (!name || !genre || !username) {
        return callback?.({ success: false, error: 'name, genre, username required' });
      }

      const validGenres = ['anime', 'education', 'movies', 'music', 'gaming', 'tvshows', 'other', 'sports'];
      if (!validGenres.includes(genre.toLowerCase())) {
        return callback?.({ success: false, error: 'Invalid genre' });
      }

      const room = this.registry.create({
        name: name.trim().slice(0, 80),
        genre: genre.toLowerCase(),
        hostSocketId: socket.id,
        hostUsername: username,
        hostUserId: userId || socket.id,
        visibility: visibility === 'private' ? 'private' : 'public',
        io: this.io,
      });

      socket.join(room.roomId);

      const { isDBConnected } = require('../db/mongodb');
      if (isDBConnected()) {
        try {
          RoomModel.create({
            roomId: room.roomId,
            name: room.name,
            genre: room.genre,
            visibility: room.visibility,
            currentVideoId: '',
            viewerCount: 1,
            isActive: true,
          }).catch((dbErr) => console.warn('[DB] Could not persist room:', dbErr.message));
        } catch (dbErr) {
          console.warn('[DB] Could not persist room:', dbErr.message);
        }
      }

      console.log(`[ROOM ${room.roomId}] Created by ${username} (id: ${room.creatorUserId}) | Genre: ${genre} | Visibility: ${room.visibility}`);

      callback?.({
        success: true,
        roomId: room.roomId,
        name: room.name,
        genre: room.genre,
        visibility: room.visibility,
        role: 'host',
        userId: room.creatorUserId,
        participants: room.getParticipantsList(),
        videoState: room.videoState,
      });
    } catch (err) {
      callback?.({ success: false, error: err.message });
    }
  }

  /**
   * join_room: Client joins an existing room (or creates handled via REST).
   * Payload: { roomId, username, userId }
   */
  async _onJoinRoom(socket, data, callback) {
    try {
      const { roomId, username, userId } = data || {};
      if (!roomId || !username) {
        if (typeof callback === 'function') callback({ success: false, error: 'roomId and username are required' });
        return this._error(socket, 'roomId and username are required');
      }

      let room = this.registry.get(roomId);

      // If room is not currently in memory, try DB recovery
      if (!room) {
        const { isDBConnected } = require('../db/mongodb');
        if (isDBConnected()) {
          try {
            const dbRoom = await RoomModel.findOne({ roomId: String(roomId).toUpperCase() }).lean();
            if (dbRoom) {
              room = this.registry.create({
                roomId: dbRoom.roomId,
                name: dbRoom.name,
                genre: dbRoom.genre,
                hostSocketId: socket.id,
                hostUsername: username,
                hostUserId: userId || socket.id,
                visibility: dbRoom.visibility,
                io: this.io,
              });
              if (dbRoom.currentVideoId) {
                room.updateVideoState({ videoId: dbRoom.currentVideoId });
              }
            }
          } catch (_) {}
        }
      }

      if (!room) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
        return this._error(socket, 'Room not found');
      }

      // Add participant (restores Host role if user is the original creator)
      const { participant, demotedUser } = room.addParticipant(socket.id, username, userId);
      this.registry.registerSocket(socket.id, room.roomId);

      // Join the Socket.IO room namespace
      socket.join(room.roomId);

      const participants = room.getParticipantsList();

      const currentVideoState = room.getCurrentVideoState();

      const joinPayload = {
        success: true,
        roomId: room.roomId,
        name: room.name,
        genre: room.genre,
        visibility: room.visibility,
        role: participant.role,
        videoState: currentVideoState,
        participants,
      };

      if (typeof callback === 'function') {
        callback(joinPayload);
      }

      // Send confirmation to the joiner
      socket.emit('joined_room', joinPayload);

      // Send current video state to the joiner
      socket.emit('sync_state', {
        playState: currentVideoState.playState,
        currentTime: currentVideoState.currentTime,
        videoId: currentVideoState.videoId,
        role: participant.role,
      });

      // Broadcast to all others that someone joined
      room.broadcast('user_joined', {
        username: participant.username,
        userId: participant.userId,
        socketId: participant.socketId,
        role: participant.role,
        participants,
      });

      // If participant joined/reclaimed as host, announce role
      if (participant.role === 'host') {
        room.broadcast('role_assigned', {
          userId: participant.userId,
          socketId: participant.socketId,
          username: participant.username,
          role: 'host',
          participants,
        });
      }

      // If temporary host was demoted back when original host returned, announce role
      if (demotedUser) {
        room.broadcast('role_assigned', {
          userId: demotedUser.userId,
          socketId: demotedUser.socketId,
          username: demotedUser.username,
          role: demotedUser.role,
          participants,
        });
      }

      console.log(`[ROOM ${room.roomId}] ${username} (id: ${participant.userId}) joined as ${participant.role}`);

      // Update DB viewer count async
      this._updateDBViewerCount(room.roomId, room.participants.size);
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
      this._error(socket, err.message);
    }
  }

  /**
   * leave_room: Client voluntarily leaves.
   * Payload: { roomId }
   */
  _onLeaveRoom(socket, data) {
    this._handleLeave(socket);
  }

  /**
   * play: Host/Moderator pressed play.
   * Payload: { time?: number }
   */
  _onPlay(socket, data) {
    const room = this._requireRoom(socket);
    if (!room) return;
    if (!this._requireControl(socket, room)) return;

    // Update server state with the accurate current time if provided
    const update = { playState: 'playing' };
    const t = parseFloat(data?.time);
    if (!isNaN(t) && t >= 0) update.currentTime = t;
    room.updateVideoState(update);

    const vs = room.getCurrentVideoState();
    room.broadcast('sync_state', {
      playState: vs.playState,
      currentTime: vs.currentTime,
      videoId: vs.videoId,
    });

    console.log(`[ROOM ${room.roomId}] PLAY at ${vs.currentTime}s`);
  }

  /**
   * pause: Host/Moderator pressed pause.
   * Payload: { time?: number }
   */
  _onPause(socket, data) {
    const room = this._requireRoom(socket);
    if (!room) return;
    if (!this._requireControl(socket, room)) return;

    const update = { playState: 'paused' };
    const t = parseFloat(data?.time);
    if (!isNaN(t) && t >= 0) update.currentTime = t;
    room.updateVideoState(update);

    const vs = room.getCurrentVideoState();
    room.broadcast('sync_state', {
      playState: vs.playState,
      currentTime: vs.currentTime,
      videoId: vs.videoId,
    });

    console.log(`[ROOM ${room.roomId}] PAUSE at ${vs.currentTime}s`);
  }

  /**
   * seek: Host/Moderator seeked to a new position.
   * Payload: { time: number }
   */
  _onSeek(socket, data) {
    const room = this._requireRoom(socket);
    if (!room) return;
    if (!this._requireControl(socket, room)) return;

    const time = parseFloat(data?.time);
    if (isNaN(time) || time < 0) return this._error(socket, 'Invalid seek time');

    room.updateVideoState({ currentTime: time });

    const vs = room.getCurrentVideoState();
    room.broadcast('sync_state', {
      playState: vs.playState,
      currentTime: vs.currentTime,
      videoId: vs.videoId,
    });

    console.log(`[ROOM ${room.roomId}] SEEK to ${time}s`);
  }

  /**
   * change_video: Host/Moderator changes the current video.
   * Payload: { videoId: string }  (YouTube video ID or full URL)
   */
  _onChangeVideo(socket, data) {
    const room = this._requireRoom(socket);
    if (!room) return;
    if (!this._requireControl(socket, room)) return;

    let videoId = data?.videoId || '';
    // Support pasting full YouTube URLs
    videoId = this._extractYouTubeId(videoId);
    if (!videoId) return this._error(socket, 'Invalid YouTube URL or video ID');

    room.updateVideoState({ videoId, currentTime: 0, playState: 'paused' });

    room.broadcast('sync_state', {
      playState: 'paused',
      currentTime: 0,
      videoId,
    });

    // Persist to DB async
    this._updateDBVideo(room.roomId, videoId);

    console.log(`[ROOM ${room.roomId}] CHANGE_VIDEO to ${videoId}`);
  }

  /**
   * assign_role: Host assigns a role to a participant.
   * Payload: { userId: socketId, role: 'moderator'|'participant' }
   */
  _onAssignRole(socket, data) {
    const room = this._requireRoom(socket);
    if (!room) return;
    if (!this._requireHost(socket, room)) return;

    const { userId, role } = data || {};
    if (!userId || !role) return this._error(socket, 'userId and role are required');
    if (!['moderator', 'participant'].includes(role)) return this._error(socket, 'Invalid role');

    try {
      const target = room.assignRole(userId, role);
      const participants = room.getParticipantsList();

      room.broadcast('role_assigned', {
        userId: target.userId,
        socketId: target.socketId,
        username: target.username,
        role: target.role,
        participants,
      });

      console.log(`[ROOM ${room.roomId}] ${target.username} → ${role}`);
    } catch (err) {
      this._error(socket, err.message);
    }
  }

  /**
   * remove_participant: Host removes a user from the room.
   * Payload: { userId: socketId }
   */
  _onRemoveParticipant(socket, data) {
    const room = this._requireRoom(socket);
    if (!room) return;
    if (!this._requireHost(socket, room)) return;

    const { userId } = data || {};
    if (!userId) return this._error(socket, 'userId is required');

    const target = room.getParticipant(userId);
    if (!target) return this._error(socket, 'Participant not found');
    if (target.isHost()) return this._error(socket, 'Cannot remove host');

    room.removeParticipant(userId);
    const participants = room.getParticipantsList();

    // Tell the kicked user
    this.io.to(target.socketId).emit('kicked', { message: 'You were removed from the room by the host.' });

    // Tell everyone else
    room.broadcast('participant_removed', { userId: target.userId, socketId: target.socketId, participants });

    // Force socket to leave the Socket.IO room
    const targetSocket = this.io.sockets.sockets.get(target.socketId);
    if (targetSocket) targetSocket.leave(room.roomId);

    // Clean up registry
    this.registry._socketToRoom.delete(target.socketId);

    console.log(`[ROOM ${room.roomId}] ${target.username} removed by host`);
  }

  /**
   * transfer_host: Host passes the Host role to another participant.
   * Payload: { userId: socketId }
   */
  _onTransferHost(socket, data) {
    const room = this._requireRoom(socket);
    if (!room) return;
    if (!this._requireHost(socket, room)) return;

    const { userId } = data || {};
    if (!userId) return this._error(socket, 'userId is required');

    try {
      const { oldHost, newHost } = room.transferHost(socket.id, userId);
      const participants = room.getParticipantsList();

      room.broadcast('role_assigned', {
        userId: newHost.userId,
        socketId: newHost.socketId,
        username: newHost.username,
        role: 'host',
        participants,
      });

      console.log(`[ROOM ${room.roomId}] Host transferred from ${oldHost.username} to ${newHost.username}`);
    } catch (err) {
      this._error(socket, err.message);
    }
  }

  /**
   * request_control: Participant requests playback control from host.
   * Host receives a notification; host can then assign_role.
   */
  _onRequestControl(socket) {
    const room = this._requireRoom(socket);
    if (!room) return;

    const requester = room.getParticipant(socket.id);
    if (!requester) return;
    if (requester.canControl()) return; // Already has control

    // Find host and notify them
    const host = Array.from(room.participants.values()).find((p) => p.isHost());
    if (host) {
      this.io.to(host.socketId).emit('control_requested', {
        userId: requester.socketId,
        username: requester.username,
      });
    }
  }

  /**
   * chat_message: Any participant sends a chat message.
   * Payload: { text: string }
   */
  _onChatMessage(socket, data) {
    const room = this._requireRoom(socket);
    if (!room) return;

    const sender = room.getParticipant(socket.id);
    if (!sender) return;

    const text = (data?.text || '').trim().slice(0, 500); // max 500 chars
    if (!text) return;

    room.broadcast('chat_message', {
      userId: sender.socketId,
      username: sender.username,
      role: sender.role,
      text,
      timestamp: Date.now(),
    });
  }

  /**
   * reaction: Emoji reaction broadcast.
   * Payload: { emoji: string }
   */
  _onReaction(socket, data) {
    const room = this._requireRoom(socket);
    if (!room) return;

    const sender = room.getParticipant(socket.id);
    if (!sender) return;

    const VALID_EMOJIS = ['❤️', '😂', '😮', '👏', '🔥', '💯', '😭', '🎉'];
    const emoji = data?.emoji;
    if (!VALID_EMOJIS.includes(emoji)) return;

    room.broadcast('reaction', {
      userId: sender.socketId,
      username: sender.username,
      emoji,
    });
  }

  /**
   * leave_room: Participant explicitly leaves room.
   */
  _onLeaveRoom(socket) {
    this._handleLeave(socket);
  }

  /**
   * disconnect: Socket lost connection.
   */
  _onDisconnect(socket) {
    console.log(`[WS] Disconnected: ${socket.id}`);
    this._handleLeave(socket);
  }

  // ── Shared Leave Logic ──────────────────────────────────────────

  async _handleLeave(socket) {
    const room = this.registry.findBySocket(socket.id);
    if (!room) return;

    const leaving = room.getParticipant(socket.id);
    const { result } = this.registry.unregisterSocket(socket.id);
    socket.leave(room.roomId);

    if (!room.isEmpty()) {
      const participants = room.getParticipantsList();
      room.broadcast('user_left', {
        username: leaving?.username,
        userId: leaving?.userId || socket.id,
        socketId: socket.id,
        participants,
      });

      // If host left and was auto-transferred, announce new host (moderator prioritized, else participant)
      if (result?.newHost) {
        room.broadcast('role_assigned', {
          userId: result.newHost.userId,
          socketId: result.newHost.socketId,
          username: result.newHost.username,
          role: 'host',
          participants,
        });
      }

      this._updateDBViewerCount(room.roomId, room.participants.size);
    } else {
      // Room is now completely empty (e.g. host was the only one in the room and left):
      // Delete the room from MongoDB and registry immediately!
      room.cancelCleanup();
      this.registry.delete(room.roomId);
      await this._deleteRoomFromDB(room.roomId);
      console.log(`[ROOM ${room.roomId}] Host was the only user and left. Room deleted from database.`);
    }

    console.log(`[ROOM ${room.roomId}] ${leaving?.username || socket.id} left`);
  }

  // ── Role Guards ─────────────────────────────────────────────────

  _requireRoom(socket) {
    const room = this.registry.findBySocket(socket.id);
    if (!room) {
      this._error(socket, 'You are not in a room');
      return null;
    }
    return room;
  }

  _requireControl(socket, room) {
    const p = room.getParticipant(socket.id);
    if (!p || !p.canControl()) {
      this._error(socket, 'Permission denied: only Host or Moderator can control playback');
      return false;
    }
    return true;
  }

  _requireHost(socket, room) {
    const p = room.getParticipant(socket.id);
    if (!p || !p.isHost()) {
      this._error(socket, 'Permission denied: only Host can perform this action');
      return false;
    }
    return true;
  }

  // ── Utilities ───────────────────────────────────────────────────

  _error(socket, message) {
    socket.emit('error', { message });
  }

  /**
   * Extract YouTube video ID from URL or return raw ID.
   * Supports: youtu.be/ID, youtube.com/watch?v=ID, full ID strings
   */
  _extractYouTubeId(input) {
    if (!input) return '';
    // Full URL patterns
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/watch\?.+&v=)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/, // raw 11-char ID
    ];
    for (const p of patterns) {
      const m = input.match(p);
      if (m) return m[1];
    }
    return '';
  }

  // ── Async DB helpers ────────────────────────────────────────────

  async _updateDBViewerCount(roomId, count) {
    const { isDBConnected } = require('../db/mongodb');
    if (!isDBConnected()) return;
    try {
      await RoomModel.findOneAndUpdate({ roomId }, { viewerCount: count, isActive: count > 0 });
    } catch (_) {}
  }

  async _updateDBVideo(roomId, videoId) {
    const { isDBConnected } = require('../db/mongodb');
    if (!isDBConnected()) return;
    try {
      await RoomModel.findOneAndUpdate({ roomId }, { currentVideoId: videoId });
    } catch (_) {}
  }

  async _markRoomInactive(roomId) {
    const { isDBConnected } = require('../db/mongodb');
    if (!isDBConnected()) return;
    try {
      await RoomModel.findOneAndUpdate({ roomId }, { isActive: false, viewerCount: 0 });
    } catch (_) {}
  }

  async _deleteRoomFromDB(roomId) {
    const { isDBConnected } = require('../db/mongodb');
    if (!isDBConnected()) return;
    try {
      await RoomModel.deleteOne({ roomId: String(roomId).toUpperCase() });
      console.log(`[DB] Room ${roomId} deleted from database.`);
    } catch (err) {
      console.error(`[DB] Failed to delete room ${roomId} from database:`, err.message);
    }
  }
}

module.exports = MessageHandler;
