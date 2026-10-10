import { useState, useEffect, useCallback } from 'react';
import Preloader from './Preloader';
import StartScreen from './StartScreen';
import GameRoomScreen from './GameRoomScreen';
import { initAudio, startBgMusic, toggleMute, isMuted as globalIsMuted, playClick } from './sounds';
import './index.css';

// ─── MUTE BUTTON COMPONENT ──────────────────────────────
function MuteButton() {
  const [muted, setMuted] = useState(globalIsMuted);

  const handleToggle = () => {
    playClick();
    const newState = toggleMute();
    setMuted(newState);
  };

  return (
    <div className="mute-btn-container" onClick={(e) => e.stopPropagation()}>
      <button className="creeper-btn mute-btn" onClick={handleToggle} aria-label="Toggle Mute">
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  );
}

// Possible screens
const SCREENS = {
  LOADING: 'loading',
  START: 'start',
  ROOM:  'room',
};

function App() {
  const [screen, setScreen] = useState(SCREENS.LOADING);

  // Start background music on user interaction
  const ensureMusic = useCallback(() => {
    initAudio();
    startBgMusic();
  }, []);

  // Listen for interaction to unlock audio
  useEffect(() => {
    const handler = () => {
      ensureMusic();
      window.removeEventListener('click', handler, true);
      window.removeEventListener('keydown', handler, true);
    };
    window.addEventListener('click', handler, true);
    window.addEventListener('keydown', handler, true);
    return () => {
      window.removeEventListener('click', handler, true);
      window.removeEventListener('keydown', handler, true);
    };
  }, [ensureMusic]);

  return (
    <>
      {screen === SCREENS.LOADING && (
        <Preloader onComplete={() => setScreen(SCREENS.START)} />
      )}

      {screen === SCREENS.START && (
        <StartScreen onStart={() => setScreen(SCREENS.ROOM)} />
      )}

      {screen === SCREENS.ROOM && (
        <GameRoomScreen onBack={() => setScreen(SCREENS.START)} />
      )}

      {/* Global Mute Button visible on 2D Room screen */}
      {screen === SCREENS.ROOM && <MuteButton />}
    </>
  );
}

export default App;
