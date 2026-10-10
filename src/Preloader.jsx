import { useState, useEffect } from 'react';

// Comprehensive list of all image and media assets across the app to preload
const IMAGES_TO_PRELOAD = [
  // ── Branding & Start Screen ──────────────────────────────
  '/images/watchly_main_text.png',
  '/images/Watchly_Monitor_Logo.png',
  '/images/wachtly_new_winow_logo.png',
  '/images/heading.png',

  // ── GameRoomScreen (2D Room & NPC) ────────────────────────
  '/images/room_new.png',
  '/images/room_new1.png',
  '/images/room_npc.png',
  '/images/narrator_npc.png',
  '/images/resume_background.png',

  // ── ComputerSystem & Desktop Environment ──────────────────
  '/images/dirt_background.png',
  '/images/desktop_background.png',
  '/images/computer_gray.png',
  '/images/watchly_computer_backgorund.png',
  '/images/myprojects.png',
  '/images/resume.png',
  '/images/skills.png',
  '/images/aboutus.png',
  '/images/contact.png',

  // ── Watchly Desktop App Icons & Genres ────────────────────
  '/images/app_watchly.png',
  '/images/app_watchly_createroom.png',
  '/images/app_watchly_joinroom.png',
  '/images/app_watchly_discover.png',
  '/images/app_watchly_movies.png',
  '/images/app_watchly_anime.png',
  '/images/app_watchly_music.png',
  '/images/app_watchly_games.png',
  '/images/app_watchly_sports.png',
  '/images/app_watchly_education.png',
  '/images/plus_icon.png',

  // ── Project Banners & Team ────────────────────────────────
  '/images/codnite.png',
  '/images/arohan.png',
  '/images/ecobin.png',
  '/images/techeez.png',
  '/images/shivam.png',
  '/images/shadan.png',

  // ── Custom Cursors ────────────────────────────────────────
  '/images/default_mouse_64.png',
  '/images/hover_mouse_64.png',
  '/images/click_mouse_64.png',

  // ── Wall Paintings / Rooms ────────────────────────────────
  '/rooms/room1.png',
  '/rooms/room2.png',
  '/rooms/room3.png',
  '/rooms/room4.png',
  '/rooms/room5.png',
  '/rooms/room6.png',

  // ── 3D Room Textures ──────────────────────────────────────
  '/room3d/bakedDay.jpg',
  '/room3d/bakedNight.jpg',
  '/room3d/bakedNeutral.jpg',
  '/room3d/lightMap.jpg',
];

export default function Preloader({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let loaded = 0;
    const total = IMAGES_TO_PRELOAD.length;

    // Safety fallback so users are never stuck if any image errors or network drops
    const safetyTimer = setTimeout(() => {
      onComplete?.();
    }, 6000);

    // Preload audio sound effect
    try {
      const audio = new Audio('/sound/btn_click.mp3');
      audio.preload = 'auto';
    } catch (e) {}

    IMAGES_TO_PRELOAD.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = img.onerror = () => {
        loaded++;
        const pct = Math.min(100, Math.round((loaded / total) * 100));
        setProgress(pct);
        if (loaded >= total) {
          clearTimeout(safetyTimer);
          setTimeout(() => onComplete?.(), 250);
        }
      };
    });

    return () => clearTimeout(safetyTimer);
  }, [onComplete]);

  return (
    <div className="watchly-preloader-root">
      <div className="watchly-preloader-box">
        <div className="watchly-preloader-text">LOADING... {progress}%</div>
        <div className="watchly-preloader-track">
          <div className="watchly-preloader-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
