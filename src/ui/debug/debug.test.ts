/**
 * The inspector's pure parts. Everything reactive needs a browser, but the two pieces that can
 * quietly lie — the path resolver behind the watch list and cheat editor, and the diff the
 * trace tab shows — are plain functions and are worth pinning down.
 */
import { describe, expect, it } from 'vitest';
import { newGame } from '../../engine';
import { diffStates, diffTruncated } from './diff';
import { brief, getPath, parsePath, setPath } from './path';
import { companyRows, describeAction, marketGrid, planetRows, sizes } from './inspect';

const game = () =>
  newGame({ seed: 'inspector', level: 'beginner', humans: [{ name: 'Test Co', ship: 1 }], ai: 2 });

describe('paths', () => {
  it('reads dot and bracket notation the same way', () => {
    expect(parsePath('a.b[2].c')).toEqual(['a', 'b', 2, 'c']);
    expect(parsePath('a.b.2.c')).toEqual(['a', 'b', 2, 'c']);
    expect(parsePath('')).toEqual([]);
  });

  it('resolves into the state', () => {
    const s = game();
    expect(getPath(s, 'companies[0].name').value).toBe('Test Co');
    expect(getPath(s, 'week').value).toBe(s.week);
  });

  it('says so when the path is not there, rather than reading undefined', () => {
    const s = game();
    expect(getPath(s, 'compnaies[0].cash')).toEqual({ ok: false, value: undefined });
    expect(getPath(s, 'companies[99].cash').ok).toBe(false);
    // an existing key holding undefined still resolves
    expect(getPath({ a: undefined }, 'a')).toEqual({ ok: true, value: undefined });
  });

  it('writes only where a value already lives', () => {
    const s = game();
    expect(setPath(s, 'companies[0].cash', 5)).toBe(true);
    expect(s.companies[0]!.cash).toBe(5);
    expect(setPath(s, 'companies[0].madeUp', 5)).toBe(false);
    expect(setPath(s, 'nope.at.all', 5)).toBe(false);
    expect(setPath(s, '', 5)).toBe(false);
  });

  it('renders any value on one line', () => {
    expect(brief(12)).toBe('12');
    expect(brief(1 / 3)).toBe('0.333');
    expect(brief([1, 2, 3])).toBe('[3]');
    expect(brief({ a: 1 })).toBe('{1}');
    expect(brief('x'.repeat(80), 10)).toHaveLength(10);
  });
});

describe('diff', () => {
  it('finds only the leaves that moved', () => {
    const a = game();
    const b = structuredClone(a);
    b.companies[0]!.cash = a.companies[0]!.cash + 100;
    b.week = a.week + 1;
    const changes = diffStates(a, b);
    expect(changes).toHaveLength(2);
    expect(changes.map((c) => c.path).sort()).toEqual(['companies[0].cash', 'week']);
    expect(changes.find((c) => c.path === 'week')).toMatchObject({ kind: 'chg', to: a.week + 1 });
  });

  it('reports a grown array as one addition, not a rewrite', () => {
    const a = game();
    const b = structuredClone(a);
    b.log.push({ week: 1, company: -1, kind: 'news', text: 'hello' });
    const changes = diffStates(a, b);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.kind).toBe('add');
    expect(changes[0]!.path).toBe(`log[${a.log.length}]`);
  });

  it('sees added and removed keys', () => {
    expect(diffStates({ a: 1 }, { a: 1, b: 2 })).toEqual([
      { path: 'b', kind: 'add', from: undefined, to: 2 },
    ]);
    expect(diffStates({ a: 1, b: 2 }, { a: 1 })).toEqual([
      { path: 'b', kind: 'del', from: 2, to: undefined },
    ]);
  });

  it('is empty for an unchanged state, whatever the size', () => {
    const a = game();
    expect(diffStates(a, structuredClone(a))).toEqual([]);
    expect(diffTruncated([])).toBe(false);
  });
});

describe('projections', () => {
  it('summarises every company and marks whose turn it is', () => {
    const s = game();
    const rows = companyRows(s);
    expect(rows).toHaveLength(s.companies.length);
    expect(rows.filter((r) => r.current)).toHaveLength(1);
    expect(rows[0]!.planet).not.toBe('');
  });

  it('summarises the seven planets', () => {
    const s = game();
    const rows = planetRows(s);
    expect(rows).toHaveLength(7);
    expect(rows.every((r) => r.name.length > 0)).toBe(true);
  });

  it('grids every commodity against every planet', () => {
    const s = game();
    const grid = marketGrid(s, 'price');
    expect(grid).toHaveLength(s.commodities.length);
    expect(grid[0]!.cells).toHaveLength(7);
    expect(grid.every((r) => r.cells.every((c) => c.heat >= 0 && c.heat <= 1))).toBe(true);
  });

  it('measures the state the way the wire will', () => {
    const s = game();
    const { json, link, log } = sizes(s);
    expect(json).toBeGreaterThan(link); // the link is compressed
    expect(log).toBe(s.log.length);
  });

  it('names actions the way the trace lists them', () => {
    expect(describeAction({ type: 'buy', commodity: 'gems', tons: 5 })).toBe('buy 5t Gems');
    expect(describeAction({ type: 'journey', to: 3 })).toBe('journey -> 3');
    expect(describeAction({ type: 'continue' })).toBe('continue');
  });
});
