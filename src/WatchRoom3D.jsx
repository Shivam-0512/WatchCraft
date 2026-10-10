// ─── WatchRoom3D.jsx ─────────────────────────────────────────────────────
// Integrates the "my-room-in-3d" Three.js scene into Watchly as a
// first-person seated viewer experience. Vanilla Three.js is managed
// inside a React useEffect lifecycle so it starts / tears down cleanly.
//
// Camera: seated first-person view at eye height facing the TV/monitors.
// Look: drag with mouse L-button → ±90° horizontal, ±20° vertical.
// Reset: "🎯 Reset View" button returns to initial TV-facing direction.

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheck, 
  faLink, 
  faRotateLeft, 
  faArrowRightFromBracket, 
  faUsers, 
  faCrown, 
  faShieldHalved, 
  faEllipsisVertical, 
  faUserXmark, 
  faHand, 
  faPaperPlane, 
  faCircle, 
  faChevronDown, 
  faFaceSmile, 
  faPlus,
  faExpand,
  faCompress,
  faFilm,
  faPlay,
  faPause,
  faVolumeHigh,
  faVolumeXmark
} from '@fortawesome/free-solid-svg-icons';
import { getSocket, getPersistentUserId } from './socket';
import { playClick } from './sounds';

// ── Camera constants ──────────────────────────────────────────────────────
// Seated position inside the room on sofa facing the TV
const CAM_POS    = new THREE.Vector3(-0.5, 1.8, 1.63);
const CAM_TARGET = new THREE.Vector3(4.2,  2.5, 1.63);

const YAW_RANGE  = Math.PI / 2;  // ±90° each side → 180° total
const PITCH_MAX  = 0.35;
const PITCH_MIN  = -0.35;
const SENSITIVITY = 0.003;
const LERP       = 0.12;

const EMOJIS = ['❤️','😂','😮','👏','🔥','💯','😭','🎉'];

function extractYouTubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const v = parsed.searchParams.get('v');
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    const parts = parsed.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^[a-zA-Z0-9_-]{11}$/.test(last)) return last;
  } catch (e) {}
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

function loadYTApi() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    let resolved = false;
    const check = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(check);
        if (!resolved) {
          resolved = true;
          resolve(window.YT);
        }
      }
    }, 50);

    if (!window._ytApiLoading) {
      window._ytApiLoading = true;
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      const prevCb = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCb === 'function') prevCb();
        clearInterval(check);
        if (!resolved) {
          resolved = true;
          resolve(window.YT);
        }
      };
    }
  });
}

