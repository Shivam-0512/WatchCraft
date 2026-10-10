import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playClick } from './sounds';
import WatchlyDesktop from './WatchlyDesktop';
import RoomList from './RoomList';
import WatchRoom3D from './WatchRoom3D';
import ErrorBoundary from './ErrorBoundary';
import { getSocket, getPersistentUserId, getStoredUsername, setStoredUsername } from './socket';

// ─── BOOT LINES ─────────────────────────────────────────
const BOOT_LINES = [
  'WATCHCRAFT OS v1.0.0',
  'Copyright (C) WatchCraft Systems, All Rights Reserved',
  '',
  'CPU: Stream Processor x4 @ 4.2GHz',
  'RAM Check: 131072K OK',
  'Detecting Primary Adapter... WATCHCRAFT-NET [∞ Mbps]',
  '',
  'Loading WATCHCRAFT OS...',
  'Initializing WebSocket engine...',
  'Starting synchronization services...',
  'Mounting video streams...',
  'Establishing room registry...',
  '',
  'System ready. Welcome to WatchCraft.',
];

// ─── DESKTOP APPS DATA ──────────────────────────────────
const APPS = [
  {
    id: 'projects',
    title: '',
    iconUrl: '/images/myprojects.png',
    content: {
      title: 'Projects',
      sections: [
        {
          label: 'CODNITE',
          desc: 'A full-stack competitive coding platform built for Indian college students — combining serious coding practice with college identity, social networking, and real-time battles.',
          bannerImage: '/images/codnite.png',
          details: [
            'Codnite is a full-stack competitive coding platform built exclusively for Indian college students, combining serious algorithmic practice with college identity, real-time battles, and a social layer — everything LeetCode and Codeforces lack.',

            '- Battle System: Students challenge each other to real-time 1v1 coding duels or compete in college vs college team battles with 5 to 20 students per side, powered by a state machine with auto-start, auto-end, and live sync via Socket.IO and Redis.',

            '- Problem Library: Over 100 curated problems across Easy, Medium, and Hard difficulty covering Arrays, Strings, and Dynamic Programming. Every submission runs inside a Docker sandbox supporting Python, JavaScript, Java, and C++.',

            '- Social Feed: A Twitter-style feed built around code where students post, comment, follow, and share solutions using a TipTap rich text editor with full code snippet support.',

            '- Leaderboards & Communities: Rankings at All India, state, city, and college level with weekly, monthly, and all-time filters. Every college has its own feed, leaderboard, and battle points that accumulate as a team.',

            '- Recruiter Dashboard: Companies access verified student profiles with real coding history, battle stats, and consistency data — a genuine talent intelligence layer for campus hiring beyond resumes.',
          ],
          skills: ['React', 'Node.js', 'Socket.IO', 'Redis', 'Docker', 'MongoDB'],
          projectLink: 'https://www.codnite.com/'
        },
        {
          label: 'AROHAN (RONIN)',
          desc: 'An AI-powered autonomous campus safety system that combines IoT sensors, real-time risk analysis, and robotic rovers to detect, verify, and respond to hazards instantly.',
          bannerImage: '/images/arohan.png',
          details: [
            'Arohhan is an AI + IoT + robotics-based safety system designed for campuses and labs — transforming traditional detection-only setups into a real-time autonomous response network.',

            '- Sensor Fusion System: Combines MQ-2, MQ-135, flame, and temperature sensors to continuously monitor environments and generate a unified hazard score using a weighted model.',

            '- AI Hazard Engine: Processes sensor data in real-time, normalizes inputs, and classifies risk into Safe, Warning, and Danger zones to eliminate false alarms and trigger actions intelligently.',

            '- Autonomous Rover Verification: A smart rover is dispatched to the location within seconds to verify hazards using onboard sensors and live feed, ensuring accuracy before escalation.',

            '- Real-Time Response System: Activates alarms, ventilation (fan), and sends instant alerts to dashboard/mobile while logging all events for analysis and learning.',

            '- Adaptive Learning Loop: Continuously improves threshold accuracy using historical data, reducing false alerts and improving system reliability over time.',
          ],
          skills: ['ESP32', 'Arduino', 'IoT', 'OpenCV', 'Node.js'],
          projectLink: 'https://arohan-ruby.vercel.app/'
        },
        {
          label: 'ECOBIN',
          desc: 'An IoT-based smart waste management system for real-time bin monitoring, alerts, and efficient collection.',
          bannerImage: '/images/ecobin.png',
          details: [
            'EcoBin is a smart waste management system designed to reduce overflowing bins and optimize collection using real-time IoT monitoring and cloud integration.',

            '- Real-Time Monitoring: Uses ultrasonic sensors to track bin fill levels continuously and update data live to the cloud.',

            '- Instant Alerts System: Sends notifications via Firebase before bins overflow, enabling timely waste collection and cleaner surroundings.',

            '- Cloud & Dashboard Integration: Stores and syncs bin data in real-time with a mobile app and web dashboard for monitoring and management.',

            '- Location Tracking: GPS-based bin tracking helps optimize collection routes and reduce operational inefficiencies.',

            '- Scalable Smart Infrastructure: Designed as a modular system for smart cities with centralized monitoring and analytics.'
          ],
          skills: ['Arduino', 'ESP32', 'Firebase', 'C++', 'IoT'],
          projectLink: 'https://eco-bin-cleo.vercel.app/'
        },
        {
          label: 'TECHEEZ WEBXP',
          desc: 'An immersive Minecraft-inspired interactive portfolio experience.',
          bannerImage: '/images/techeez.png',
          details: [
            '- Game-Based Portfolio: Navigate a 2D interactive room to explore projects, skills, and features.',
            '- Custom OS System: In-browser retro desktop inspired by Minecraft + Windows 98 with dynamic window management.',
            '- Interactive Entities: Clickable objects (computer, bed, shelf) reveal different sections of the portfolio.',
            '- Smooth Animations: Character movement, hover effects, and UI transitions for a game-like feel.',
            '- Audio Integration: Minecraft-style sounds for clicks, interactions, and ambient background music.'
          ],
          skills: ['React', 'JavaScript', 'CSS', 'Vite', 'Canvas', 'UI/UX'],
          projectLink: 'https://techeez.netlify.app/'
        },
      ],
      link: { label: 'View on GitHub', href: 'https://github.com/techeez' },
    },
  },
  {
    id: 'resume',
    title: '',
    iconUrl: '/images/resume.png',
    content: {
      title: 'RESUME',
      sections: [
        { label: 'SHADAN', desc: 'AI/ML + Backend — Python, FastAPI, React, NLP, Computer Vision' },
        { label: 'SHIVAM', desc: 'Full-Stack + IoT — React, Node, Firebase, ESP32, Automation Systems' },

      ],
      links: [
        { label: 'Download Shivam', href: '/resume/shivam-resume.pdf' },
        { label: 'Download Shadan', href: '/resume/Md Shadan Siddiqui Resume.pdf' },
      ],
    },
  },
  {
    id: 'skills',
    title: '',
    iconUrl: '/images/skills.png',
    content: {
      title: 'SKILL TREE',
      sections: [
        { label: 'FRONTEND', desc: 'React · Next.js · TypeScript · CSS · Tailwind' },
        { label: 'BACKEND', desc: 'Node.js · Express · REST · WebSockets · MongoDB' },
        { label: 'AI / ML', desc: 'Python · TensorFlow · LLM Pipelines · OpenCV' },
        { label: 'IOT', desc: 'Arduino · ESP32 · Firebase · MQTT · Sensors' },
        { label: 'DEVOPS', desc: 'Docker · CI/CD · Netlify · Vercel · Git' },
      ],
    },
  },
  {
    id: 'about',
    title: '',
    iconUrl: '/images/aboutus.png',
    content: {
      title: 'ABOUT TECHEEZ',
      sections: [
        {
          label: 'WHO WE ARE',
          desc: 'Shivam Kushwaha & Md. Shadan — developers focused on building real, scalable systems through practical implementation.'
        },
        {
          label: 'WHAT WE DO',
          desc: 'We design and build full-stack applications, interactive systems, and user experiences that go beyond traditional web development.'
        },
        {
          label: 'PHILOSOPHY',
          desc: 'No fluff. No fake demos. We focus on building systems that work, scale, and solve real-world problems.'
        },
        {
          label: 'ORIGIN',
          desc: 'Techeez was started to combine strong technical skills with practical execution — turning ideas into working products, not just concepts.'
        },
        {
          label: 'MISSION',
          desc: 'To create impactful, scalable solutions and push the boundaries of how projects and portfolios are built and experienced.'
        },
        {
          label: 'WHY THIS PROJECT',
          desc: 'This interactive portfolio represents how we think — system-driven, user-focused, and built to be experienced rather than just viewed.'
        }
      ]
    }
  },
  {
    id: 'contact',
    title: '',
    iconUrl: '/images/contact.png',
    content: {
      title: 'CONTACT',
      sections: [
        { label: 'EMAIL', desc: 'techeez@gmail.com' },
        { label: 'GITHUB', desc: 'github.com/techeez' },
        { label: 'LINKEDIN', desc: 'linkedin.com/company/techeez' },
      ],
      links: [
        { label: 'Send Email', href: 'mailto:techeez@gmail.com' },
        { label: 'LinkedIn', href: 'https://linkedin.com/company/techeez' },
      ],
    },
  },
];

