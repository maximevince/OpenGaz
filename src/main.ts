import { mount } from 'svelte';
import './ui/global.css';
import App from './App.svelte';
import { game } from './ui/game.svelte';
import { online } from './net/online.svelte';
import { findOverflows } from './ui/overflow-guard';

const app = mount(App, { target: document.getElementById('app')! });

// handy for debugging from the console — and the handle scripts/layout-audit.mjs drives
(window as unknown as { opengaz: unknown }).opengaz = { game, online, findOverflows };

// The dev inspector (F9). `import.meta.env.DEV` is a literal in a production build, so this
// branch — and everything under src/ui/debug — is dropped from dist/ entirely.
if (import.meta.env.DEV) {
  void import('./ui/debug/mount').then((m) => m.mountDebug());
}

export default app;
