// ─── Room.model.js ──────────────────────────────────────────────
// Mongoose schema for persistent room storage

const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    genre: {
      type: String,
      required: true,
      lowercase: true,
      enum: ['anime', 'education', 'movies', 'music', 'gaming', 'tvshows', 'other', 'sports'],
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
      index: true,
    },
    currentVideoId: {
      type: String,
      default: '',
    },
    viewerCount: {
      type: Number,
      default: 1,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    creatorUserId: {
      type: String,
      default: '',
    },
    hostUserId: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Auto-expire inactive rooms after 24 hours (TTL index)
RoomSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400, partialFilterExpression: { isActive: false } });

module.exports = mongoose.model('Room', RoomSchema);
