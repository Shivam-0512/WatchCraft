import { useState, useEffect, useRef, useCallback } from 'react';
import { playClick, playHover, pauseBgMusic, resumeBgMusic } from './sounds';
import ComputerSystem from './ComputerSystem';

const ROOM_BG = '/images/room_new.png';
const PLAYER_IMG = '/images/room_npc.png';
const NPC_IMG = '/images/narrator_npc.png';

const LERP_SPEED = 0.07;
const ARRIVE_THRESHOLD = 0.8;
const COOLDOWN_MS = 800;
const WASD_SPEED = LERP_SPEED * 3.5;
const FLOOR = { minX: 34, maxX: 66, minY: 40, maxY: 78 };

// ─── INTRO DIALOG ───────────────────────────────────────
const INTRO_DIALOG = {
  id: 'intro',
  npcName: 'Heli',
  text: "Hey! Welcome to the WatchCraft HQ. This is an interactive space — explore the room and interact with objects. Use WASD or click to move. Walk up to objects and press E to interact. The computer lets you create or join watch parties!",
  cta: null,
};

// ─── WORLD ENTITIES ─────────────────────────────────────
const WORLD_ENTITIES = [
  {
    id: 'computer', name: 'WatchCraft', label: 'Watch Party', icon: '🎬',
    glowColor: 'rgba(80,150,255,0.5)',
    x: 38, y: 19, width: 24, height: 20,
    interactionRadius: 14, walkTarget: { x: 50, y: 44 },
    npcDialog: {
      npcName: 'Heli',
      text: "Wanna watch something together? Boot up the machine, set your display name, then create or join a watch party room. Sync your video with friends in real time!",
      cta: 'Boot Up WatchCraft →', action: 'openComputer',
    },
  },
  {
    id: 'bookshelf', name: 'Legal Documents', label: 'Documents', icon: '📜',
    glowColor: 'rgba(100,200,255,0.5)',
    x: 63, y: 43, width: 10, height: 14,
    interactionRadius: 12, walkTarget: { x: 62, y: 60 },
    npcDialog: {
      npcName: 'Heli',
      text: "Looking for our legal policies? Here are the official WatchCraft Privacy Policy and Terms of Service documents.",
      cta: 'View Documents →', action: 'openDocuments',
    },
  },
  {
    id: 'bed', name: 'Cozy Bed', label: 'Cozy Bed', icon: '🛏️',
    glowColor: 'rgba(255,200,120,0.5)',
    x: 55, y: 67, width: 18, height: 14,
    interactionRadius: 13, walkTarget: { x: 52, y: 68 },
    npcDialog: {
      npcName: 'Heli',
      text: "Even the best hosts need a break. Grab a snack, get comfortable, and recharge before the next episode. Your friends aren't going anywhere… probably.",
    },
  },
  {
    id: 'cert_l1', type: 'painting', name: 'Painting 1',
    images: ['/rooms/room1.png'],
    glowColor: 'rgba(255,255,255,0.4)',
    x: 37, y: 18, width: 4.5, height: 6,
    interactionRadius: 15, walkTarget: { x: 42, y: 45 }
  },
  {
    id: 'cert_l2', type: 'painting', name: 'Painting 2',
    images: ['/rooms/room2.png'],
    glowColor: 'rgba(255,255,255,0.4)',
    x: 37.5, y: 26, width: 2.2, height: 4,
    interactionRadius: 15, walkTarget: { x: 42, y: 45 }
  },
  {
    id: 'cert_r1', type: 'painting', name: 'Painting 3',
    images: ['/rooms/room3.png'],
    glowColor: 'rgba(255,255,255,0.4)',
    x: 57.5, y: 17, width: 2.2, height: 3.8,
    interactionRadius: 15, walkTarget: { x: 56, y: 45 }
  },
  {
    id: 'cert_r2', type: 'painting', name: 'Painting 4',
    images: ['/rooms/room4.png'],
    glowColor: 'rgba(255,255,255,0.4)',
    x: 57.5, y: 22.5, width: 2.2, height: 3.8,
    interactionRadius: 15, walkTarget: { x: 56, y: 45 }
  },
  {
    id: 'cert_r3', type: 'painting', name: 'Painting 5',
    images: ['/rooms/room5.png'],
    glowColor: 'rgba(255,255,255,0.4)',
    x: 60.3, y: 20, width: 2.2, height: 3.8,
    interactionRadius: 15, walkTarget: { x: 56, y: 45 }
  },
  {
    id: 'cert_r4', type: 'painting', name: 'Painting 6',
    images: ['/rooms/room6.png'],
    glowColor: 'rgba(255,255,255,0.4)',
    x: 60.3, y: 26, width: 2.2, height: 3.8,
    interactionRadius: 15, walkTarget: { x: 56, y: 45 }
  }
];