// ─── BOOT SCREEN ────────────────────────────────────────
function BootScreen({ onComplete }) {
  const [lines, setLines] = useState([]);
  const [ready, setReady] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i >= BOOT_LINES.length) {
        clearInterval(interval);
        setReady(true);
        return;
      }
      setLines(prev => [...prev, BOOT_LINES[i]]);
      i++;
    }, 180);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  useEffect(() => {
    if (!ready) return;
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      playClick(); onComplete();
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('click', handler);
    return () => { window.removeEventListener('keydown', handler); window.removeEventListener('click', handler); };
  }, [ready, onComplete]);

  return (
    <div className="cs-boot" ref={ref}>
      {lines.map((l, i) => (
        <div key={i} className="cs-boot-line">{l || '\u00a0'}</div>
      ))}
      {ready && (
        <div className="cs-boot-prompt cs-blink">
          {'> Press any key or click to continue_'}
        </div>
      )}
      {!ready && <div className="cs-boot-cursor cs-blink">_</div>}
    </div>
  );
}

// ─── LOGIN SCREEN (now captures USERNAME for watch party identity) ───────
function LoginScreen({ onLogin, onCancel }) {
  const [username, setUsername] = useState(() => getStoredUsername() || '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name || name.length < 2) { setError('Username must be at least 2 characters'); return; }
    if (name.length > 24) { setError('Username must be under 24 characters'); return; }
    playClick();
    setStoredUsername(name);
    onLogin(name);
  };

  return (
    <div className="cs-login">
      <div className="cs-login-box">

        {/* Title bar */}
        <div className="cs-login-titlebar">
          <span className="cs-login-title-text">WATCHCRAFT OS — Set Display Name</span>
          <button className="cs-login-help" type="button">?</button>
        </div>

        {/* Body */}
        <div className="cs-login-body">
          {/* Avatar */}
          <div className="cs-login-avatar cs-login-avatar--watchly">
            <span className="cs-login-avatar-letter">W</span>
          </div>

          {/* Fields */}
          <div className="cs-login-fields">
            <p className="cs-login-desc">
              Enter your display name. This is how others will see you in watch party rooms.
            </p>

            <form id="cs-login-form" onSubmit={handleSubmit}>
              <div className="cs-login-field-row">
                <label className="cs-login-label" htmlFor="cs-username">Display Name:</label>
                <input
                  id="cs-username"
                  className="cs-login-input"
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  autoFocus
                  placeholder="e.g. Shivam"
                  maxLength={24}
                />
              </div>
              {error && <div style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '4px', fontFamily: 'monospace' }}>{error}</div>}
            </form>
          </div>
        </div>

        <div className="cs-login-divider" />

        <div className="cs-login-actions">
          <button className="cs-win-btn" type="submit" form="cs-login-form">Enter →</button>
          <button className="cs-win-btn" type="button" onClick={() => { playClick(); onCancel(); }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── WINDOW COMPONENT ────────────────────────────────────
function AppWindow({ app, onClose, zIndex, onFocus }) {
  const { content } = app;
  const dragRef = useRef(null);
  const [pos, setPos] = useState({ x: 80 + Math.random() * 60, y: 60 + Math.random() * 40 });
  const [maximized, setMaximized] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const dragging = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const onMouseDown = (e) => {
    onFocus();
    if (maximized) return; // Disable dragging when maximized
    dragging.current = true;
    startMouse.current = { x: e.clientX, y: e.clientY };
    startPos.current = { ...pos };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      setPos({
        x: startPos.current.x + e.clientX - startMouse.current.x,
        y: startPos.current.y + e.clientY - startMouse.current.y,
      });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  return (
    <div
      ref={dragRef}
      className={`cs-window ${maximized ? 'cs-window-maximized' : ''}`}
      style={{ left: pos.x, top: pos.y, zIndex }}
      onMouseDown={onFocus}
    >
      {/* Title bar */}
      <div className="cs-window-titlebar" onMouseDown={onMouseDown} onDoubleClick={() => setMaximized(!maximized)}>
        <img src={app.iconUrl} alt="icon" className="cs-window-icon-img" />
        <span className="cs-window-title">{app.title}</span>
        <div className="cs-window-controls">
          <button className="cs-wctrl cs-wctrl-min" title="Minimise">_</button>
          <button
            className="cs-wctrl cs-wctrl-max"
            title="Maximise"
            onClick={(e) => { e.stopPropagation(); playClick(); setMaximized(!maximized); }}
          >
            {maximized ? '❐' : '□'}
          </button>
          <button className="cs-wctrl cs-wctrl-close" title="Close" onClick={(e) => { e.stopPropagation(); playClick(); onClose(); }}>✕</button>
        </div>
      </div>

      {/* Body */}
      <div className="cs-window-body">
        {!activeProject ? (
          <>
            <h3 className="cs-win-heading">{content.title}</h3>
            <div className="cs-win-sections">
              {content.sections.map((s, i) => (
                <div
                  key={i}
                  className={`cs-win-section ${s.details ? 'cs-clickable-section' : ''}`}
                  onDoubleClick={() => { if (window.innerWidth > 768 && s.details) { playClick(); setActiveProject(s); } }}
                  onClick={() => { if (window.innerWidth <= 768 && s.details) { playClick(); setActiveProject(s); } }}
                >
                  <div className="cs-win-section-label">{s.label}</div>
                  <div className="cs-win-section-desc">{s.desc}</div>
                </div>
              ))}
            </div>
            {(content.link || content.links) && (
              <div className="cs-win-footer">
                {content.link && (
                  <a href={content.link.href} target="_blank" rel="noopener noreferrer" className="cs-win-link-btn" onClick={playClick}>
                    {content.link.label}
                  </a>
                )}
                {content.links?.map((l, i) => (
                  <a key={i} href={l.href} target="_blank" rel="noopener noreferrer" className="cs-win-link-btn" onClick={playClick}>
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="cs-project-details-view fade-in">
            <div className="cs-pd-header">
              <button className="cs-pd-back-btn" onClick={() => { playClick(); setActiveProject(null); }}>← Back to Projects</button>
              <h2 className="cs-pd-title">{activeProject.label}</h2>
              <p className="cs-pd-desc">{activeProject.desc}</p>
            </div>

            {activeProject.bannerImage && (
              <div className="cs-pd-banner-container">
                <img src={activeProject.bannerImage} alt={activeProject.label} className="cs-pd-banner" />
              </div>
            )}

            <div className="cs-pd-skills-section">
              <div className="cs-pd-skills-title">SKILLS USED</div>
              <div className="cs-pd-skills-list">
                {activeProject.skills?.map((skill, idx) => (
                  <span key={idx} className="cs-pd-skill-tag">{skill}</span>
                ))}
              </div>
            </div>

            <div className="cs-pd-bullets">
              {activeProject.details?.map((detail, idx) => (
                <div key={idx} className="cs-pd-bullet">{detail}</div>
              ))}
            </div>

            {activeProject.projectLink && (
              <div className="cs-pd-footer">
                <a href={activeProject.projectLink} target="_blank" rel="noopener noreferrer" className="cs-win-link-btn" onClick={playClick}>View project online</a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WATCHLY OS HUB ──────────────────────────────────────────────
// Replaces old Techeez Desktop. Routes between:
//   WatchlyDesktop → RoomList (browse genre) → WatchPartyView

function WatchlyHub({ username, onExit }) {
  const socket = getSocket();

  // view: 'desktop' | 'roomlist' | 'watchparty'
  const [view, setView] = useState('desktop');
  const [browseGenre, setBrowseGenre] = useState(null);
  const [partyData, setPartyData] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');

  // ── Create Room ────────────────────────────────────────
  const handleCreateRoom = ({ name, genre, username: uname }) => {
    setConnecting(true);
    setConnectError('');
    const userId = getPersistentUserId();
    socket.emit('create_room', { name, genre, username: uname, userId }, (res) => {
      setConnecting(false);
      if (!res?.success) { setConnectError(res?.error || 'Failed to create room'); return; }
      setPartyData({
        roomId: res.roomId,
        username: uname,
        role: res.role || 'host',
        userId: res.userId || userId,
        videoState: res.videoState,
        participants: res.participants || [],
        roomName: res.name || name,
        genre: res.genre || genre,
        visibility: res.visibility || 'public',
      });
      setView('watchparty');
    });
  };

  // ── Join by room code / Live Room ──────────────────────
  const handleJoinByCode = (roomId) => {
    setConnecting(true);
    setConnectError('');
    const userId = getPersistentUserId();

    let handled = false;
    const finalizeJoin = (data) => {
      if (handled) return;
      handled = true;
      setConnecting(false);
      socket.off('joined_room', onJoined);
      socket.off('sync_state', onSync);
      socket.off('error', onErr);

      const assignedRole = data.role || data.videoState?.role || 'participant';
      setPartyData({
        roomId: data.roomId || roomId,
        username,
        role: assignedRole,
        userId,
        videoState: data.videoState || { videoId: '', playState: 'paused', currentTime: 0 },
        participants: data.participants || [],
        roomName: data.name || data.roomName || 'Watch Party',
        genre: data.genre || 'other',
        visibility: data.visibility || 'public',
      });
      setView('watchparty');
    };

    const onJoined = (payload) => finalizeJoin(payload);
    const onSync = (vState) => finalizeJoin({ videoState: vState, role: vState?.role });
    const onErr = ({ message }) => {
      if (handled) return;
      handled = true;
      setConnecting(false);
      socket.off('joined_room', onJoined);
      socket.off('sync_state', onSync);
      socket.off('error', onErr);
      setConnectError(message || 'Failed to join room');
    };

    socket.once('joined_room', onJoined);
    socket.once('sync_state', onSync);
    socket.once('error', onErr);

    socket.emit('join_room', { roomId, username, userId }, (res) => {
      if (res?.success) {
        finalizeJoin(res);
      } else if (res?.error) {
        onErr({ message: res.error });
      }
    });

    // Timeout after 8s
    setTimeout(() => {
      if (!handled && connecting) {
        handled = true;
        socket.off('joined_room', onJoined);
        socket.off('sync_state', onSync);
        socket.off('error', onErr);
        setConnecting(false);
        setConnectError('Connection timed out');
      }
    }, 8000);
  };

  // ── Open room card from RoomList / Desktop ──────────────────────
  const handleOpenRoom = (opts) => {
    if (opts.type === 'create') {
      if (opts.roomId) {
        // Room already created & socket joined via CreateRoomModal
        setPartyData({
          roomId: opts.roomId,
          username: opts.username || username,
          role: opts.role || 'host',
          userId: opts.userId || getPersistentUserId(),
          videoState: opts.videoState,
          participants: opts.participants || [],
          roomName: opts.name,
          genre: opts.genre,
          visibility: opts.visibility,
        });
        setView('watchparty');
      } else {
        handleCreateRoom(opts);
      }
    } else if (opts.type === 'join') {
      if (typeof opts.roomId === 'string') {
        // Direct room code join
        handleJoinByCode(opts.roomId);
      } else if (opts.genre) {
        // Browse genre
        setBrowseGenre(opts.genre);
        setView('roomlist');
      }
    }
  };

  if (connecting) {
    return (
      <div className="wh-connecting">
        <div className="wh-spinner" />
        <p>Connecting to room...</p>
        {connectError && (
          <>
            <p style={{ color: '#ff6b6b' }}>{connectError}</p>
            <button onClick={() => { setConnecting(false); setConnectError(''); }} className="cs-win-btn">Back</button>
          </>
        )}
      </div>
    );
  }

  if (view === 'watchparty' && partyData) {
    return (
      <ErrorBoundary onReset={() => { setView('desktop'); setPartyData(null); }}>
        <WatchRoom3D
          {...partyData}
          onExit={() => {
            setView('desktop');
            setPartyData(null);
          }}
        />
      </ErrorBoundary>
    );
  }

  if (view === 'roomlist' && browseGenre) {
    return (
      <RoomList
        genre={browseGenre}
        username={username}
        onJoinRoom={handleJoinByCode}
        onBack={() => setView('desktop')}
      />
    );
  }

  return (
    <WatchlyDesktop
      username={username}
      onOpenRoom={handleOpenRoom}
      onExit={onExit}
    />
  );
}

// ─── LEGACY DESKTOP (kept but replaced by WatchlyHub) ─────────────────────
function Desktop({ onExit }) {
  const [openWindows, setOpenWindows] = useState([]);
  const [topZ, setTopZ] = useState(10);
  const [clock, setClock] = useState('');

  // Clock
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, []);

  const openApp = (app) => {
    playClick();
    if (openWindows.find(w => w.id === app.id)) {
      focusWindow(app.id);
      return;
    }
    const newZ = topZ + 1;
    setTopZ(newZ);
    setOpenWindows(prev => [...prev, { ...app, winZ: newZ }]);
  };

  const focusWindow = (id) => {
    const newZ = topZ + 1;
    setTopZ(newZ);
    setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, winZ: newZ } : w));
  };

  const closeWindow = (id) => {
    setOpenWindows(prev => prev.filter(w => w.id !== id));
  };

  // ESC closes system
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') { playClick(); onExit(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onExit]);

  return (
    <div className="cs-desktop-root">
      {/* Desktop icon grid */}
      <div className="cs-desktop-icons">
        {APPS.map(app => (
          <button
            key={app.id}
            className="cs-desktop-icon"
            onDoubleClick={() => openApp(app)}
            onClick={() => { }}
          >
            <img src={app.iconUrl} alt={app.title} className="cs-di-img" />
            <span className="cs-di-label">{app.title}</span>
          </button>
        ))}
      </div>

      {/* Open windows */}
      {openWindows.map(w => (
        <AppWindow
          key={w.id}
          app={w}
          zIndex={w.winZ}
          onClose={() => closeWindow(w.id)}
          onFocus={() => focusWindow(w.id)}
        />
      ))}

      {/* Taskbar */}
      <div className="cs-taskbar">
        <button className="cs-start-btn" onClick={() => { playClick(); onExit(); }}>
          ◀ EXIT
        </button>
        <div className="cs-taskbar-windows">
          {openWindows.map(w => (
            <button
              key={w.id}
              className="cs-taskbar-item"
              onClick={() => focusWindow(w.id)}
            >
              <img src={w.iconUrl} alt="icon" className="cs-taskbar-icon-img" /> {w.title}
            </button>
          ))}
        </div>
        <div className="cs-taskbar-clock">{clock}</div>
      </div>
    </div>
  );
}

// ─── ROOT COMPUTER SYSTEM (now WatchlyOS) ────────────────────────
export default function ComputerSystem({ onExit }) {
  const [phase, setPhase] = useState('boot');
  const [fading, setFading] = useState(false);
  const [username, setUsername] = useState(() => getStoredUsername() || '');

  const transition = (next) => {
    setFading(true);
    setTimeout(() => { setPhase(next); setFading(false); }, 400);
  };

  return (
    <div className={`cs-root${fading ? ' cs-fading' : ''}`}>
      <div className="cs-scanlines" />
      {phase === 'boot' && (
        <BootScreen onComplete={() => transition('login')} />
      )}
      {phase === 'login' && (
        <LoginScreen
          onLogin={(name) => { setUsername(name); transition('watchly'); }}
          onCancel={() => { playClick(); onExit(); }}
        />
      )}
      {phase === 'watchly' && (
        <WatchlyHub
          username={username}
          onExit={() => { playClick(); onExit(); }}
        />
      )}
    </div>
  );
}
