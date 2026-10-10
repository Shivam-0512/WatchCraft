// ─── WatchlyDesktop.jsx ──────────────────────────────────────────
// Windows XP-style desktop  →  Watchly app with EXACT reference UI
// Minecraft pixel-art style: thick bordered buttons, pixel icons

import { useState, useEffect, useRef, useCallback } from 'react';
import { playClick, playHover } from './sounds';
import { getSocket, getPersistentUserId, setStoredUsername } from './socket';

const BACKEND = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:10000').replace(/\/+$/, '');

// Genre config — real pixel-art images from /images/
const GENRES = [
  { id: 'movies', label: 'MOVIES', img: '/images/app_watchly_movies.png', accent: '#dc2626' },
  { id: 'anime', label: 'ANIME', img: '/images/app_watchly_anime.png', accent: '#9333ea' },
  { id: 'education', label: 'EDUCATION', img: '/images/app_watchly_education.png', accent: '#16a34a' },
  { id: 'music', label: 'MUSIC', img: '/images/app_watchly_music.png', accent: '#e11d91' },
  { id: 'gaming', label: 'GAMING', img: '/images/app_watchly_games.png', accent: '#ea580c' },
  { id: 'sports', label: 'SPORTS', img: '/images/app_watchly_sports.png', accent: '#15803d' },
  { id: 'more', label: 'MANY MORE', img: '/images/plus_icon.png', accent: '#38bdf8' },
];

const GENRE_BADGE_COLORS = {
  anime: '#9333ea', movies: '#dc2626', education: '#16a34a',
  music: '#e11d91', gaming: '#ea580c', sports: '#15803d',
  tvshows: '#2563eb', other: '#6b7280',
};

// ── Clock ────────────────────────────────────────────────────────
function Clock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDate(d.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' }));
    };
    tick(); const t = setInterval(tick, 10000); return () => clearInterval(t);
  }, []);
  return <div className="wos-clock"><span className="wos-clock-time">{time}</span><span className="wos-clock-date">{date}</span></div>;
}

// ── Live rooms hook ───────────────────────────────────────────────
function useLiveRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(() => {
    setLoading(true);
    fetch(`${BACKEND}/api/rooms/live`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const all = [];
          Object.values(data.byGenre || {}).forEach(g => (g.rooms || []).forEach(r => all.push(r)));
          setRooms(all.sort((a, b) => (b.viewerCount || 0) - (a.viewerCount || 0)));
        } else { setRooms([]); }
      })
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch_(); const t = setInterval(fetch_, 8000); return () => clearInterval(t); }, [fetch_]);
  return { rooms, loading, refresh: fetch_ };
}

