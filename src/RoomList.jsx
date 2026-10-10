// ─── RoomList.jsx ────────────────────────────────────────────────
// Shows live rooms for a given genre, fetched from backend

import { useState, useEffect } from 'react';
import { playClick, playHover } from './sounds';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:10000').replace(/\/+$/, '');

const GENRE_META = {
  anime:     { emoji: '🎌', color: '#ff6b9d' },
  movies:    { emoji: '🎬', color: '#ffd166' },
  education: { emoji: '📚', color: '#06d6a0' },
  music:     { emoji: '🎵', color: '#a78bfa' },
  gaming:    { emoji: '🎮', color: '#f97316' },
  tvshows:   { emoji: '📺', color: '#38bdf8' },
  other:     { emoji: '🌐', color: '#94a3b8' },
};

export default function RoomList({ genre, username, onJoinRoom, onBack }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const meta = GENRE_META[genre] || GENRE_META.other;

  const fetchRooms = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/rooms/live`);
      const data = await res.json();
      if (data.success) {
        const genreData = data.byGenre?.[genre] || { rooms: [] };
        setRooms(genreData.rooms || []);
      } else {
        setError('Failed to load rooms');
      }
    } catch (e) {
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    // Refresh every 10 seconds for live viewer counts
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [genre]);

  return (
    <div className="rl-root">
      <div className="rl-header">
        <button className="rl-back-btn" onClick={() => { playClick(); onBack(); }}>◀ Back</button>
        <div className="rl-title">
          <span className="rl-genre-emoji">{meta.emoji}</span>
          <span className="rl-genre-label" style={{ color: meta.color }}>
            {genre.charAt(0).toUpperCase() + genre.slice(1)} Rooms
          </span>
        </div>
        <button className="rl-refresh-btn" onClick={() => { playClick(); fetchRooms(); }}>⟳ Refresh</button>
      </div>

      <div className="rl-body">
        {loading && (
          <div className="rl-loading">
            <div className="rl-spinner" />
            <span>Scanning for rooms...</span>
          </div>
        )}

        {!loading && error && (
          <div className="rl-error">
            <span>⚠ {error}</span>
            <button onClick={fetchRooms}>Retry</button>
          </div>
        )}

        {!loading && !error && rooms.length === 0 && (
          <div className="rl-empty">
            <div className="rl-empty-icon">{meta.emoji}</div>
            <p>No active {genre} rooms right now.</p>
            <p className="rl-empty-sub">Be the first to start one!</p>
          </div>
        )}

        {!loading && rooms.length > 0 && (
          <div className="rl-grid">
            {rooms.map((room) => (
              <RoomCard
                key={room.roomId}
                room={room}
                meta={meta}
                onJoin={() => { playClick(); onJoinRoom(room.roomId); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Room Card ────────────────────────────────────────────────────
function RoomCard({ room, meta, onJoin }) {
  const viewers = room.viewerCount || room.participants?.length || 0;
  const videoId = room.videoState?.videoId || room.currentVideoId || '';
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null;

  return (
    <div
      className="rc-card"
      onClick={onJoin}
      onMouseEnter={playHover}
      style={{ '--accent': meta.color }}
    >
      {/* Thumbnail */}
      <div className="rc-thumb">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="Video thumbnail" className="rc-thumb-img" />
        ) : (
          <div className="rc-thumb-placeholder">
            <span>{meta.emoji}</span>
          </div>
        )}
        <div className="rc-live-badge">● LIVE</div>
        <div className="rc-viewers">👁 {viewers} watching</div>
      </div>

      {/* Info */}
      <div className="rc-info">
        <div className="rc-name">{room.name}</div>
        <div className="rc-code">CODE: {room.roomId}</div>
        <button className="rc-join-btn" style={{ background: meta.color }}>
          Join Room →
        </button>
      </div>
    </div>
  );
}
