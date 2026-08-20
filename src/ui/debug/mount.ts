/**
 * Dev-only entry point for the inspector.
 *
 * `main.ts` reaches this module through a dynamic import behind `import.meta.env.DEV`. Vite
 * replaces that flag with a literal in a production build, so Rollup drops the branch, the
 * import and this whole directory — no inspector markup, cheat labels or engine introspection
 * ever reaches `dist/`. The marker below is what `scripts/guard-no-debug.sh` looks for to
 * prove it, so leave the literal alone.
 */
import { mount } from 'svelte';
import DebugPanel from './DebugPanel.svelte';

/** grep-able proof of exclusion; the guard script fails the build if it survives into dist/ */
export const DEBUG_MARKER = 'OPENGAZ_DEBUG_PANEL';

/** Mount the panel into its own node, outside the stage's DOM so it cannot be clipped by it. */
export function mountDebug(): void {
  if (document.getElementById('opengaz-debug')) return;
  const host = document.createElement('div');
  host.id = 'opengaz-debug';
  host.dataset.marker = DEBUG_MARKER;
  document.body.appendChild(host);
  mount(DebugPanel, { target: host });
}
