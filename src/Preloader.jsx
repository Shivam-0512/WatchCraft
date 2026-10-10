import { useState, useEffect } from 'react';

// ── 1. Critical assets: MUST load before user enters Start Screen & 2D Room ──
const CRITICAL_ASSETS = [
  '/images/watchly_main_text.png',
  '/images/room_new.png',
  '/images/room_npc.png',
  '/images/narrator_npc.png',
  '/images/Watchly_Monitor_Logo.png',
  '/images/wachtly_new_winow_logo.png',
  '/images/desktop_background.png',
  '/images/computer_gray.png',
  '/images/default_mouse_64.png',
  '/images/hover_mouse_64.png',
  '/images/click_mouse_64.png',
];

// ── 2. Background assets: Prefetched in the background without blocking the UI ──
const BACKGROUND_ASSETS = [
  '/images/dirt_background.png',
  '/images/watchly_computer_backgorund.png',
  '/images/resume_background.png',
  '/images/myprojects.png',
  '/images/resume.png',
  '/images/skills.png',
  '/images/aboutus.png',
  '/images/contact.png',
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
  '/rooms/room1.png',
  '/rooms/room2.png',
  '/rooms/room3.png',
  '/rooms/room4.png',
  '/rooms/room5.png',
  '/rooms/room6.png',
];

export default function Preloader({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let loaded = 0;
    const total = CRITICAL_ASSETS.length;
    let completed = false;

    // Non-blocking background prefetch for secondary items
    BACKGROUND_ASSETS.forEach((src) => {
      const bgImg = new Image();
      bgImg.src = src;
    });

    const finish = () => {
      if (!completed) {
        completed = true;
        setProgress(100);
        setTimeout(() => onComplete?.(), 200);
      }
    };

    // Safety fallback (ensures UI is never stuck even on extreme network latency)
    const safetyTimer = setTimeout(() => {
      finish();
    }, 4000);

    // Track critical assets
    CRITICAL_ASSETS.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = img.onerror = () => {
        loaded++;
        const pct = Math.min(100, Math.round((loaded / total) * 100));
        setProgress(pct);
        if (loaded >= total) {
          clearTimeout(safetyTimer);
          finish();
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
