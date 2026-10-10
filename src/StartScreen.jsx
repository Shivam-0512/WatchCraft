import React, { useState, useEffect, useCallback } from 'react';
import { playClick } from './sounds';

const HEADING = '/images/watchly_main_text.png';

export default function StartScreen({ onStart }) {
  const [fading, setFading] = useState(false);

  const handleStart = useCallback(() => {
    if (fading) return;
    playClick();
    setFading(true);
    setTimeout(() => {
      if (onStart) onStart();
    }, 450);
  }, [fading, onStart]);

  useEffect(() => {
    const onKey = (e) => {
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return;
      handleStart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleStart]);

  return (
    <div
      className={`watchly-black-start-root ${fading ? 'watchly-start-fade-out' : 'watchly-start-fade-in'}`}
      onClick={handleStart}
      onTouchStart={handleStart}
    >
      <div className="watchly-black-start-content" onClick={(e) => e.stopPropagation()}>
        {/* Main Logo Title in center, positioned slightly above center */}
        <div className="watchly-start-logo-wrap">
          <img
            src={HEADING}
            alt="WatchCraft"
            className="watchly-start-main-logo"
            draggable={false}
          />
        </div>

        {/* 'Press / Touch any key to start' button matching reference screenshot */}
        <button
          type="button"
          className="watchly-press-start-btn"
          onClick={handleStart}
          aria-label="Press or touch any key to start"
        >
          Press / Touch any key to start
        </button>
      </div>
    </div>
  );
}
