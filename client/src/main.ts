/**
 * main.ts — AstroSim client entry point.
 * Boots the application once the document is ready.
 */
import { App, queryElements } from './app';
import { PRESETS } from './sim/presets';

function boot(): void {
  try {
    const els = queryElements();
    const app = new App(els, PRESETS[1].settings);
    app.start();
    app.menu.update({ playing: app.engine.running });

    // Expose for quick debugging in the browser console.
    (window as unknown as { astro: App }).astro = app;
  } catch (err) {
    console.error('[AstroSim] failed to start:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