function checkAABB(cx, cy, e) {
  return cx >= e.x && cx <= e.x + e.width && cy >= e.y && cy <= e.y + e.height;
}
function pctDist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ─── STACKED PAPER DOCUMENT COMPONENT ────────────────────────
function PaperDocument({ title, subtitle, pdfUrl, sections, isActive, onFocus }) {
  return (
    <div
      className={`paper-stack-item ${isActive ? 'paper-active' : 'paper-inactive'}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!isActive) onFocus();
      }}
      style={!isActive ? { cursor: 'pointer' } : undefined}
    >
      <article className="paper-fold" tabIndex={-1}>
        <div
          className="paper-corner-click"
          title="Click to swap document"
          onClick={(e) => {
            e.stopPropagation();
            onFocus();
          }}
        />
        <div className="paper-lines">
          <section className="paper-text" spellCheck={false}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              <div>
                <h1 className="paper-title" style={{ marginBottom: '6px' }}>{title}</h1>
                <p className="paper-intro" style={{ marginBottom: 0 }}>{subtitle}</p>
              </div>
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="paper-link"
                  style={{
                    fontSize: '0.36rem',
                    background: '#e0e7ff',
                    color: '#1e40af',
                    padding: '5px 9px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    border: '1px solid #93c5fd',
                    display: 'inline-block',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Download PDF ↗
                </a>
              )}
            </div>

            {sections.map((sec, idx) => (
              <div className="paper-section" key={idx}>
                <h2 className="paper-section-title">{sec.title}</h2>
                {sec.content && <p className="paper-section-content">{sec.content}</p>}
                {sec.items && sec.items.map((item, i) => (
                  <div className="paper-item" key={i} style={{ marginBottom: '10px' }}>
                    <h3 className="paper-role" style={{ fontSize: '0.42rem', marginBottom: '3px' }}>{item.label}</h3>
                    <p className="paper-description" style={{ fontSize: '0.36rem', color: '#374151' }}>{item.text}</p>
                  </div>
                ))}
              </div>
            ))}
          </section>
        </div>
        <span className="paper-hole hole-top" aria-hidden="true" />
        <span className="paper-hole hole-middle" aria-hidden="true" />
        <span className="paper-hole hole-bottom" aria-hidden="true" />
      </article>
    </div>
  );
}

// ─── NPC DIALOG COMPONENT ───────────────────────────────
function NpcDialog({ dialog, onClose, onAction }) {
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);

  // Reset when dialog changes
  useEffect(() => {
    if (!dialog) return;
    setCharIdx(0); setDone(false);
  }, [dialog?.id]);

  const currentText = dialog?.text ?? '';

  // Typing effect
  useEffect(() => {
    if (!dialog || done) return;
    if (charIdx >= currentText.length) { setDone(true); return; }
    const t = setTimeout(() => setCharIdx(c => c + 1), 20); // Fast typing for one-go text
    return () => clearTimeout(t);
  }, [dialog, charIdx, currentText, done]);

  const advance = useCallback(() => {
    playClick();
    if (!done) { setCharIdx(currentText.length); setDone(true); return; }
    onClose();
  }, [done, currentText, onClose]);

  if (!dialog) return null;

  const displayedText = currentText.slice(0, charIdx);
  const showCta = done && dialog.cta;

  const handleCta = () => {
    playClick();
    if (dialog.action) {
      onClose();
      if (onAction) onAction(dialog.action);
    }
  };

  return (
    <div className="npc-dlg-root" onClick={e => e.stopPropagation()}>
      {/* Portrait */}
      <div className="npc-dlg-portrait-wrap">
        <img src={NPC_IMG} alt="NPC" className="npc-dlg-portrait" draggable={false} />
      </div>

      {/* Panel */}
      <div className="npc-dlg-panel">
        <div className="npc-dlg-nametag">{dialog.npcName}</div>
        <div className="npc-dlg-text">
          {displayedText}
          {!done && <span className="gr-cursor">█</span>}
        </div>
        <div className="npc-dlg-buttons">
          {showCta ? (
            <>
              {dialog.action ? (
                <button className="npc-btn npc-btn-primary" onClick={handleCta}>
                  {dialog.cta}
                </button>
              ) : (
                <a href={dialog.link} target="_blank" rel="noreferrer"
                  className="npc-btn npc-btn-primary" onClick={playClick}>
                  {dialog.cta}
                </a>
              )}
              <button className="npc-btn npc-btn-secondary" onClick={() => { playClick(); onClose(); }}>
                CLOSE
              </button>
            </>
          ) : (
            <button className="npc-btn npc-btn-secondary" onClick={() => { playClick(); onClose(); }}>
              CLOSE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CERTIFICATE SLIDESHOW COMPONENT ──────────────────────
function CertificateSlideshow({ images }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, 2000); // Change image every 2 seconds
    return () => clearInterval(interval);
  }, [images]);

  if (!images || images.length === 0 || !images[0]) {
    return <span>[Photo Placeholder]</span>;
  }

  return (
    <img
      src={images[currentIndex]}
      alt="Certificate"
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
}

// ─── ENTITY ZONE ────────────────────────────────────────
function EntityZone({ entity, isHovered, onEnter, onLeave, onClick }) {
  return (
    <div
      className="gr-entity-zone"
      style={{
        left: `${entity.x}%`,
        top: `${entity.y}%`,
        width: `${entity.width}%`,
        height: `${entity.height}%`,
      }}
      onMouseEnter={() => { onEnter(); playHover(); }}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <div
        className={`gr-glow-overlay ${isHovered ? 'gr-glow-overlay--active' : ''}`}
        style={{ '--glow': entity.glowColor }}
      />
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────
export default function GameRoomScreen({ onBack }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const shadowRef = useRef(null);
  const hintRef = useRef(null);
  const rafRef = useRef(null);
  const lastCooldown = useRef(0);
  const nearEntityRef = useRef(null);
  const keys = useRef({ w: false, a: false, s: false, d: false, arrowup: false, arrowdown: false, arrowleft: false, arrowright: false });

  const currentPos = useRef({ x: 50, y: 62 });
  const targetPos = useRef({ x: 50, y: 62 });
  const pendingEntity = useRef(null);

  const [activeDialog, setActiveDialog] = useState(null);
  const [computerSystemOpen, setComputerSystemOpen] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [activeDocument, setActiveDocument] = useState('privacy');
  const [hasSeenIntro, setHasSeenIntro] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [facingRight, setFacingRight] = useState(true);
  const [hoveredEntity, setHoveredEntity] = useState(null);
  const [showHint, setShowHint] = useState(false);

  // Auto-show intro after 600ms
  useEffect(() => {
    const t = setTimeout(() => {
      if (!hasSeenIntro) setActiveDialog(INTRO_DIALOG);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  // Control background music: ONLY active while in the 2D room; muted when booting up computer / WatchCraft
  useEffect(() => {
    if (computerSystemOpen) {
      pauseBgMusic();
    } else {
      resumeBgMusic();
    }
  }, [computerSystemOpen]);

  // Ensure music stops if leaving the 2D room
  useEffect(() => {
    resumeBgMusic();
    return () => {
      pauseBgMusic();
    };
  }, []);

  // Show movement hint 5s after intro closes
  const closeDialog = useCallback(() => {
    if (activeDialog?.id === 'intro') setHasSeenIntro(true);
    setActiveDialog(null);
    lastCooldown.current = Date.now();
    setTimeout(() => setShowHint(true), 300);
    setTimeout(() => setShowHint(false), 5000);
  }, [activeDialog]);

  // Keyboard — disabled when ComputerSystem overlay is open so typed input isn't swallowed
  useEffect(() => {
    const down = (e) => {
      // If an input/textarea is focused OR the computer overlay is open, let the event pass
      if (computerSystemOpen) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const k = e.key.toLowerCase();
      if (k in keys.current) { keys.current[k] = true; e.preventDefault(); }
      if (k === 'e' && nearEntityRef.current && !activeDialog) {
        const ent = nearEntityRef.current;
        targetPos.current = { ...ent.walkTarget };
        pendingEntity.current = ent;
      }
      if (k === 'escape' && activeDialog) closeDialog();
      if (k === 'escape' && documentViewerOpen) setDocumentViewerOpen(false);
    };
    const up = (e) => {
      if (computerSystemOpen) return;
      const k = e.key.toLowerCase();
      if (k in keys.current) keys.current[k] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [activeDialog, closeDialog, computerSystemOpen, documentViewerOpen]);

  // Player DOM transform
  const applyPlayerTransform = useCallback((pos) => {
    if (!playerRef.current) return;
    const zIndex = Math.floor(10 + pos.y * 0.5);
    const yOffset = Math.sin(Date.now() / 500) * 0.3;
    playerRef.current.style.left = `${pos.x}%`;
    playerRef.current.style.top = `${pos.y + yOffset}%`;
    playerRef.current.style.zIndex = zIndex;
    playerRef.current.style.transform = `translate(-50%, -100%) scaleX(${facingRight ? 1 : -1})`;
    if (shadowRef.current) {
      const sc = 0.6 + pos.y / 200;
      shadowRef.current.style.left = `${pos.x}%`;
      shadowRef.current.style.top = `${pos.y}%`;
      shadowRef.current.style.transform = `translate(-50%, -20%) scaleX(${sc}) scaleY(${sc * 0.4})`;
    }
    if (hintRef.current) {
      hintRef.current.style.left = `${pos.x}%`;
      hintRef.current.style.top = `${pos.y - 14}%`;
    }
  }, [facingRight]);

  // RAF loop
  useEffect(() => {
    const loop = () => {
      if (activeDialog || computerSystemOpen || documentViewerOpen) { rafRef.current = requestAnimationFrame(loop); return; }
      const cur = currentPos.current, tgt = targetPos.current, k = keys.current;
      let mx = 0, my = 0;
      if (k.w || k.arrowup) my -= 1;
      if (k.s || k.arrowdown) my += 1;
      if (k.a || k.arrowleft) mx -= 1;
      if (k.d || k.arrowright) mx += 1;

      if (mx !== 0 || my !== 0) {
        const mag = Math.sqrt(mx * mx + my * my);
        cur.x += (mx / mag) * WASD_SPEED; cur.y += (my / mag) * WASD_SPEED;
        tgt.x = cur.x; tgt.y = cur.y;
        pendingEntity.current = null;
        setIsMoving(true);
        if (Math.abs(mx) > 0) setFacingRight(mx > 0);
      } else {
        const dx = tgt.x - cur.x, dy = tgt.y - cur.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > ARRIVE_THRESHOLD) {
          cur.x += dx * LERP_SPEED; cur.y += dy * LERP_SPEED;
          setIsMoving(true);
          if (Math.abs(dx) > 0.05) setFacingRight(dx > 0);
        } else {
          cur.x = tgt.x; cur.y = tgt.y;
          setIsMoving(false);
          if (pendingEntity.current) {
            const ent = pendingEntity.current;
            pendingEntity.current = null;
            setActiveDialog(ent.npcDialog ? { ...ent.npcDialog, id: ent.id } : null);
            lastCooldown.current = Date.now();
          }
        }
      }

      cur.x = clamp(cur.x, FLOOR.minX, FLOOR.maxX);
      cur.y = clamp(cur.y, FLOOR.minY, FLOOR.maxY);
      tgt.x = clamp(tgt.x, FLOOR.minX, FLOOR.maxX);
      tgt.y = clamp(tgt.y, FLOOR.minY, FLOOR.maxY);

      // Proximity check
      let closest = null, closestD = Infinity;
      for (const ent of WORLD_ENTITIES) {
        const ec = { x: ent.x + ent.width / 2, y: ent.y + ent.height / 2 };
        const d = pctDist({ x: cur.x, y: cur.y }, ec);
        if (d < ent.interactionRadius && d < closestD) { closest = ent; closestD = d; }
      }
      if (hintRef.current) hintRef.current.style.opacity = closest ? '1' : '0';
      if (closest?.id !== nearEntityRef.current?.id) nearEntityRef.current = closest;

      applyPlayerTransform(cur);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [applyPlayerTransform, activeDialog, computerSystemOpen, documentViewerOpen]);

  // Click handler
  const handleWorldClick = useCallback((e) => {
    if (activeDialog) return;
    if (Date.now() - lastCooldown.current < COOLDOWN_MS) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * 100;
    const cy = ((e.clientY - rect.top) / rect.height) * 100;
    const hit = WORLD_ENTITIES.find(ent => checkAABB(cx, cy, ent));
    if (hit) {
      playClick();
      targetPos.current = { ...hit.walkTarget };
      pendingEntity.current = hit;
    } else {
      targetPos.current = { x: clamp(cx, FLOOR.minX, FLOOR.maxX), y: clamp(cy, FLOOR.minY, FLOOR.maxY) };
      pendingEntity.current = null;
    }
  }, [activeDialog]);

  return (
    <div className="gr-root">
      <button className="gr-back-btn" onClick={() => { playClick(); onBack(); }}>◀ BACK</button>
      <div className="gr-hud">
        <span className={`gr-hud-status ${isMoving ? 'gr-hud-moving' : ''}`}>
          {isMoving ? '▶ MOVING' : '⏸ IDLE'}
        </span>
      </div>
      {showHint && <div className="gr-hint">🖱️ CLICK or WASD · Press <strong>E</strong> near objects</div>}

      <div ref={containerRef} className="gr-room-container" onClick={handleWorldClick}>
        <img src={ROOM_BG} alt="Game Room" className="gr-room-bg" draggable={false} />
        <div className="gr-idle-overlay gr-idle-screen" />
        <div className="gr-idle-overlay gr-idle-lamp" />

        {WORLD_ENTITIES.map(entity => (
          <EntityZone key={entity.id} entity={entity}
            isHovered={hoveredEntity === entity.id}
            onEnter={() => setHoveredEntity(entity.id)}
            onLeave={() => setHoveredEntity(null)}
            onClick={(e) => { e.stopPropagation(); handleWorldClick(e); }}
          />
        ))}

        <div ref={shadowRef} className="gr-player-shadow" />
        <img ref={playerRef} src={PLAYER_IMG} alt="Player"
          className={`gr-player ${isMoving ? 'gr-player-walking' : 'gr-player-idle'}`}
          draggable={false} style={{ left: '50%', top: '62%' }} />

        {/* Proximity hint — positioned via DOM ref */}
        <div ref={hintRef} className="gr-proximity-hint" style={{ opacity: 0, left: '50%', top: '48%' }}>
          Press <kbd className="gr-kbd">E</kbd> to interact
        </div>

        {isMoving && (
          <div className="gr-walk-target"
            style={{ left: `${targetPos.current.x}%`, top: `${targetPos.current.y}%` }} />
        )}
      </div>

      {/* Wall Painting Hover Preview — ONLY the painting image shows up */}
      {hoveredEntity && WORLD_ENTITIES.find(e => e.id === hoveredEntity)?.type === 'painting' && (
        <div style={{
          position: 'absolute',
          bottom: '8%',
          left: WORLD_ENTITIES.find(e => e.id === hoveredEntity).x < 50 ? '75%' : '25%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          pointerEvents: 'none',
          filter: 'drop-shadow(0 16px 36px rgba(0, 0, 0, 0.9)) drop-shadow(0 2px 10px rgba(0, 0, 0, 0.7))',
          animation: 'watchly-fade-in 0.2s ease-out forwards',
        }}>
          <img
            src={WORLD_ENTITIES.find(e => e.id === hoveredEntity).images[0]}
            alt="Painting Preview"
            style={{
              width: 'clamp(300px, 35vw, 480px)',
              height: 'auto',
              display: 'block',
              imageRendering: 'auto',
            }}
          />
        </div>
      )}

      {/* NPC Dialog — rendered outside room container so it overlays everything */}
      {activeDialog && (
        <NpcDialog
          dialog={activeDialog}
          onClose={closeDialog}
          onAction={(action) => {
            if (action === 'openComputer') setComputerSystemOpen(true);
            if (action === 'openDocuments' || action === 'openResume') setDocumentViewerOpen(true);
          }}
        />
      )}

      {/* Computer System — full-screen overlay */}
      {computerSystemOpen && (
        <ComputerSystem onExit={() => {
          setComputerSystemOpen(false);
          lastCooldown.current = Date.now();
        }} />
      )}

      {/* Official Documents Overlay — Stacked Paper Style */}
      {documentViewerOpen && (
        <div className="rv-overlay" onClick={() => setDocumentViewerOpen(false)}>
          <div className="rv-header" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }} onClick={e => e.stopPropagation()}>
            <span className="rv-header-label">📄 Official Documents</span>
            <span className="rv-header-hint">Click the folded corner to swap</span>
            <button className="rv-close-btn" onClick={() => { playClick(); setDocumentViewerOpen(false); }}>✕ CLOSE</button>
          </div>

          <div className="paper-stack">

            {/* ================= PRIVACY POLICY ================= */}
            <PaperDocument
              title="WatchCraft Privacy Policy"
              subtitle="Effective Date: October 10, 2026 · Official Document"
              pdfUrl="/document/privcay_policy.pdf"
              isActive={activeDocument === 'privacy'}
              onFocus={() => { playClick(); setActiveDocument('privacy'); }}
              sections={[
                {
                  title: "1. Overview & Scope",
                  content: "Welcome to WatchCraft ('WatchCraft', 'we', 'our', or 'us'). This Privacy Policy explains how WatchCraft collects, uses, protects, and discloses personal data and operational information when you use our virtual theater rooms, real-time synchronized playback, and web services."
                },
                {
                  title: "2. Information We Collect",
                  items: [
                    {
                      label: "• Display Names & Session Identity",
                      text: "Temporary nicknames or guest display names you select to identify yourself in watch rooms and multiplayer chat."
                    },
                    {
                      label: "• Watch Room & Playback Sync State",
                      text: "Room IDs, timestamps, playback status (play/pause/seek), and video selections needed for real-time synchronization."
                    },
                    {
                      label: "• In-Room Chat & Interactions",
                      text: "Chat messages, commands, and interaction state sent in watch room sessions."
                    },
                    {
                      label: "• Technical Diagnostics",
                      text: "Basic connection logs, WebRTC/WebSocket signals, and device metrics required to maintain streaming stability."
                    }
                  ]
                },
                {
                  title: "3. How We Use Information",
                  content: "We use the collected information strictly for operating WatchCraft:",
                  items: [
                    {
                      label: "• Real-Time Video Sync",
                      text: "Synchronizing video selection, playback, pausing, and seeking among all room participants."
                    },
                    {
                      label: "• Room Chat Delivery",
                      text: "Delivering chat messages, reaction notifications, and room status updates."
                    },
                    {
                      label: "• Security & Permissions",
                      text: "Enforcing host controls, permissions, and preventing unauthorized disruptions."
                    },
                    {
                      label: "• System Reliability",
                      text: "Maintaining server uptime, diagnosing connection errors, and optimizing performance."
                    }
                  ]
                },
                {
                  title: "4. Public & Private Rooms",
                  content: "Public rooms may be displayed in public discovery listings and genre directories. Private rooms require room codes or direct links. Room participants can view shared playback actions and chat within that room."
                },
                {
                  title: "5. YouTube & Third-Party Services",
                  content: "WatchCraft enables video watching using YouTube's embedded player API. WatchCraft does not host the underlying video files. Your interactions with YouTube are governed by YouTube Terms of Service and Google Privacy Policy."
                },
                {
                  title: "6. Data Retention & Security",
                  content: "Active room state and transient in-memory chat exist only while a watch session is active or as dictated by room settings. We implement industry-standard safeguards to protect session data and never sell your personal information."
                },
                {
                  title: "7. Contact & Official Download",
                  content: "To download the complete signed PDF or contact us regarding legal inquiries, use the 'Download PDF' button above or email privacy@watchcraft.app."
                }
              ]}
            />

            {/* ================= TERMS OF SERVICE ================= */}
            <PaperDocument
              title="WatchCraft Terms of Service"
              subtitle="Effective Date: October 10, 2026 · Official Document"
              pdfUrl="/document/terms_of_service.pdf"
              isActive={activeDocument === 'terms'}
              onFocus={() => { playClick(); setActiveDocument('terms'); }}
              sections={[
                {
                  title: "1. Acceptance of Terms",
                  content: "By accessing WatchCraft, creating or joining watch party rooms, or interacting with our virtual rooms, you agree to be legally bound by these Terms of Service. If you do not agree, you must discontinue using the application."
                },
                {
                  title: "2. Description of the Service",
                  content: "WatchCraft is an interactive virtual watch-party platform providing:",
                  items: [
                    {
                      label: "• Watch Party Rooms",
                      text: "Creating and joining watch-party rooms via invitation links or room codes."
                    },
                    {
                      label: "• Synchronized Playback",
                      text: "Synchronized YouTube media controls including real-time play, pause, and timestamp seeking."
                    },
                    {
                      label: "• Virtual Environments",
                      text: "First-person 3D theater and 2D pixel spaces with avatar movement and media controls."
                    },
                    {
                      label: "• Chat & Participant Roles",
                      text: "Real-time room chat, Host and Moderator access controls, and genre-based public room discovery."
                    }
                  ]
                },
                {
                  title: "3. Acceptable Use Policy",
                  content: "You agree to use WatchCraft lawfully and respectfully. You agree NOT to:",
                  items: [
                    {
                      label: "• Harassment & Abuse",
                      text: "Harass, threaten, intimidate, impersonate, or abuse other users."
                    },
                    {
                      label: "• Unlawful Material",
                      text: "Share illegal, infringing, hateful, malicious, or sexually explicit content."
                    },
                    {
                      label: "• Unauthorized Access",
                      text: "Exploit vulnerabilities, manipulate room codes without permission, or disrupt synchronization."
                    },
                    {
                      label: "• Automated Abuse",
                      text: "Spam public rooms or distribute malware, bots, or deceptive links."
                    }
                  ]
                },
                {
                  title: "4. Host Roles & Responsibilities",
                  content: "The room creator acts as Host. The Host is responsible for managing room access, setting playback permissions, and moderating participant chat."
                },
                {
                  title: "5. YouTube & Third-Party Content",
                  content: "WatchCraft allows users to select and play videos via YouTube embedded players. All copyrights and licensing remain subject to YouTube Terms of Service and content owners."
                },
                {
                  title: "6. Limitation of Liability & Disclaimers",
                  content: "WatchCraft is provided on an 'AS IS' and 'AS AVAILABLE' basis without warranty of any kind. We are not liable for third-party streaming outages, network latency, or user-submitted messages."
                },
                {
                  title: "7. Grievances & Contact",
                  content: "We may update these terms periodically. For questions or grievances, contact us at support@watchcraft.app or download the complete official PDF."
                }
              ]}
            />

          </div>
        </div>
      )}
    </div>
  );
}
