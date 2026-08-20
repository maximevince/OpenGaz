/**
 * Dotted paths into the game state — `companies[0].cash`, `planets.3.exchange.price`.
 *
 * Used by the watch list and by the raw-state editor, so it has to be forgiving about how a
 * path is typed and honest about a path that does not resolve: a watch on a typo should read
 * "no such path", not silently show `undefined` as if the value were part of the state.
 */

export type PathSeg = string | number;

/** `a.b[2].c` -> `['a', 'b', 2, 'c']`. Bracket and dot notation are interchangeable. */
export function parsePath(path: string): PathSeg[] {
  const out: PathSeg[] = [];
  for (const raw of path.replace(/\[(\d+)\]/g, '.$1').split('.')) {
    const seg = raw.trim();
    if (!seg) continue;
    out.push(/^\d+$/.test(seg) ? Number(seg) : seg);
  }
  return out;
}

export interface Resolved {
  ok: boolean;
  value: unknown;
}

/** Walk `path` into `root`. `ok` is false as soon as a segment is missing. */
export function getPath(root: unknown, path: string): Resolved {
  let cur: unknown = root;
  for (const seg of parsePath(path)) {
    if (cur === null || typeof cur !== 'object') return { ok: false, value: undefined };
    const holder = cur as Record<PathSeg, unknown>;
    if (!(seg in holder)) return { ok: false, value: undefined };
    cur = holder[seg];
  }
  return { ok: true, value: cur };
}

/**
 * Write `value` at `path`. Only existing containers are walked — a cheat that invents
 * `compnaies[0]` should fail loudly rather than grow a new branch on the state.
 */
export function setPath(root: unknown, path: string, value: unknown): boolean {
  const segs = parsePath(path);
  const last = segs.pop();
  if (last === undefined) return false;
  let cur: unknown = root;
  for (const seg of segs) {
    if (cur === null || typeof cur !== 'object') return false;
    const holder = cur as Record<PathSeg, unknown>;
    if (!(seg in holder)) return false;
    cur = holder[seg];
  }
  if (cur === null || typeof cur !== 'object') return false;
  const holder = cur as Record<PathSeg, unknown>;
  if (!(last in holder)) return false;
  holder[last] = value;
  return true;
}

/** One-line rendering of any value, for tables and the watch strip. */
export function brief(v: unknown, max = 60): string {
  let s: string;
  if (typeof v === 'string') s = v;
  else if (v === undefined) s = 'undefined';
  else if (typeof v === 'number') s = Number.isInteger(v) ? String(v) : v.toFixed(3);
  else if (v === null || typeof v !== 'object') s = String(v);
  else if (Array.isArray(v)) s = `[${v.length}]`;
  else s = `{${Object.keys(v).length}}`;
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
