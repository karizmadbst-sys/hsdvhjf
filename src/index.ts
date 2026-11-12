/**
 * ECHO – THE WORLD REMEMBERS
 * Main Application Entry Point
 * Robust lifecycle check ensuring initialization on both immediate and deferred loading
 */

import { Game } from './Game.ts';

function start(): void {
  const container = document.getElementById('root') || document.body;
  try {
    new Game(container);

    // Request browser HTML5 Fullscreen on first touch/click interaction if in web/PWA mode
    const requestFullScreenOnce = () => {
      try {
        const docEl = document.documentElement as any;
        if (!document.fullscreenElement && !docEl.webkitFullscreenElement) {
          if (docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(() => {});
          } else if (docEl.webkitRequestFullscreen) {
            docEl.webkitRequestFullscreen();
          }
        }
      } catch {
        // Ignore if prevented by browser security policy
      }
      window.removeEventListener('pointerdown', requestFullScreenOnce);
      window.removeEventListener('touchstart', requestFullScreenOnce);
    };

    window.addEventListener('pointerdown', requestFullScreenOnce, { passive: true, once: true });
    window.addEventListener('touchstart', requestFullScreenOnce, { passive: true, once: true });
  } catch (error) {
    console.error('Error starting ECHO Game:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  // Already interactive or complete
  start();
}
