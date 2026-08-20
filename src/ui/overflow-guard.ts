/**
 * Layout guard: finds content that has been pushed outside a box that clips it.
 *
 * Every screen is drawn on a fixed 640×480 stage with `overflow: hidden`, so a table
 * that grows one row too many, or a dialog that outgrows the stage, silently takes its
 * button row off screen — the bug is invisible to `svelte-check`, to unit tests and to
 * a reading of the CSS. This module is the detector: `scripts/layout-audit.mjs` runs it
 * over every screen in CI, and in dev it runs on every DOM change (see `installGuard`).
 */

export interface Overflow {
  /** `div.ship-actions` style path from the stage down to the offending element */
  path: string;
  /** first bit of its text, to tell rows apart */
  text: string;
  /** the ancestor that cuts it off (`div.stage` when it leaves the stage entirely) */
  clippedBy: string;
  edge: 'top' | 'bottom' | 'left' | 'right';
  /** how far past the clip edge, in CSS pixels of the *scaled* stage */
  overBy: number;
}

const SCROLLS = /auto|scroll/;
const CLIPS = /hidden|clip/;

/** `div.dlg` — the svelte scoping hash is dropped so messages stay readable */
function label(el: Element): string {
  const cls = [...el.classList].filter((c) => !c.startsWith('svelte-'))[0];
  return el.tagName.toLowerCase() + (cls ? '.' + cls : '');
}

function path(el: Element, root: Element): string {
  const parts: string[] = [];
  for (let n: Element | null = el; n && n !== root; n = n.parentElement) parts.unshift(label(n));
  return parts.join(' > ');
}

/**
 * The nearest ancestor that hard-clips `el`: one with `overflow: hidden/clip`, or the
 * root itself. A scrollable ancestor stops the search — content below the fold of a
 * scroll box is reachable, so it is not a bug.
 */
function hardClipper(el: Element, root: Element): Element | null {
  for (let a = el.parentElement; a; a = a.parentElement) {
    const o = getComputedStyle(a);
    const overflow = o.overflowY + ' ' + o.overflowX;
    if (SCROLLS.test(overflow)) return null;
    if (a === root || CLIPS.test(overflow)) return a;
  }
  return null;
}

/** Elements that legitimately sit outside their box (slide-in toasts, measuring probes). */
function exempt(el: Element): boolean {
  return el.closest('[data-overflow-ok]') !== null;
}

/**
 * Every element under `root` whose box is cut off by an ancestor that clips without
 * scrolling. Empty array means every screen element is reachable.
 */
export function findOverflows(root: Element | null = document.querySelector('.stage')): Overflow[] {
  if (!root) return [];
  const rootRect = root.getBoundingClientRect();
  // the stage is uniformly scaled; report distances in unscaled stage pixels
  const unscale = rootRect.width ? root.clientWidth / rootRect.width || 1 : 1;
  const found: Overflow[] = [];
  for (const el of root.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    if (exempt(el)) continue;
    const clip = hardClipper(el, root);
    if (!clip) continue;
    const c = clip.getBoundingClientRect();
    const edges = [
      ['top', c.top - r.top],
      ['bottom', r.bottom - c.bottom],
      ['left', c.left - r.left],
      ['right', r.right - c.right],
    ] as const;
    for (const [edge, over] of edges) {
      // a pixel of slack: subpixel rounding at fractional stage scales
      if (over <= 1) continue;
      found.push({
        path: path(el, root),
        text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40),
        clippedBy: clip === root ? 'the stage' : label(clip),
        edge,
        overBy: Math.round(over * unscale),
      });
    }
  }
  return found;
}

/** One line per finding, for a console or a CI log. */
export function formatOverflows(list: Overflow[]): string {
  return list
    .map((o) => `  ${o.path} “${o.text}” — ${o.overBy}px past the ${o.edge} of ${o.clippedBy}`)
    .join('\n');
}

/**
 * Dev-only watchdog: re-runs the check a frame after the DOM settles and shouts in the
 * console. Cheap enough to leave on while playing (one pass over the stage subtree).
 */
export function installGuard(root: Element): () => void {
  let queued = 0;
  let last = '';
  const check = () => {
    queued = 0;
    const list = findOverflows(root);
    const key = list.map((o) => o.path + o.edge + o.overBy).join('|');
    if (key === last) return;
    last = key;
    if (list.length)
      console.error(
        `[layout] ${list.length} element(s) pushed outside a box that clips them:\n${formatOverflows(list)}`,
      );
  };
  const schedule = () => {
    if (!queued) queued = requestAnimationFrame(() => setTimeout(check, 0));
  };
  const mo = new MutationObserver(schedule);
  mo.observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
  schedule();
  return () => {
    mo.disconnect();
    if (queued) cancelAnimationFrame(queued);
  };
}
