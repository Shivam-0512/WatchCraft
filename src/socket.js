// ─── socket.js ──────────────────────────────────────────────────
// Socket.IO client singleton — one connection shared across the app

import { io } from 'socket.io-client';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:10000').replace(/\/+$/, '');

let socket = null;

/**
 * Get or create the Socket.IO connection.
 * Call this once the user has a username (after WatchlyOS login).
 */
export function getSocket() {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected to Watchly backend:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[WS] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[WS] Connection error:', err.message);
    });
  }
  return socket;
}

/**
 * Disconnect and destroy the socket (e.g., on logout / back to room).
 */
export function destroySocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get or generate a persistent unique ID for this browser client.
 * Stored in localStorage so it survives page reloads and browser restarts.
 */
export function getPersistentUserId() {
  try {
    const KEY = 'watchly_user_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = 'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch (_) {
    return 'usr_' + Math.random().toString(36).substring(2, 9);
  }
}

/**
 * Get stored display name from localStorage.
 */
export function getStoredUsername() {
  try {
    return localStorage.getItem('watchly_username') || '';
  } catch (_) {
    return '';
  }
}

/**
 * Persist display name to localStorage.
 */
export function setStoredUsername(name) {
  try {
    if (name) localStorage.setItem('watchly_username', name.trim());
  } catch (_) {}
}

export default getSocket;