// ── Watchly App Inner Content (matches reference exactly) ─────────
function WatchlyAppContent({ username, onOpenRoom }) {
  const { rooms, loading, refresh } = useLiveRooms();
  const [activeGenre, setActiveGenre] = useState(null);
  const filteredRooms = activeGenre
    ? rooms.filter(r => {
        if (activeGenre === 'more') {
          return r.genre === 'tvshows' || r.genre === 'other' || !['movies', 'anime', 'education', 'music', 'gaming', 'sports'].includes(r.genre);
        }
        return r.genre === activeGenre;
      })
    : rooms;

  return (
    <div className="wa-root">
      {/* Minecraft night BG */}
      <img src="/images/watchly_computer_backgorund.png" className="wa-bg" alt="" draggable={false} />
      <div className="wa-bg-overlay" />

      <div className="wa-layout">
        {/* ═══ LEFT PANEL ═══ */}
        <div className="wa-left">

          {/* Header: monitor icon + big WATCHLY text */}
          <div className="wa-header">
            <img src="/images/wachtly_new_winow_logo.png" alt="" className="wa-hdr-icon" />
            <img src="/images/app_watchly.png" alt="WATCHLY" className="wa-hdr-text" />
          </div>
          <p className="wa-tagline">WATCH TOGETHER. ANYTIME. ANYWHERE.</p>

          {/* CREATE ROOM + JOIN ROOM buttons — thick Minecraft borders */}
          <div className="wa-main-btns">
            <button className="wa-mc-btn wa-btn-create" onClick={() => { playClick(); onOpenRoom({ type: 'create_modal' }); }} onMouseEnter={playHover}>
              <img src="/images/app_watchly_createroom.png" alt="" className="wa-mc-btn-img" />
              <div className="wa-mc-btn-text">
                <span className="wa-mc-btn-title">CREATE ROOM</span>
                <span className="wa-mc-btn-sub">Start a watch party</span>
              </div>
            </button>

            <button className="wa-mc-btn wa-btn-join" onClick={() => { playClick(); onOpenRoom({ type: 'join_modal' }); }} onMouseEnter={playHover}>
              <img src="/images/app_watchly_joinroom.png" alt="" className="wa-mc-btn-img" />
              <div className="wa-mc-btn-text">
                <span className="wa-mc-btn-title">JOIN ROOM</span>
                <span className="wa-mc-btn-sub">Enter with room code</span>
              </div>
            </button>
          </div>

          {/* GENRES section — pixel art icons from real images */}
          <div className="wa-genres-wrap">
            <div className="wa-genres-hdr">
              <div className="wa-genres-label">🎮 GENRES</div>
              {activeGenre && (
                <button
                  className="wa-genres-clear"
                  onClick={() => { playClick(); setActiveGenre(null); }}
                  title="Clear genre filter and view all rooms"
                >
                  ✕ CLEAR FILTER
                </button>
              )}
            </div>
            <div className="wa-genres-row">
              {GENRES.map(g => (
                <button
                  key={g.id}
                  className={`wa-genre-tile ${activeGenre === g.id ? 'wa-genre-tile--active' : ''}`}
                  data-genre={g.id}
                  style={{ '--genre-accent': g.accent }}
                  onClick={() => { playClick(); setActiveGenre(prev => prev === g.id ? null : g.id); }}
                  onMouseEnter={playHover}
                >
                  <img src={g.img} alt={g.label} className="wa-genre-tile-img" />
                  <span className="wa-genre-tile-label">{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PANEL: LIVE NOW ═══ */}
        <div className="wa-right">
          <div className="wa-live-header">
            <span className="wa-live-dot" />
            <span className="wa-live-title">
              {activeGenre ? `LIVE • ${activeGenre.toUpperCase()}` : 'LIVE NOW'}
            </span>
            {activeGenre && (
              <button
                className="wa-filter-pill"
                onClick={() => { playClick(); setActiveGenre(null); }}
                title="Clear genre filter"
              >
                ✕ ALL
              </button>
            )}
            <button className="wa-refresh-btn" onClick={() => { playClick(); refresh(); }} title="Refresh live rooms">🔄</button>
          </div>

          <div className="wa-live-list">
            {loading ? (
              <div className="wa-live-empty">
                <div className="wa-live-spinner" />
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Tahoma,sans-serif' }}>Finding rooms...</span>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="wa-live-empty">
                <span style={{ fontSize: 28 }}>📺</span>
                <span className="wa-live-empty-text">
                  {activeGenre ? `No ${activeGenre} rooms live` : 'No rooms live'}
                </span>
                {activeGenre ? (
                  <button className="wa-live-empty-btn" onClick={() => { playClick(); setActiveGenre(null); }}>
                    View All Live Rooms
                  </button>
                ) : (
                  <span className="wa-live-empty-sub">Be the first to create one!</span>
                )}
              </div>
            ) : (
              filteredRooms.slice(0, 8).map(room => (
                <button key={room.roomId} className="wa-room-card" onClick={() => { playClick(); onOpenRoom({ type: 'join', roomId: room.roomId }); }}>
                  <div className="wa-room-thumb">
                    {room.currentVideoId
                      ? <img src={`https://img.youtube.com/vi/${room.currentVideoId}/mqdefault.jpg`} alt="" className="wa-room-thumb-img" />
                      : <span className="wa-room-thumb-ph">▶</span>}
                  </div>
                  <div className="wa-room-info">
                    <div className="wa-room-name">{room.name || 'Unnamed Room'}</div>
                    <div className="wa-room-meta">
                      <span className="wa-room-viewers">👥 {room.viewerCount || 0}</span>
                      <span className="wa-room-genre-badge" style={{ background: GENRE_BADGE_COLORS[room.genre] || '#6b7280' }}>
                        {(room.genre || 'other').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="wa-online-bar">
            <span className="wa-online-dot" />
            <div>
              <div className="wa-online-label">ONLINE</div>
              <div className="wa-online-count">{rooms.length} ACTIVE ROOM{rooms.length !== 1 ? 'S' : ''}</div>
            </div>
            <button className="wa-group-btn" onClick={() => { playClick(); onOpenRoom({ type: 'join_modal' }); }}>👥</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Room Modal (matches reference UI, uses real socket) ───
function CreateRoomModal({ username, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [genre, setGenre] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // All Watchly genres available in room creation modal
  const ROOM_GENRES = GENRES;

  const handleCreate = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return setError('Please enter a room name');
    if (!genre) return setError('Please select a genre');
    playClick();
    setLoading(true);
    setError('');

    // Use existing socket singleton
    const socket = getSocket();

    // Map 'more' genre to 'other' for backend; sports/gaming/etc pass through
    const validGenres = ['anime', 'education', 'movies', 'music', 'gaming', 'tvshows', 'other', 'sports'];
    const backendGenre = genre === 'more' ? 'other' : (validGenres.includes(genre) ? genre : 'other');

    const userId = getPersistentUserId();

    socket.emit('create_room', { name: trimmedName, genre: backendGenre, username, userId, visibility }, (res) => {
      setLoading(false);
      if (!res?.success) {
        setError(res?.error || 'Failed to create room. Please try again.');
        return;
      }
      // Success — navigate to watch party as HOST
      onCreated({
        roomId: res.roomId,
        name: res.name,
        genre: res.genre,
        username,
        role: res.role || 'host',
        userId: res.userId || userId,
        participants: res.participants || [],
        videoState: res.videoState || { videoId: '', playState: 'paused', currentTime: 0 },
        visibility: res.visibility || visibility,
      });
    });

      // Timeout fallback if backend doesn't respond
      setTimeout(() => {
        setLoading(p => {
          if (p) { setError('Request timed out. Is the backend running?'); return false; }
          return p;
        });
      }, 10000);
  };

  return (
    <div className="wm-overlay" onClick={loading ? undefined : onClose}>
      <div className="wcr-box" onClick={e => e.stopPropagation()}>

        {/* ── Title bar ── */}
        <div className="wcr-titlebar">
          <div className="wcr-titlebar-left">
            <img src="/images/wachtly_new_winow_logo.png" alt="" className="wcr-title-icon" />
            <span className="wcr-title-text">CREATE WATCH PARTY</span>
          </div>
          <div className="wcr-win-btns">
            <button className="wcr-wbtn wcr-wbtn-min">_</button>
            <button className="wcr-wbtn wcr-wbtn-max">□</button>
            <button className="wcr-wbtn wcr-wbtn-close" onClick={() => { playClick(); onClose(); }}>✕</button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="wcr-body">

          {/* Header banner */}
          <div className="wcr-header-banner">
            <img src="/images/app_watchly_createroom.png" alt="" className="wcr-banner-icon" />
            <div>
              <div className="wcr-banner-title">CREATE WATCH PARTY</div>
              <div className="wcr-banner-sub">Set up your room and invite others to watch together.</div>
            </div>
          </div>

          {/* Room Name */}
          <div className="wcr-field">
            <div className="wcr-field-label">🖊 ROOM NAME</div>
            <input
              className={`wcr-input ${error && !name.trim() ? 'wcr-input--error' : ''}`}
              placeholder="e.g. Friday Anime Night"
              value={name}
              maxLength={60}
              autoFocus
              disabled={loading}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>

          {/* Genre */}
          <div className="wcr-field">
            <div className="wcr-field-label">🎮 GENRE</div>
            <div className="wcr-genre-grid">
              {ROOM_GENRES.map(g => (
                <button
                  key={g.id}
                  className={`wcr-genre-btn ${genre === g.id ? 'wcr-genre-btn--active' : ''}`}
                  style={{ '--g-accent': g.accent }}
                  disabled={loading}
                  onClick={() => { playClick(); setGenre(g.id); setError(''); }}
                >
                  <img src={g.img} alt={g.label} className="wcr-genre-img" />
                  <span className="wcr-genre-name">{g.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div className="wcr-field">
            <div className="wcr-field-label">🔒 VISIBILITY</div>
            <div className="wcr-vis-row">
              <button
                className={`wcr-vis-btn ${visibility === 'public' ? 'wcr-vis-btn--active' : ''}`}
                disabled={loading}
                onClick={() => { playClick(); setVisibility('public'); }}
              >
                <span className="wcr-vis-icon">🌍</span>
                <div>
                  <div className="wcr-vis-title">PUBLIC</div>
                  <div className="wcr-vis-sub">Anyone can discover and join</div>
                </div>
              </button>
              <button
                className={`wcr-vis-btn ${visibility === 'private' ? 'wcr-vis-btn--active' : ''}`}
                disabled={loading}
                onClick={() => { playClick(); setVisibility('private'); }}
              >
                <span className="wcr-vis-icon">🔒</span>
                <div>
                  <div className="wcr-vis-title">PRIVATE</div>
                  <div className="wcr-vis-sub">Join using room code or invite</div>
                </div>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && <div className="wcr-error">⚠ {error}</div>}

          {/* Actions */}
          <div className="wcr-actions">
            <button className="wcr-btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? '⏳ CREATING ROOM...' : '🚀 CREATE & ENTER ROOM'}
            </button>
            <button className="wcr-btn-cancel" onClick={() => { playClick(); onClose(); }} disabled={loading}>
              CANCEL
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Join Room Modal (Matches Create Room Dialog UI Exactly) ───────
function JoinRoomModal({ username, onJoin, onClose }) {
  const [inputVal, setInputVal] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const parseRoomCode = (raw) => {
    if (!raw) return '';
    let val = raw.trim();
    // Parse invite link: ?room=CODE or ?roomId=CODE or /room/CODE
    try {
      if (val.includes('http://') || val.includes('https://') || val.includes('?room=') || val.includes('?roomId=')) {
        const url = new URL(val, window.location.origin);
        const q = url.searchParams.get('room') || url.searchParams.get('roomId');
        if (q) return q.trim().toUpperCase();
        const segments = url.pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
          const last = segments[segments.length - 1];
          if (last) return last.trim().toUpperCase();
        }
      }
    } catch (_) {}
    // Raw code: extract alphanumeric uppercase string
    const cleaned = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return cleaned;
  };

  const handleJoin = (e) => {
    e?.preventDefault();
    const raw = inputVal.trim();
    if (!raw) {
      setError('Please enter a room code or paste an invite link.');
      return;
    }
    const code = parseRoomCode(raw);
    if (!code || code.length < 4) {
      setError('Invalid room code. Please enter a valid 4-6 character code or invite link.');
      return;
    }
    playClick();
    setError('');
    setLoading(true);
    onJoin(code);
  };

  return (
    <div className="wm-overlay" onClick={loading ? undefined : onClose}>
      <div className="wcr-box" onClick={e => e.stopPropagation()}>

        {/* ── Title bar ── */}
        <div className="wcr-titlebar">
          <div className="wcr-titlebar-left">
            <img src="/images/wachtly_new_winow_logo.png" alt="" className="wcr-title-icon" />
            <span className="wcr-title-text">JOIN WATCH PARTY</span>
          </div>
          <div className="wcr-win-btns">
            <button className="wcr-wbtn wcr-wbtn-min" onClick={() => playClick()}>_</button>
            <button className="wcr-wbtn wcr-wbtn-max" onClick={() => playClick()}>□</button>
            <button className="wcr-wbtn wcr-wbtn-close" onClick={() => { playClick(); onClose(); }}>✕</button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="wcr-body">

          {/* Header banner */}
          <div className="wcr-header-banner">
            <img src="/images/app_watchly_joinroom.png" alt="" className="wcr-banner-icon" />
            <div>
              <div className="wcr-banner-title">JOIN WATCH PARTY</div>
              <div className="wcr-banner-sub">Enter a room code or paste an invite link.</div>
            </div>
          </div>

          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Input field */}
            <div className="wcr-field">
              <div className="wcr-field-label">🔑 ROOM CODE OR INVITE LINK</div>
              <input
                className={`wcr-input ${error ? 'wcr-input--error' : ''}`}
                placeholder="e.g. AB12XY or https://..."
                value={inputVal}
                autoFocus
                disabled={loading}
                onChange={e => { setInputVal(e.target.value); setError(''); }}
              />
            </div>

            {/* Error */}
            {error && <div className="wcr-error">⚠ {error}</div>}

            {/* Actions */}
            <div className="wcr-actions">
              <button type="submit" className="wcr-btn-primary" disabled={loading}>
                {loading ? '⏳ JOINING...' : '🚀 JOIN ROOM'}
              </button>
              <button type="button" className="wcr-btn-cancel" onClick={() => { playClick(); onClose(); }} disabled={loading}>
                CANCEL
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}

// ── Main Desktop ──────────────────────────────────────────────────
export default function WatchlyDesktop({ username, onOpenRoom, onExit }) {
  const [appOpen, setAppOpen] = useState(false);
  const [maximized, setMaximized] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    if (username) setStoredUsername(username);
  }, [username]);

  const [pos, setPos] = useState({ x: 60, y: 40 });
  const dragging = useRef(false);
  const startMouse = useRef({});
  const startPos = useRef({});

  useEffect(() => {
    const onMove = e => {
      if (!dragging.current || maximized) return;
      setPos({ x: startPos.current.x + e.clientX - startMouse.current.x, y: startPos.current.y + e.clientY - startMouse.current.y });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [maximized]);

  const handleOpenRoom = (opts) => {
    if (opts.type === 'create_modal') { setShowCreate(true); return; }
    if (opts.type === 'join_modal') { setShowJoin(true); return; }
    onOpenRoom(opts);
  };

  const winStyle = maximized
    ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: '36px', zIndex: 260 }
    : { position: 'absolute', left: pos.x, top: pos.y, width: 960, height: 620, zIndex: 260 };

  return (
    <div className="wos-desktop" style={{ backgroundImage: 'url(/images/desktop_background.png)' }}>

      {/* ── Desktop icon ── */}
      <div className="wos-icon-grid">
        <button className="wos-desktop-icon"
          onClick={() => { playClick(); setAppOpen(true); setMinimized(false); setMaximized(true); }}
          onDoubleClick={() => { playClick(); setAppOpen(true); setMinimized(false); setMaximized(true); }}
          title="Click to open WatchCraft">
          <div className="wos-icon-img-wrap">
            <img src="/images/Watchly_Monitor_Logo.png" alt="WatchCraft" className="wos-icon-img" />
          </div>
        </button>
      </div>

      {/* ── App window ── */}
      {appOpen && !minimized && (
        <div className="wos-app-window" style={winStyle}>
          <div className="wos-window-titlebar wos-titlebar-blue"
            onMouseDown={e => {
              if (maximized) return;
              dragging.current = true;
              startMouse.current = { x: e.clientX, y: e.clientY };
              startPos.current = { ...pos };
            }}
            onDoubleClick={() => setMaximized(p => !p)}>
            <div className="wos-titlebar-left">
              <img src="/images/Watchly_Monitor_Logo.png" alt="" className="wos-titlebar-icon" />
              <span className="wos-titlebar-title">WATCHCRAFT</span>
            </div>
            <div className="wos-window-controls">
              <button className="wos-wbtn wos-wbtn-min" title="Minimize" onClick={() => { playClick(); setMinimized(true); }}>_</button>
              <button className="wos-wbtn wos-wbtn-max" title={maximized ? 'Restore' : 'Maximize'} onClick={() => { playClick(); setMaximized(p => !p); }}>{maximized ? '❐' : '□'}</button>
              <button className="wos-wbtn wos-wbtn-close" title="Close" onClick={() => { playClick(); setAppOpen(false); setShowCreate(false); setShowJoin(false); }}>✕</button>
            </div>
          </div>
          <div className="wos-app-body">
            <WatchlyAppContent username={username} onOpenRoom={handleOpenRoom} />
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateRoomModal username={username} onClose={() => setShowCreate(false)}
          onCreated={opts => { setShowCreate(false); onOpenRoom({ type: 'create', ...opts }); }} />
      )}
      {showJoin && (
        <JoinRoomModal username={username}
          onJoin={roomId => { setShowJoin(false); onOpenRoom({ type: 'join', roomId, username }); }}
          onBrowse={genre => { setShowJoin(false); onOpenRoom({ type: 'join', genre, username }); }}
          onClose={() => setShowJoin(false)} />
      )}

      {/* ── Taskbar ── */}
      <div className="wos-taskbar">
        <button className="wos-exit-btn" onClick={() => { playClick(); onExit(); }}>⏻ EXIT</button>
        <div className="wos-taskbar-items">
          {appOpen && (
            <button className={`wos-taskbar-item ${!minimized ? 'wos-taskbar-item--active' : ''}`}
              onClick={() => { playClick(); setMinimized(p => !p); }}>
              <img src="/images/Watchly_Monitor_Logo.png" alt="" className="wos-tb-icon" />
              WatchCraft
            </button>
          )}
        </div>
        <div className="wos-system-tray">
          <span className="wos-tray-user">👤 {username}</span>
          <Clock />
        </div>
      </div>
    </div>
  );
}
