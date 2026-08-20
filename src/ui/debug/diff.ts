/**
 * Structural diff between two game states.
 *
 * `applyAction` clones the whole state and hands back a new one, so "what did this action
 * actually change?" is not answerable by reading the reducer — a rule can touch a company on
 * the other side of the map. This walks both trees and reports the leaves that moved, which is
 * what the Trace tab shows under each commit.
 */

export type ChangeKind = 'add' | 'del' | 'chg';

export interface Change {
  /** `companies[0].cash` */
  path: string;
  kind: ChangeKind;
  from: unknown;
  to: unknown;
}

/** Guard against a pathological state: stop walking rather than hang the panel. */
const MAX_CHANGES = 400;

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

function join(base: string, key: string | number): string {
  if (typeof key === 'number') return `${base}[${key}]`;
  return base ? `${base}.${key}` : key;
}

/**
 * Leaves that differ between `a` and `b`. Arrays are compared index by index; an array that
 * changed length reports the added/removed tail rather than a wholesale replacement, so a log
 * that grew by one line shows one change and not four hundred.
 */
export function diffStates(a: unknown, b: unknown): Change[] {
  const out: Change[] = [];
  walk(a, b, '', out);
  return out;
}

function walk(a: unknown, b: unknown, base: string, out: Change[]): void {
  if (out.length >= MAX_CHANGES) return;
  if (Object.is(a, b)) return;
  if (!isObj(a) || !isObj(b) || Array.isArray(a) !== Array.isArray(b)) {
    out.push({ path: base, kind: 'chg', from: a, to: b });
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n && out.length < MAX_CHANGES; i++) {
      if (i >= a.length) out.push({ path: join(base, i), kind: 'add', from: undefined, to: b[i] });
      else if (i >= b.length)
        out.push({ path: join(base, i), kind: 'del', from: a[i], to: undefined });
      else walk(a[i], b[i], join(base, i), out);
    }
    return;
  }
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (out.length >= MAX_CHANGES) return;
    const path = join(base, key);
    if (!(key in a)) out.push({ path, kind: 'add', from: undefined, to: b[key] });
    else if (!(key in b)) out.push({ path, kind: 'del', from: a[key], to: undefined });
    else walk(a[key], b[key], path, out);
  }
}

/** True when the diff was cut short — the Trace tab says so rather than under-reporting. */
export function diffTruncated(changes: Change[]): boolean {
  return changes.length >= MAX_CHANGES;
}