function fmtDuration(seconds = 0) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const remSec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remMin = m % 60;
    return `${h}:${pad(remMin)}:${pad(remSec)}`;
  }
  return `${pad(m)}:${pad(remSec)}`;
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return isNaN(d) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getAvatarBg(name = '') {
  const colors = [
    'linear-gradient(135deg, #6366f1, #4f46e5)',
    'linear-gradient(135deg, #0ea5e9, #0284c7)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ec4899, #db2777)',
    'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    'linear-gradient(135deg, #14b8a6, #0d9488)',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

function getInitials(name = '') {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return (parts[0].slice(0, 2) || '?').toUpperCase();
  }
  return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────
export default function WatchRoom3D({
  roomId = 'ROOM',
  username = 'Player',
  role: initialRole = 'host',
  userId: initialUserId = '',
  participants: initParts = [],
  roomName = 'Watch Party',
  videoState: initialVideoState = {},
  onExit,
}) {
  const socket = getSocket();
  const myUserId = initialUserId || getPersistentUserId();

  // DOM refs
  const mountRef     = useRef(null);
  const containerRef = useRef(null);
  const [tvReady, setTvReady] = useState(false);
  const rafRef       = useRef(null);

  // Camera look state (mutable ref for perf — no re-render needed)
  const look = useRef({
    yawCenter: 0, yaw: 0, pitch: 0,
    targetYaw: 0, targetPitch: 0,
    dragging: false, prevX: 0, prevY: 0,
  });

  // UI state
  const [loading,            setLoading]            = useState(true);
  const [progress,           setProgress]           = useState(0);
  const [loadErr,            setLoadErr]            = useState('');
  const [participants,       setParticipants]       = useState(initParts);
  const [myRole,             setMyRole]             = useState(initialRole);
  const [messages,           setMessages]           = useState([]);

  // YouTube & Authoritative Video Playback state
  const [videoId,            setVideoId]            = useState(initialVideoState.videoId || '');
  const [playState,          setPlayState]          = useState(initialVideoState.playState || 'paused');
  const [currentTime,        setCurrentTime]        = useState(initialVideoState.currentTime || 0);
  const [duration,           setDuration]           = useState(0);
  const [volume,             setVolume]             = useState(100);
  const [isMuted,            setIsMuted]            = useState(false);
  const [addVideoOpen,       setAddVideoOpen]       = useState(false);
  const [videoUrlInput,      setVideoUrlInput]      = useState('');
  const [videoLoading,       setVideoLoading]       = useState(false);
  const [videoError,         setVideoError]         = useState('');
  const [isFullscreen,       setIsFullscreen]       = useState(false);

  const ytPlayerRef       = useRef(null);
  const isSyncingRef      = useRef(false);
  const currentVideoIdRef = useRef(initialVideoState.videoId || '');
  const currentTimeRef    = useRef(initialVideoState.currentTime || 0);
  const isFullscreenRef   = useRef(false);
  const lastLocalTimeRef  = useRef(0);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    setMyRole(initialRole);
  }, [initialRole]);
  const [chatInput,          setChatInput]          = useState('');
  const [reactions,          setReactions]          = useState([]);
  const [ctrlReqs,           setCtrlReqs]           = useState([]);
  const [copied,             setCopied]             = useState(false);
  const [kicked,             setKicked]             = useState('');
  const [emojiOpen,          setEmojiOpen]          = useState(false);
  const [selectedUserAction, setSelectedUserAction] = useState(null);
  const [hasUnreadBelow,     setHasUnreadBelow]     = useState(false);

  const chatEndRef          = useRef(null);
  const chatScrollRef       = useRef(null);
  const isUserAtBottomRef   = useRef(true);
  const addVideoInputRef    = useRef(null);

  const canControl = myRole === 'host' || myRole === 'moderator';
  const canControlRef = useRef(canControl);
  useEffect(() => { canControlRef.current = canControl; }, [canControl]);
  const playStateRef = useRef(playState);
  useEffect(() => { playStateRef.current = playState; }, [playState]);

  // Auto-focus the Add Video input when popup opens
  useEffect(() => {
    if (addVideoOpen) {
      const timer = setTimeout(() => {
        addVideoInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [addVideoOpen]);

  // ── Three.js lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x010101);
    Object.assign(renderer.domElement.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
    });
    el.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    // Camera
    const camera = new THREE.PerspectiveCamera(65, el.clientWidth / el.clientHeight, 0.05, 200);
    camera.position.copy(CAM_POS);
    scene.add(camera);

    const baseYaw = Math.atan2(CAM_TARGET.z - CAM_POS.z, CAM_TARGET.x - CAM_POS.x);

    // Load assets
    const mgr = new THREE.LoadingManager(
      () => {
        setLoading(false);
      },
      (_, l, t) => setProgress(Math.round((l / t) * 100)),
      (u) => { setLoadErr(`Failed: ${u}`); setLoading(false); },
    );

    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/gltf/');
    const gltf  = new GLTFLoader(mgr);
    gltf.setDRACOLoader(draco);
    const tex   = new THREE.TextureLoader(mgr);

    const base = '/room3d/';
    const dayTex     = tex.load(`${base}bakedDay.jpg`);
    const nightTex   = tex.load(`${base}bakedNight.jpg`);
    const neutralTex = tex.load(`${base}bakedNeutral.jpg`);
    const lmapTex    = tex.load(`${base}lightMap.jpg`);
    [dayTex, nightTex, neutralTex, lmapTex].forEach(t => { t.flipY = false; });
    dayTex.colorSpace     = THREE.SRGBColorSpace;
    nightTex.colorSpace   = THREE.SRGBColorSpace;
    neutralTex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uBakedDayTexture:     { value: dayTex },
        uBakedNightTexture:   { value: nightTex },
        uBakedNeutralTexture: { value: neutralTex },
        uLightMapTexture:     { value: lmapTex },
        uNightMix:            { value: 0.8 },
        uNeutralMix:          { value: 0.0 },
        uLightTvColor:        { value: new THREE.Color('#ff115e') },
        uLightTvStrength:     { value: 1.47 },
        uLightDeskColor:      { value: new THREE.Color('#ff6700') },
        uLightDeskStrength:   { value: 1.9 },
        uLightPcColor:        { value: new THREE.Color('#0082ff') },
        uLightPcStrength:     { value: 1.4 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uBakedDayTexture;
        uniform sampler2D uBakedNightTexture;
        uniform sampler2D uBakedNeutralTexture;
        uniform sampler2D uLightMapTexture;
        uniform float uNightMix;
        uniform float uNeutralMix;
        uniform vec3 uLightTvColor;
        uniform float uLightTvStrength;
        uniform vec3 uLightDeskColor;
        uniform float uLightDeskStrength;
        uniform vec3 uLightPcColor;
        uniform float uLightPcStrength;
        varying vec2 vUv;

        vec3 blendLighten(vec3 base, vec3 blend, float opacity) {
          return (max(blend, base) * opacity + base * (1.0 - opacity));
        }

        void main() {
          vec3 d = texture2D(uBakedDayTexture, vUv).rgb;
          vec3 n = texture2D(uBakedNightTexture, vUv).rgb;
          vec3 neu = texture2D(uBakedNeutralTexture, vUv).rgb;
          vec3 c = mix(mix(d, n, uNightMix), neu, uNeutralMix);
          vec3 l = texture2D(uLightMapTexture, vUv).rgb;

          c = blendLighten(c, uLightTvColor, l.r * uLightTvStrength);
          c = blendLighten(c, uLightPcColor, l.b * uLightPcStrength);
          c = blendLighten(c, uLightDeskColor, l.g * uLightDeskStrength);

          gl_FragColor = vec4(c, 1.0);
        }
      `
    });

    // 1. Room Model
    gltf.load(`${base}roomModel.glb`, (g) => {
      g.scene.traverse(ch => { if (ch.isMesh) ch.material = mat; });
      scene.add(g.scene);
    });

    // 2. Desk Chair
    gltf.load(`${base}topChairModel.glb`, (g) => {
      g.scene.traverse(ch => { if (ch.isMesh) ch.material = mat; });
      scene.add(g.scene);
    });

    // 3. Main Television screen (facing the sofa) - Pure black background filling inner screen
    const tvGroup = new THREE.Group();
    tvGroup.position.set(4.210, 2.6654, 1.8214);
    const tvGeo = new THREE.PlaneGeometry(4.218, 2.372);
    tvGeo.rotateY(-Math.PI * 0.5);
    const tvMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const tvMesh = new THREE.Mesh(tvGeo, tvMat);
    tvGroup.add(tvMesh);
    scene.add(tvGroup);

    // CSS3D Renderer for 3D Television Screen
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(el.clientWidth, el.clientHeight);
    Object.assign(cssRenderer.domElement.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '20',
      opacity: '1',
      transition: 'opacity 0.35s ease',
    });
    el.appendChild(cssRenderer.domElement);

    const cssScene = new THREE.Scene();

    // Scale factor converting 3D room meters to CSS3D pixel space:
    // (4.218 * CSS_SCALE) / 1280 = 1.0.
    // This normalizes tvCssObj scale to ~1.0 (matrix determinant ~1.0 instead of 0.0000108),
    // which allows Chromium's TransformationMatrix::IsInvertible() to pass and hit-test
    // mouse clicks into the TV input, buttons, and form with full precision!
    const CSS_SCALE = 1280 / 4.218; // ~303.461356

    const cssCamera = new THREE.PerspectiveCamera(65, el.clientWidth / el.clientHeight, 0.05 * CSS_SCALE, 200 * CSS_SCALE);
    cssScene.add(cssCamera);

    const tvEl = document.createElement('div');
    tvEl.className = 'wr3d-css3d-tv';
    tvEl.style.width = '1280px';
    tvEl.style.height = '720px';
    tvEl.style.position = 'relative';
    tvEl.style.overflow = 'hidden';
    tvEl.style.background = '#000000';
    tvEl.style.pointerEvents = 'none';

    // Native YouTube player container (completely unmanaged by React VDOM reconciliation to prevent iframe destruction)
    const ytContainer = document.createElement('div');
    ytContainer.id = 'wr3d-yt-player-container';
    ytContainer.className = 'wr3d-yt-player-container';
    ytContainer.style.position = 'absolute';
    ytContainer.style.top = '0';
    ytContainer.style.left = '0';
    ytContainer.style.width = '1280px';
    ytContainer.style.height = '720px';
    ytContainer.style.background = '#000000';
    ytContainer.style.overflow = 'hidden';
    ytContainer.style.display = 'none';

    // Native YouTube player iframe with explicit production permissions (matching watchparty reference pattern)
    const ytIframe = document.createElement('iframe');
    ytIframe.id = 'wr3d-yt-player';
    ytIframe.title = 'WatchCraft YouTube TV';
    ytIframe.style.position = 'absolute';
    ytIframe.style.top = '0';
    ytIframe.style.left = '0';
    ytIframe.style.width = '1280px';
    ytIframe.style.height = '720px';
    ytIframe.style.border = '0';
    ytIframe.style.display = 'block';
    ytIframe.style.background = '#000000';
    ytIframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    ytIframe.setAttribute('allowfullscreen', 'true');
    ytIframe.setAttribute('frameborder', '0');
    ytIframe.src = `https://www.youtube.com/embed/?enablejsapi=1&autoplay=1&controls=0&rel=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`;
    ytContainer.appendChild(ytIframe);

    const standbyEl = document.createElement('div');
    standbyEl.id = 'wr3d-tv-standby';
    standbyEl.className = 'wr3d-tv-standby';
    standbyEl.style.width = '1280px';
    standbyEl.style.height = '720px';
    standbyEl.innerHTML = `
      <div class="wr3d-tv-standby-text">WATCHCRAFT THEATER</div>
      <div class="wr3d-tv-standby-sub">Use the Add Video button to start watching</div>
    `;

    tvEl.appendChild(ytContainer);
    tvEl.appendChild(standbyEl);

    const tvCssObj = new CSS3DObject(tvEl);
    // Anchor precisely to TV's inner screen plane scaled into CSS3D space
    tvCssObj.position.set(4.208 * CSS_SCALE, 2.6654 * CSS_SCALE, 1.8214 * CSS_SCALE);
    tvCssObj.rotation.y = -Math.PI * 0.5;
    tvCssObj.scale.set((4.218 * CSS_SCALE) / 1280, (2.372 * CSS_SCALE) / 720, (4.218 * CSS_SCALE) / 1280);
    cssScene.add(tvCssObj);

    setTvReady(true);


    // 4. PC & Mac screens with looping video
    const pcVid = document.createElement('video');
    pcVid.src = `${base}videoPortfolio.mp4`;
    pcVid.muted = true;
    pcVid.defaultMuted = true;
    pcVid.loop = true;
    pcVid.playsInline = true;
    pcVid.crossOrigin = 'anonymous';
    pcVid.onerror = () => {};
    pcVid.play().catch(() => {});
    const pcTex = new THREE.VideoTexture(pcVid);
    pcTex.colorSpace = THREE.SRGBColorSpace;
    gltf.load(`${base}pcScreenModel.glb`, (g) => {
      g.scene.traverse(ch => { if (ch.isMesh) ch.material = new THREE.MeshBasicMaterial({ map: pcTex }); });
      scene.add(g.scene);
    });

    const macVid = document.createElement('video');
    macVid.src = `${base}videoStream.mp4`;
    macVid.muted = true;
    macVid.defaultMuted = true;
    macVid.loop = true;
    macVid.playsInline = true;
    macVid.crossOrigin = 'anonymous';
    macVid.onerror = () => {};
    macVid.play().catch(() => {});
    const macTex = new THREE.VideoTexture(macVid);
    macTex.colorSpace = THREE.SRGBColorSpace;
    gltf.load(`${base}macScreenModel.glb`, (g) => {
      g.scene.traverse(ch => { if (ch.isMesh) ch.material = new THREE.MeshBasicMaterial({ map: macTex }); });
      scene.add(g.scene);
    });

    // Center coordinates for camera-facing angle check
    const tvCenter = new THREE.Vector3(4.208, 2.6654, 1.8214);

    // Animate
    let live = true;
    const tick = () => {
      if (!live) return;
      rafRef.current = requestAnimationFrame(tick);
      const lk = look.current;
      lk.yaw   = THREE.MathUtils.lerp(lk.yaw,   lk.targetYaw,   LERP);
      lk.pitch = THREE.MathUtils.lerp(lk.pitch, lk.targetPitch, LERP);

      // Smooth camera zoom for fullscreen (52 deg when fullscreen, 65 deg normal)
      const targetFov = isFullscreenRef.current ? 52 : 65;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.08);
        camera.updateProjectionMatrix();
      }

      const totalYaw = baseYaw + lk.yaw;
      const dirX = Math.cos(totalYaw) * Math.cos(lk.pitch);
      const dirY = Math.sin(lk.pitch);
      const dirZ = Math.sin(totalYaw) * Math.cos(lk.pitch);

      camera.lookAt(CAM_POS.x + dirX, CAM_POS.y + dirY, CAM_POS.z + dirZ);
      renderer.render(scene, camera);

      // Camera-facing visibility check (hide CSS3D element when looking completely away)
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      const toTv = tvCenter.clone().sub(camera.position).normalize();
      const dot = camDir.dot(toTv);
      tvCssObj.visible = dot > -0.2;

      // Render CSS3D scene synchronized with camera (stuck directly to 3D TV plane)
      cssCamera.fov = camera.fov;
      cssCamera.aspect = camera.aspect;
      cssCamera.position.copy(camera.position).multiplyScalar(CSS_SCALE);
      cssCamera.quaternion.copy(camera.quaternion);
      cssCamera.updateProjectionMatrix();
      cssRenderer.render(cssScene, cssCamera);
    };
    tick();

    // Resize
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      cssCamera.aspect = w / h;
      cssCamera.updateProjectionMatrix();
      renderer.setSize(w, h);
      cssRenderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Mouse drag
    const down = e => {
      if (e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest('.wr3d-side-panel, .wr3d-floating-controls, .wr3d-bottom-left-controls, .wr3d-playback-bar, input, button, textarea, form, a')) return;
      const lk = look.current;
      lk.dragging = true; lk.prevX = e.clientX; lk.prevY = e.clientY;
      renderer.domElement.style.cursor = 'grabbing';
      cssRenderer.domElement.style.cursor = 'grabbing';
    };
    const move = e => {
      const lk = look.current;
      if (!lk.dragging) return;
      const dx = e.clientX - lk.prevX, dy = e.clientY - lk.prevY;
      lk.prevX = e.clientX; lk.prevY = e.clientY;
      lk.targetYaw   = Math.max(-YAW_RANGE, Math.min(YAW_RANGE,  lk.targetYaw   - dx * SENSITIVITY));
      lk.targetPitch = Math.max(PITCH_MIN,  Math.min(PITCH_MAX,   lk.targetPitch - dy * SENSITIVITY));
    };
    const up = () => {
      look.current.dragging = false;
      renderer.domElement.style.cursor = 'grab';
      cssRenderer.domElement.style.cursor = 'grab';
    };
    const ctx = e => e.preventDefault();

    // Touch
    const tdown = e => {
      if (e.touches.length !== 1) return;
      if (e.target && e.target.closest && e.target.closest('.wr3d-side-panel, .wr3d-floating-controls, .wr3d-bottom-left-controls, .wr3d-playback-bar, input, button, textarea, form, a')) return;
      const lk = look.current;
      lk.dragging = true; lk.prevX = e.touches[0].clientX; lk.prevY = e.touches[0].clientY;
    };
    const tmove = e => {
      const lk = look.current;
      if (!lk.dragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lk.prevX, dy = e.touches[0].clientY - lk.prevY;
      lk.prevX = e.touches[0].clientX; lk.prevY = e.touches[0].clientY;
      lk.targetYaw   = Math.max(-YAW_RANGE, Math.min(YAW_RANGE,  lk.targetYaw   - dx * SENSITIVITY));
      lk.targetPitch = Math.max(PITCH_MIN,  Math.min(PITCH_MAX,   lk.targetPitch - dy * SENSITIVITY));
    };
    const tend = () => { look.current.dragging = false; };

    renderer.domElement.style.cursor = 'grab';
    cssRenderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('mousedown', down);
    renderer.domElement.addEventListener('contextmenu', ctx);
    renderer.domElement.addEventListener('touchstart', tdown, { passive: true });
    cssRenderer.domElement.addEventListener('mousedown', down);
    cssRenderer.domElement.addEventListener('contextmenu', ctx);
    cssRenderer.domElement.addEventListener('touchstart', tdown, { passive: true });
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup',   up);
    window.addEventListener('touchmove', tmove, { passive: true });
    window.addEventListener('touchend',  tend);

    return () => {
      live = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize',    onResize);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup',   up);
      window.removeEventListener('touchmove', tmove);
      window.removeEventListener('touchend',  tend);
      renderer.domElement.removeEventListener('mousedown',   down);
      renderer.domElement.removeEventListener('contextmenu', ctx);
      renderer.domElement.removeEventListener('touchstart',  tdown);
      cssRenderer.domElement.removeEventListener('mousedown',   down);
      cssRenderer.domElement.removeEventListener('contextmenu', ctx);
      cssRenderer.domElement.removeEventListener('touchstart',  tdown);
      scene.traverse(o => {
        if (o.isMesh) {
          o.geometry?.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m?.dispose());
        }
      });
      pcVid.pause();
      macVid.pause();
      [dayTex, nightTex, neutralTex, lmapTex, pcTex, macTex, mat].forEach(r => r?.dispose?.());
      renderer.renderLists.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      if (el.contains(cssRenderer.domElement)) el.removeChild(cssRenderer.domElement);
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try { ytPlayerRef.current.destroy(); } catch (e) {}
        ytPlayerRef.current = null;
      }
      setTvReady(false);
    };
  }, []);

  const resetView = useCallback(() => {
    look.current.targetYaw = 0;
    look.current.targetPitch = 0;
  }, []);

  // ── YouTube Player Lifecycle ──────────────────────────────────────────
  useEffect(() => {
    if (!tvReady) return;
    const ytContainer = document.getElementById('wr3d-yt-player-container');
    const standbyEl = document.getElementById('wr3d-tv-standby');

    if (!videoId) {
      if (ytContainer) ytContainer.style.display = 'none';
      if (standbyEl) standbyEl.style.display = 'flex';
      if (ytPlayerRef.current && typeof ytPlayerRef.current.stopVideo === 'function') {
        try { ytPlayerRef.current.stopVideo(); } catch (e) {}
      }
      return;
    }

    if (ytContainer) ytContainer.style.display = 'block';
    if (standbyEl) standbyEl.style.display = 'none';

    // If player already exists, load the new video without re-creating iframe or resetting player
    if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
      if (currentVideoIdRef.current !== videoId) {
        currentVideoIdRef.current = videoId;
        try {
          isSyncingRef.current = true;
          ytPlayerRef.current.loadVideoById({
            videoId,
            startSeconds: currentTimeRef.current || 0,
          });
          setTimeout(() => { isSyncingRef.current = false; }, 600);
        } catch (err) {
          console.error('Error loading video into player:', err);
        }
      }
      return;
    }

    currentVideoIdRef.current = videoId;
    let isMounted = true;
    loadYTApi().then(YT => {
      if (!isMounted) return;
      if (!document.getElementById('wr3d-yt-player')) return;

      // Initialize YouTube Iframe API Player on the pre-existing iframe with production origin
      try {
        ytPlayerRef.current = new YT.Player('wr3d-yt-player', {
          events: {
            onReady: (event) => {
              const player = event.target;
              const dur = player.getDuration?.() || 0;
              if (dur > 0) setDuration(dur);
              const targetVid = currentVideoIdRef.current;
              if (targetVid) {
                isSyncingRef.current = true;
                player.loadVideoById({
                  videoId: targetVid,
                  startSeconds: currentTimeRef.current || 0,
                });
                if (playStateRef.current === 'playing') {
                  player.playVideo();
                } else {
                  player.pauseVideo();
                }
                setTimeout(() => { isSyncingRef.current = false; }, 600);
              }
            },
            onStateChange: (event) => {
              if (isSyncingRef.current) return;
              const state = event.data;
              if (state === YT.PlayerState.PLAYING) {
                if (canControlRef.current) {
                  setPlayState('playing');
                  const t = ytPlayerRef.current?.getCurrentTime?.() || currentTimeRef.current;
                  socket.emit('play', { time: t });
                } else {
                  // Participant attempted to start playback without permission
                  if (playStateRef.current === 'paused') {
                    isSyncingRef.current = true;
                    ytPlayerRef.current?.pauseVideo();
                    setTimeout(() => { isSyncingRef.current = false; }, 400);
                  }
                }
              } else if (state === YT.PlayerState.PAUSED) {
                if (canControlRef.current) {
                  setPlayState('paused');
                  const t = ytPlayerRef.current?.getCurrentTime?.() || currentTimeRef.current;
                  socket.emit('pause', { time: t });
                } else {
                  // Participant attempted to pause playback without permission
                  if (playStateRef.current === 'playing') {
                    isSyncingRef.current = true;
                    ytPlayerRef.current?.playVideo();
                    setTimeout(() => { isSyncingRef.current = false; }, 400);
                  }
                }
              } else if (state === YT.PlayerState.ENDED) {
                if (canControlRef.current) {
                  setPlayState('paused');
                  const t = ytPlayerRef.current?.getCurrentTime?.() || currentTimeRef.current;
                  socket.emit('pause', { time: t });
                }
              }
            },
            onError: (event) => {
              console.error('YouTube Player Error:', event.data);
              const errCodes = {
                2: 'Invalid video parameter.',
                5: 'HTML5 player error.',
                100: 'Video not found or removed.',
                101: 'Video cannot be embedded in external sites.',
                150: 'Video cannot be embedded in external sites.',
              };
              setVideoError(errCodes[event.data] || 'Error loading video.');
              setVideoLoading(false);
            },
          },
        });
      } catch (err) {
        console.error('Failed to create YT.Player:', err);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [videoId, tvReady]);

  // ── Non-Destructive Play/Pause Synchronization (Freezes and resumes exactly at timestamp) ──
  useEffect(() => {
    if (!ytPlayerRef.current || isSyncingRef.current) return;
    try {
      const curState = ytPlayerRef.current.getPlayerState?.();
      if (playState === 'playing' && curState !== 1) {
        isSyncingRef.current = true;
        ytPlayerRef.current.playVideo();
        setTimeout(() => { isSyncingRef.current = false; }, 400);
      } else if (playState === 'paused' && curState !== 2) {
        isSyncingRef.current = true;
        ytPlayerRef.current.pauseVideo();
        setTimeout(() => { isSyncingRef.current = false; }, 400);
      }
    } catch (e) {}
  }, [playState]);

  // ── Periodic Current Time Ticker & Sync Guard ─────────────────────────
  useEffect(() => {
    if (!videoId) return;
    const interval = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const cur = ytPlayerRef.current.getCurrentTime() || 0;
          const prev = lastLocalTimeRef.current;
          lastLocalTimeRef.current = cur;
          setCurrentTime(cur);

          const dur = ytPlayerRef.current.getDuration?.() || 0;
          if (dur > 0) setDuration(dur);

          // Detect Host/Moderator native scrubber seek
          if (canControlRef.current && !isSyncingRef.current && prev > 0) {
            const delta = Math.abs(cur - (prev + 0.5));
            if (delta > 2.0) {
              socket.emit('seek', { time: cur });
            }
          } else if (!canControlRef.current && !isSyncingRef.current) {
            // Re-sync participant if they paused/played locally
            const actualState = ytPlayerRef.current.getPlayerState?.();
            if (playStateRef.current === 'playing' && actualState === 2) {
              isSyncingRef.current = true;
              ytPlayerRef.current.playVideo();
              setTimeout(() => { isSyncingRef.current = false; }, 400);
            } else if (playStateRef.current === 'paused' && actualState === 1) {
              isSyncingRef.current = true;
              ytPlayerRef.current.pauseVideo();
              setTimeout(() => { isSyncingRef.current = false; }, 400);
            }
          }
        } catch (e) {}
      }
    }, 500);
    return () => clearInterval(interval);
  }, [videoId, socket]);

  // ── Periodic time heartbeat: keep backend currentTime accurate during playback ──
  useEffect(() => {
    if (!videoId) return;
    const hb = setInterval(() => {
      if (
        canControlRef.current &&
        playStateRef.current === 'playing' &&
        ytPlayerRef.current &&
        typeof ytPlayerRef.current.getCurrentTime === 'function'
      ) {
        try {
          const t = ytPlayerRef.current.getCurrentTime() || 0;
          if (t > 0) socket.emit('seek', { time: t });
        } catch (_) {}
      }
    }, 5000);
    return () => clearInterval(hb);
  }, [videoId, socket]);

  // ── Fullscreen API (Local display preference only) ─────────────────────
  const toggleFullscreen = useCallback(async () => {
    playClick();
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error('Fullscreen request error:', err);
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      isFullscreenRef.current = active;
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ── WebSocket events ─────────────────────────────────────────────────
  useEffect(() => {
    const onJoin  = ({ participants: p, username: u, userId, socketId, role }) => {
      if (p) setParticipants(p);
      if (userId === socket.id || userId === myUserId || socketId === socket.id || (u && u.toLowerCase() === username.toLowerCase())) {
        if (role) setMyRole(role);
      }
      setMessages(m => [...m, { isSystem: true, text: `${u} joined!`, timestamp: Date.now() }]);
    };
    const onLeft  = ({ participants: p, username: u }) => {
      if (p) {
        setParticipants(p);
        const me = p.find(x => x.userId === myUserId || x.socketId === socket.id || (x.username && x.username.toLowerCase() === username.toLowerCase()));
        if (me && me.role) setMyRole(me.role);
      }
      if (u) setMessages(m => [...m, { isSystem: true, text: `${u} left.`, timestamp: Date.now() }]);
    };
    const onRole  = ({ userId, socketId, role, username: u, participants: p }) => {
      if (p) {
        setParticipants(p);
        const me = p.find(x => x.userId === myUserId || x.socketId === socket.id || (x.username && x.username.toLowerCase() === username.toLowerCase()));
        if (me && me.role) setMyRole(me.role);
      }
      if (userId === socket.id || userId === myUserId || socketId === socket.id || (u && u.toLowerCase() === username.toLowerCase())) {
        if (role) setMyRole(role);
      }
    };
    const onSync  = (state) => {
      if (!state) return;
      if (state.role) setMyRole(state.role);

      // 1. Authoritative Video ID synchronization
      if (state.videoId !== undefined && state.videoId !== currentVideoIdRef.current) {
        currentVideoIdRef.current = state.videoId;
        setVideoId(state.videoId);
        setAddVideoOpen(false);
        setVideoLoading(false);
        setVideoError('');
      }

      // 2. Play / Pause state synchronization
      if (state.playState && state.playState !== playStateRef.current) {
        setPlayState(state.playState);
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getPlayerState === 'function') {
          try {
            isSyncingRef.current = true;
            if (state.playState === 'playing') {
              ytPlayerRef.current.playVideo();
            } else {
              ytPlayerRef.current.pauseVideo();
            }
            setTimeout(() => { isSyncingRef.current = false; }, 500);
          } catch (e) {}
        }
      }

      // 3. Seek synchronization — always apply if drift > 0.8s (tight for join-sync accuracy)
      if (state.currentTime !== undefined && state.currentTime >= 0) {
        currentTimeRef.current = state.currentTime;
        setCurrentTime(state.currentTime);
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const cur = ytPlayerRef.current.getCurrentTime() || 0;
            if (Math.abs(cur - state.currentTime) > 0.8) {
              isSyncingRef.current = true;
              ytPlayerRef.current.seekTo(state.currentTime, true);
              setTimeout(() => { isSyncingRef.current = false; }, 500);
            }
          } catch (e) {}
        }
      }
    };
    const onRemove = ({ participants: p }) => { if (p) setParticipants(p); };
    const onKick   = ({ message }) => setKicked(message || 'Removed from room.');
    const onChat   = (msg) => setMessages(m => [...m.slice(-199), msg]);
    const onReact  = ({ username: u, emoji }) => {
      const id = Date.now() + Math.random();
      setReactions(r => [...r, { id, username: u, emoji }]);
      setTimeout(() => setReactions(r => r.filter(x => x.id !== id)), 3000);
    };
    const onCtrl   = ({ userId, username: u }) =>
      setCtrlReqs(r => [...r, { userId, username: u }]);

    socket.on('user_joined',         onJoin);
    socket.on('user_left',           onLeft);
    socket.on('role_assigned',       onRole);
    socket.on('sync_state',          onSync);
    socket.on('participant_removed', onRemove);
    socket.on('kicked',              onKick);
    socket.on('chat_message',        onChat);
    socket.on('reaction',            onReact);
    socket.on('control_requested',   onCtrl);
    return () => {
      socket.off('user_joined',         onJoin);
      socket.off('user_left',           onLeft);
      socket.off('role_assigned',       onRole);
      socket.off('sync_state',          onSync);
      socket.off('participant_removed', onRemove);
      socket.off('kicked',              onKick);
      socket.off('chat_message',        onChat);
      socket.off('reaction',            onReact);
      socket.off('control_requested',   onCtrl);
    };
  }, [socket, myUserId, username, playState]);

  const scrollToBottom = useCallback((smooth = true) => {
    chatEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    setHasUnreadBelow(false);
    isUserAtBottomRef.current = true;
  }, []);

  const handleChatScroll = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    isUserAtBottomRef.current = isBottom;
    if (isBottom) {
      setHasUnreadBelow(false);
    }
  };

  useEffect(() => {
    if (isUserAtBottomRef.current) {
      scrollToBottom(false);
    } else {
      setHasUnreadBelow(true);
    }
  }, [messages, scrollToBottom]);

  // ── Load / Change Video Action Handlers ────────────────────────────────

  const handleLoadVideo = (e) => {
    e?.preventDefault();
    if (!canControl) return;
    const raw = videoUrlInput.trim();
    if (!raw) {
      setVideoError('Please enter a YouTube video URL or ID.');
      return;
    }
    const extracted = extractYouTubeId(raw);
    if (!extracted) {
      setVideoError('Invalid YouTube URL. Please provide a valid link (youtube.com, youtu.be, shorts).');
      return;
    }
    setVideoLoading(true);
    setVideoError('');
    setAddVideoOpen(false);
    setVideoUrlInput('');
    playClick();
    socket.emit('change_video', { videoId: extracted });
  };

  const togglePlayPause = () => {
    if (!canControl) return;
    const cur = ytPlayerRef.current?.getCurrentTime?.() || currentTime;
    if (playState === 'playing') {
      isSyncingRef.current = true;
      ytPlayerRef.current?.pauseVideo();
      setPlayState('paused');
      socket.emit('pause', { time: cur });
      setTimeout(() => { isSyncingRef.current = false; }, 400);
    } else {
      isSyncingRef.current = true;
      ytPlayerRef.current?.playVideo();
      setPlayState('playing');
      socket.emit('play', { time: cur });
      setTimeout(() => { isSyncingRef.current = false; }, 400);
    }
  };

  const handleSeek = (e) => {
    if (!canControl) return;
    const t = parseFloat(e.target.value);
    isSyncingRef.current = true;
    ytPlayerRef.current?.seekTo(t, true);
    setCurrentTime(t);
    socket.emit('seek', { time: t });
    setTimeout(() => { isSyncingRef.current = false; }, 500);
  };

  const toggleMute = () => {
    const p = ytPlayerRef.current;
    if (!p) return;
    if (isMuted) { p.unMute(); p.setVolume(volume); setIsMuted(false); }
    else { p.mute(); setIsMuted(true); }
  };

  const handleVolume = (e) => {
    const v = parseInt(e.target.value, 10);
    setVolume(v);
    ytPlayerRef.current?.setVolume(v);
    if (v === 0) setIsMuted(true);
    else { ytPlayerRef.current?.unMute(); setIsMuted(false); }
  };

  const sendChat = () => {
    const t = chatInput.trim();
    if (!t) return;
    playClick();
    socket.emit('chat_message', { text: t, role: myRole });
    setChatInput('');
  };

  const sendReaction = (e) => { playClick(); socket.emit('reaction', { emoji: e }); setEmojiOpen(false); };

  const copyLink = () => {
    playClick();
    const shareUrl = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leave = () => {
    playClick();
    socket.emit('leave_room', { roomId });
    onExit?.();
  };

  const approveCtrl = (userId) => {
    if (myRole !== 'host') return;
    socket.emit('assign_role', { userId, role: 'moderator' });
    setCtrlReqs(r => r.filter(x => x.userId !== userId));
  };

  const assignRole = (userId, role) => { if (myRole === 'host') socket.emit('assign_role', { userId, role }); };
  const kickUser   = (userId)       => { if (myRole === 'host') socket.emit('remove_participant', { userId }); };

  if (kicked) {
    return (
      <div className="wp-kicked-overlay">
        <div className="wp-kicked-box">
          <div className="wp-kicked-icon">
            <FontAwesomeIcon icon={faUserXmark} />
          </div>
          <h2>YOU HAVE BEEN REMOVED</h2>
          <p>{kicked}</p>
          <button className="wp-btn-primary" onClick={onExit}>← RETURN TO DESKTOP</button>
        </div>
      </div>
    );
  }

  // Deduplicate participants cleanly so each user appears exactly once
  const uniqueParticipantsMap = new Map();
  participants.forEach(p => {
    const key = p.userId || p.socketId || p.username;
    if (key && !uniqueParticipantsMap.has(key)) {
      uniqueParticipantsMap.set(key, p);
    }
  });

  const hostEntry = participants.find(p => p.role === 'host') || { username, role: 'host' };
  const hostKey = hostEntry.userId || hostEntry.socketId || hostEntry.username;
  if (!uniqueParticipantsMap.has(hostKey)) {
    uniqueParticipantsMap.set(hostKey, hostEntry);
  }

  const uniqueParticipants = Array.from(uniqueParticipantsMap.values());
  const hostUser = uniqueParticipants.find(p => p.role === 'host') || hostEntry;
  const otherUsers = uniqueParticipants.filter(p => (p.userId || p.socketId) !== (hostUser.userId || hostUser.socketId) && p.role !== 'host');

  return (
    <div ref={containerRef} className={`wr3d-root ${isFullscreen ? 'wr3d-fullscreen' : ''}`} onClick={() => setSelectedUserAction(null)}>

      {/* 3-D canvas mount */}
      <div ref={mountRef} className="wr3d-canvas" />


      {/* Loading overlay */}
      {loading && (
        <div className="wr3d-loading">
          <div className="wr3d-loading-inner">
            <div className="wr3d-loading-spinner" />
            <div className="wr3d-loading-title">ENTERING 3D ROOM</div>
            <div className="wr3d-bar-track"><div className="wr3d-bar-fill" style={{ width: `${progress}%` }} /></div>
            <div className="wr3d-loading-pct">{progress}%</div>
            {loadErr && <div className="wr3d-loading-err">{loadErr}</div>}
          </div>
        </div>
      )}

      {/* Floating emoji reactions */}
      <div className="wr3d-reactions">
        {reactions.map(r => (
          <div key={r.id} className="wr3d-react-pop">
            <span className="wr3d-react-emoji">{r.emoji}</span>
            <span className="wr3d-react-user">{r.username}</span>
          </div>
        ))}
      </div>

      {/* Control request toasts */}
      {myRole === 'host' && ctrlReqs.length > 0 && (
        <div className="wr3d-ctrl-toasts">
          {ctrlReqs.map(req => (
            <div key={req.userId} className="wr3d-ctrl-toast">
              <span className="wr3d-ctrl-toast-msg">
                <FontAwesomeIcon icon={faHand} className="wr3d-toast-icon" />
                <b>{req.username}</b> requested playback control
              </span>
              <button className="wr3d-tap-approve" onClick={() => approveCtrl(req.userId)}>Approve</button>
              <button className="wr3d-tap-deny"    onClick={() => setCtrlReqs(r => r.filter(x => x.userId !== req.userId))}>Deny</button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom-left: Permanent Add Video button (host/mod only) with popup above it */}
      {!loading && canControl && (
        <div className="wr3d-bottom-left-controls">
          {/* Popup card that floats above the button */}
          {addVideoOpen && (
            <div className="wr3d-add-video-popup" onClick={e => e.stopPropagation()}>
              <div className="wr3d-avp-underline-row">
                <input
                  ref={addVideoInputRef}
                  type="text"
                  className="wr3d-avp-input"
                  placeholder="Paste a YouTube link..."
                  value={videoUrlInput}
                  onChange={e => { setVideoUrlInput(e.target.value); setVideoError(''); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleLoadVideo(e); }
                    if (e.key === 'Escape') { setAddVideoOpen(false); setVideoError(''); }
                  }}
                  disabled={videoLoading}
                />
              </div>
              {videoError && <div className="wr3d-avp-error">{videoError}</div>}
              <button
                className="wr3d-avp-load-btn"
                onClick={handleLoadVideo}
                disabled={videoLoading || !videoUrlInput.trim()}
              >
                {videoLoading ? 'Loading…' : 'LOAD VIDEO'}
              </button>
            </div>
          )}

          {/* The trigger button */}
          <button
            className="wr3d-float-btn"
            onClick={() => { setAddVideoOpen(v => !v); setVideoError(''); }}
            title={addVideoOpen ? 'Close' : 'Add / Change Video'}
            aria-label="Add video"
          >
            <FontAwesomeIcon icon={faFilm} />
            {!addVideoOpen && <span className="wr3d-tooltip">Add Video</span>}
          </button>
        </div>
      )}

      {/* Bottom-center: Floating Playback Bar */}
      {!loading && videoId && (
        <div className="wr3d-playback-bar" onClick={e => e.stopPropagation()}>
          {/* Play / Pause */}
          <button
            className="wr3d-pb-btn"
            onClick={togglePlayPause}
            disabled={!canControl}
            title={canControl ? (playState === 'playing' ? 'Pause' : 'Play') : 'Only host/mod can control'}
          >
            <FontAwesomeIcon icon={playState === 'playing' ? faPause : faPlay} />
          </button>

          {/* Time */}
          <span className="wr3d-pb-time">{fmtDuration(currentTime)}</span>

          {/* Seek scrubber */}
          <input
            type="range"
            className="wr3d-pb-seek"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={handleSeek}
            disabled={!canControl || duration === 0}
            title={canControl ? 'Seek' : 'Only host/mod can seek'}
          />

          <span className="wr3d-pb-time">{fmtDuration(duration)}</span>

          {/* Mute */}
          <button
            className="wr3d-pb-btn"
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <FontAwesomeIcon icon={isMuted ? faVolumeXmark : faVolumeHigh} />
          </button>

          {/* Volume */}
          <input
            type="range"
            className="wr3d-pb-volume"
            min={0}
            max={100}
            step={1}
            value={isMuted ? 0 : volume}
            onChange={handleVolume}
            title="Volume"
          />
        </div>
      )}

      {/* Top Floating Controls */}
      {!loading && (
        <div className="wr3d-floating-controls">
          <button 
            className="wr3d-float-btn" 
            onClick={copyLink} 
            title={copied ? "Link Copied!" : "Copy Room Link"}
            aria-label="Copy Room Link"
          >
            <FontAwesomeIcon 
              icon={copied ? faCheck : faLink} 
              className={copied ? 'wr3d-icon-success' : ''} 
            />
            {copied && <span className="wr3d-tooltip">Link Copied!</span>}
          </button>

          <button 
            className="wr3d-float-btn" 
            onClick={resetView} 
            title="Reset Camera"
            aria-label="Reset Camera"
          >
            <FontAwesomeIcon icon={faRotateLeft} />
          </button>

          <button 
            className="wr3d-float-btn" 
            onClick={toggleFullscreen} 
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
          </button>

          <button 
            className="wr3d-float-btn wr3d-float-btn--leave" 
            onClick={leave} 
            title="Leave Room"
            aria-label="Leave Room"
          >
            <FontAwesomeIcon icon={faArrowRightFromBracket} />
          </button>
        </div>
      )}

      {/* Right Side Panel: Modern Participants & Chat */}
      {!loading && (
        <div className="wr3d-side-panel" onClick={e => e.stopPropagation()}>

          {/* PARTICIPANTS SECTION */}
          <div className="wr3d-participants-area">
            <div className="wr3d-section-header">
              <div className="wr3d-section-title-wrap">
                <FontAwesomeIcon icon={faUsers} className="wr3d-section-icon" />
                <span className="wr3d-section-title">PARTICIPANTS</span>
              </div>
              <span className="wr3d-count-badge">{uniqueParticipants.length}</span>
            </div>

            <div className="wr3d-participants-list">
              {/* Host Row */}
              <div className="wr3d-participant-row">
                <div className="wr3d-p-avatar" style={{ background: getAvatarBg(hostUser.username) }}>
                  <span>{getInitials(hostUser.username)}</span>
                  <span className="wr3d-online-indicator" title="Online" />
                </div>
                <span className="wr3d-p-name" title={hostUser.username}>{hostUser.username}</span>
                <span className="wr3d-role-pill wr3d-role-pill--host">
                  <FontAwesomeIcon icon={faCrown} className="wr3d-role-icon" />
                  <span>HOST</span>
                </span>
              </div>

              {/* Other Participants */}
              {otherUsers.map(p => {
                const pKey = p.userId || p.socketId || p.username;
                return (
                  <div key={pKey} className="wr3d-participant-row">
                    <div className="wr3d-p-avatar" style={{ background: getAvatarBg(p.username) }}>
                      <span>{getInitials(p.username)}</span>
                      <span className="wr3d-online-indicator" title="Online" />
                    </div>
                    <span className="wr3d-p-name" title={p.username}>{p.username}</span>
                    
                    {p.role === 'moderator' ? (
                      <span className="wr3d-role-pill wr3d-role-pill--mod">
                        <FontAwesomeIcon icon={faShieldHalved} className="wr3d-role-icon" />
                        <span>MOD</span>
                      </span>
                    ) : (
                      <span className="wr3d-role-pill wr3d-role-pill--part">
                        <span>MEMBER</span>
                      </span>
                    )}

                    {/* Host action menu */}
                    {myRole === 'host' && (
                      <div className="wr3d-p-actions-wrap">
                        <button 
                          type="button"
                          className="wr3d-p-action-trigger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserAction(selectedUserAction === pKey ? null : pKey);
                          }}
                          title="Manage participant"
                          aria-label="Manage participant"
                        >
                          <FontAwesomeIcon icon={faEllipsisVertical} />
                        </button>
                        
                        {selectedUserAction === pKey && (
                          <div className="wr3d-action-popover" onClick={e => e.stopPropagation()}>
                            {p.role !== 'moderator' && (
                              <button 
                                type="button"
                                className="wr3d-popover-item" 
                                onClick={() => { 
                                  assignRole(p.userId || p.socketId, 'moderator'); 
                                  setSelectedUserAction(null); 
                                }}
                              >
                                <FontAwesomeIcon icon={faShieldHalved} className="wr3d-popover-icon" />
                                <span>Make Moderator</span>
                              </button>
                            )}
                            <button 
                              type="button"
                              className="wr3d-popover-item wr3d-popover-item--danger" 
                              onClick={() => { 
                                kickUser(p.userId || p.socketId); 
                                setSelectedUserAction(null); 
                              }}
                            >
                              <FontAwesomeIcon icon={faUserXmark} className="wr3d-popover-icon" />
                              <span>Remove from Room</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!canControl && (
              <button 
                type="button"
                className="wr3d-req-ctrl-modern" 
                onClick={() => { playClick(); socket.emit('request_control'); }}
              >
                <FontAwesomeIcon icon={faHand} className="wr3d-req-icon" />
                <span>Request Playback Control</span>
              </button>
            )}
          </div>

          {/* CHAT SECTION */}
          <div className="wr3d-chat-area">
            <div className="wr3d-section-header">
              <div className="wr3d-section-title-wrap">
                <FontAwesomeIcon icon={faPaperPlane} className="wr3d-section-icon" />
                <span className="wr3d-section-title">CHAT</span>
              </div>
              {messages.length > 0 && (
                <span className="wr3d-count-badge">{messages.length}</span>
              )}
            </div>

            <div 
              ref={chatScrollRef} 
              className="wr3d-chat-stream" 
              onScroll={handleChatScroll}
            >
              {messages.length === 0 ? (
                <div className="wr3d-chat-empty">
                  <span>No messages yet. Send a message to get started!</span>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className="wr3d-msg-row">
                    {m.isSystem ? (
                      <div className="wr3d-sys-msg">
                        <FontAwesomeIcon icon={faCircle} className="wr3d-sys-dot" />
                        <span>{m.text}</span>
                      </div>
                    ) : (
                      <div className="wr3d-msg-card">
                        <div className="wr3d-msg-avatar" style={{ background: getAvatarBg(m.username) }}>
                          {getInitials(m.username)}
                        </div>
                        <div className="wr3d-msg-body">
                          <div className="wr3d-msg-meta">
                            <span className={`wr3d-msg-sender ${m.role === 'host' ? 'wr3d-msg-sender--host' : m.role === 'moderator' ? 'wr3d-msg-sender--mod' : ''}`}>
                              {m.username}
                            </span>
                            {m.role === 'host' && (
                              <FontAwesomeIcon icon={faCrown} className="wr3d-meta-role-icon wr3d-meta-role-icon--host" title="Host" />
                            )}
                            {m.role === 'moderator' && (
                              <FontAwesomeIcon icon={faShieldHalved} className="wr3d-meta-role-icon wr3d-meta-role-icon--mod" title="Moderator" />
                            )}
                            <span className="wr3d-msg-time">{fmtTime(m.timestamp)}</span>
                          </div>
                          <div className="wr3d-msg-text">{m.text}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Subtle Unread / Return-to-bottom indicator */}
            {hasUnreadBelow && (
              <button 
                type="button" 
                className="wr3d-unread-pill"
                onClick={() => scrollToBottom(true)}
              >
                <FontAwesomeIcon icon={faChevronDown} />
                <span>New messages</span>
              </button>
            )}

            {/* Quick Reactions Tray */}
            {emojiOpen && (
              <div className="wr3d-reactions-tray" onClick={e => e.stopPropagation()}>
                <div className="wr3d-tray-header">
                  <FontAwesomeIcon icon={faFaceSmile} className="wr3d-tray-icon" />
                  <span>Quick Reactions</span>
                </div>
                <div className="wr3d-tray-emojis">
                  {EMOJIS.map(e => (
                    <button key={e} type="button" className="wr3d-tray-emoji-btn" onClick={() => sendReaction(e)}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── MODERN CHAT COMPOSER (EXACT MATCH TO REFERENCE SCREENSHOT) ── */}
            <div className="wr3d-composer-container">
              {/* Left: Separate Circular Plus Button */}
              <button
                type="button"
                className="wr3d-composer-plus-btn"
                onClick={() => setEmojiOpen(!emojiOpen)}
                title="Reactions & Emojis"
                aria-label="Add reaction"
              >
                <FontAwesomeIcon icon={faPlus} className="wr3d-composer-plus-icon" />
              </button>

              {/* Right: Wide Rounded Pill Container */}
              <div className="wr3d-composer-pill">
                <input
                  type="text"
                  className="wr3d-composer-input"
                  placeholder="Send a message.."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendChat();
                    }
                  }}
                  maxLength={400}
                  aria-label="Message text"
                />
                <button
                  type="button"
                  className={`wr3d-composer-send-btn ${chatInput.trim().length > 0 ? 'wr3d-composer-send-btn--active' : ''}`}
                  onClick={sendChat}
                  title="Send message"
                  aria-label="Send message"
                  disabled={chatInput.trim().length === 0}
                >
                  <FontAwesomeIcon icon={faPaperPlane} className="wr3d-composer-send-icon" />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
