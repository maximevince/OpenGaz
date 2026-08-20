<script lang="ts">
  /**
   * The dev inspector: a dock beside the game showing what the engine thinks is going on.
   *
   * It lives *outside* the 640×480 stage on purpose. The stage clips whatever does not fit and
   * `overflow-guard` polices it on every DOM change, so a panel drawn inside would both be
   * cropped and set the guard off; out here it can be as tall as the window, and the stage
   * simply gets a narrower field to centre itself in (see the `--og-debug-dock` variable).
   *
   * Nothing in this file ships: `main.ts` only imports it under `import.meta.env.DEV`, so the
   * whole directory is dropped from a production build. `scripts/guard-no-debug.sh` checks that.
   */
  import { currentIndex, netWorth } from '../../engine';
  import { game } from '../game.svelte';
  import { brief, getPath } from './path';
  import { prefs, trace, type Tab } from './trace.svelte';
  import Game from './tabs/Game.svelte';
  import Companies from './tabs/Companies.svelte';
  import Planets from './tabs/Planets.svelte';
  import Market from './tabs/Market.svelte';
  import Events from './tabs/Events.svelte';
  import Trace from './tabs/Trace.svelte';
  import Log from './tabs/Log.svelte';
  import Rng from './tabs/Rng.svelte';
  import Raw from './tabs/Raw.svelte';
  import Cheats from './tabs/Cheats.svelte';

  const TABS: { id: Tab; label: string }[] = [
    { id: 'game', label: 'game' },
    { id: 'companies', label: 'cos' },
    { id: 'planets', label: 'planets' },
    { id: 'market', label: 'market' },
    { id: 'events', label: 'events' },
    { id: 'trace', label: 'trace' },
    { id: 'log', label: 'log' },
    { id: 'rng', label: 'rng' },
    { id: 'raw', label: 'raw' },
    { id: 'cheats', label: 'cheats' },
  ];

  const s = $derived(game.state);
  let picked = $state('');
  let newWatch = $state('');

  // every state the game passes through is offered to the ring, however it got there
  $effect(() => trace.record(game.state));

  // the stage measures the space it is given, so reserving the dock re-centres it automatically
  $effect(() => {
    const w = prefs.open ? prefs.width : 0;
    document.documentElement.style.setProperty('--og-debug-dock', `${w}px`);
    return () => document.documentElement.style.removeProperty('--og-debug-dock');
  });

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'F9' || (e.ctrlKey && e.key === '`')) {
      e.preventDefault();
      prefs.open = !prefs.open;
    }
  }

  /** drag the left edge to resize */
  function startResize(e: PointerEvent) {
    e.preventDefault();
    const move = (ev: PointerEvent) => (prefs.width = window.innerWidth - ev.clientX);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function pick(path: string) {
    picked = path;
    prefs.addWatch(path);
  }

  interface WatchRow {
    path: string;
    text: string;
    ok: boolean;
    spark: number[];
  }

  /** current value of each watch, plus its history across the commit ring for the sparkline */
  const watches = $derived.by((): WatchRow[] => {
    const st = s;
    return prefs.watches.map((path) => {
      const r = st ? getPath(st, path) : { ok: false, value: undefined };
      const spark = trace.commits
        .map((c) => getPath(c.state, path).value)
        .filter((v): v is number => typeof v === 'number');
      return { path, text: r.ok ? brief(r.value, 22) : '—', ok: r.ok, spark };
    });
  });

  /** tiny polyline over the watched value's recent history */
  function sparkPoints(values: number[], w = 60, h = 12): string {
    if (values.length < 2) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - min) / span) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  const cur = $derived.by(() => {
    const st = s;
    if (!st) return null;
    const i = currentIndex(st);
    const co = st.companies[i];
    return co ? { i, co, worth: netWorth(st, co) } : null;
  });
</script>

<svelte:window {onkeydown} />

{#if !prefs.open}
  <button class="og-debug-tab" onclick={() => (prefs.open = true)} title="OpenGaz inspector (F9)"
    >🐞</button
  >
{:else}
  <aside class="og-debug" style:width={`${prefs.width}px`}>
    <button
      class="grip"
      aria-label="Resize the inspector"
      onpointerdown={startResize}
      onkeydown={(e) => {
        if (e.key === 'ArrowLeft') prefs.width = prefs.width + 20;
        if (e.key === 'ArrowRight') prefs.width = prefs.width - 20;
      }}
    ></button>
    <header>
      <b>inspector</b>
      {#if trace.handEdited}<span class="tag bad">hand-edited</span>{/if}
      <span class="grow"></span>
      <button class="tog" onclick={() => (prefs.open = false)}>F9 ✕</button>
    </header>

    {#if s}
      {@const st = s}
      <div class="hud">
        <span>w{st.week}</span>
        <span class="tag">{st.phase}</span>
        <span class="tag">{game.screen}</span>
        {#if cur}
          <span class="grow">{cur.i}:{cur.co.name}</span>
          <span>{cur.co.cash.toLocaleString('en-US')}k</span>
          <span class="dim">worth {cur.worth.toLocaleString('en-US')}</span>
        {/if}
      </div>
      {#if game.error}<div class="hud bad">{game.error}</div>{/if}

      {#if watches.length}
        <div class="watches">
          {#each watches as w (w.path)}
            <div class="watch" class:bad={!w.ok}>
              <span class="wpath" title={w.path}>{w.path}</span>
              <span class="wval">{w.text}</span>
              {#if w.spark.length > 1}
                <svg viewBox="0 0 60 12" width="60" height="12" aria-hidden="true">
                  <polyline points={sparkPoints(w.spark)} fill="none" stroke="currentColor" />
                </svg>
              {/if}
              <button class="x" onclick={() => prefs.removeWatch(w.path)} aria-label="drop watch"
                >✕</button
              >
            </div>
          {/each}
        </div>
      {/if}
      <div class="bar">
        <input
          class="in"
          placeholder="watch a path — companies[0].cash"
          bind:value={newWatch}
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              prefs.addWatch(newWatch);
              newWatch = '';
            }
          }}
        />
      </div>

      <nav>
        {#each TABS as t (t.id)}
          <button class="tab" class:on={prefs.tab === t.id} onclick={() => (prefs.tab = t.id)}
            >{t.label}</button
          >
        {/each}
      </nav>

      <div class="body">
        {#if prefs.tab === 'game'}<Game s={st} />
        {:else if prefs.tab === 'companies'}<Companies s={st} onpick={pick} />
        {:else if prefs.tab === 'planets'}<Planets s={st} onpick={pick} />
        {:else if prefs.tab === 'market'}<Market s={st} />
        {:else if prefs.tab === 'events'}<Events s={st} onpick={pick} />
        {:else if prefs.tab === 'trace'}<Trace onpick={pick} />
        {:else if prefs.tab === 'log'}<Log s={st} />
        {:else if prefs.tab === 'rng'}<Rng s={st} />
        {:else if prefs.tab === 'raw'}<Raw s={st} onpick={pick} />
        {:else}<Cheats s={st} pickedPath={picked} />{/if}
      </div>
    {:else}
      <div class="pad dim">No game in progress. Start one from the title screen.</div>
    {/if}
  </aside>
{/if}

<style>
  .og-debug-tab {
    position: fixed;
    top: 6px;
    right: 6px;
    z-index: 9999;
    width: 28px;
    height: 28px;
    border: 1px solid #444;
    border-radius: 6px;
    background: rgba(20, 22, 28, 0.8);
    color: #ddd;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    opacity: 0.55;
  }
  .og-debug-tab:hover {
    opacity: 1;
  }
  .og-debug {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    border-left: 1px solid #2c3140;
    background: #12141a;
    color: #c8cddb;
    font:
      11px/1.45 ui-monospace,
      SFMono-Regular,
      Menlo,
      Consolas,
      monospace;
  }
  .grip {
    position: absolute;
    left: -3px;
    top: 0;
    bottom: 0;
    width: 6px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: ew-resize;
  }
  header {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 5px 8px;
    border-bottom: 1px solid #2c3140;
    background: #171a22;
  }
  .grow {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hud {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 4px 8px;
    border-bottom: 1px solid #22262f;
    background: #0e1015;
  }
  .watches {
    display: flex;
    flex-direction: column;
    max-height: 110px;
    overflow: auto;
    border-bottom: 1px solid #22262f;
  }
  .watch {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 1px 8px;
  }
  .wpath {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #7f8ba5;
  }
  .wval {
    color: #eaeef8;
  }
  .x {
    border: 0;
    background: none;
    color: #66708a;
    cursor: pointer;
  }
  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    padding: 4px 6px;
    border-bottom: 1px solid #2c3140;
    background: #171a22;
  }
  .tab {
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 2px 6px;
    background: #232833;
    color: #aab2c5;
    font: inherit;
    cursor: pointer;
  }
  .tab.on {
    border-color: #4d7fd0;
    background: #1d3557;
    color: #fff;
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 4px 0 24px;
  }

  /* shared by the tab components — they are markup only, the look lives here */
  .og-debug :global(.dbg-t) {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
  }
  .og-debug :global(.dbg-t td),
  .og-debug :global(.dbg-t th) {
    padding: 2px 6px;
    text-align: left;
    vertical-align: top;
  }
  .og-debug :global(.dbg-t.grid td),
  .og-debug :global(.dbg-t.grid th) {
    border-bottom: 1px solid #1d212b;
  }
  .og-debug :global(.dbg-t.tight td),
  .og-debug :global(.dbg-t.tight th) {
    padding: 1px 4px;
  }
  .og-debug :global(.dbg-t th) {
    color: #7f8ba5;
    font-weight: normal;
  }
  .og-debug :global(.dbg-t .k) {
    width: 34%;
    color: #7f8ba5;
  }
  .og-debug :global(.num) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .og-debug :global(.dim) {
    color: #6e7893;
  }
  .og-debug :global(.bad) {
    color: #ff8080;
  }
  .og-debug :global(.warn) {
    border-left: 3px solid #d0a24d;
    background: #221d12;
    color: #e8cd9a;
  }
  .og-debug :global(.pad) {
    padding: 5px 8px;
  }
  .og-debug :global(.sec td) {
    padding-top: 8px;
    color: #4d7fd0;
  }
  .og-debug :global(.sec-h) {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-top: 8px;
    padding: 3px 8px;
    background: #191d26;
    color: #7fa6e8;
  }
  .og-debug :global(.cur) {
    background: #16202e;
  }
  .og-debug :global(.sub td) {
    padding-top: 0;
    border-bottom: 1px solid #1d212b;
  }
  .og-debug :global(.bar) {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 4px 8px;
  }
  .og-debug :global(.bar.wrap) {
    flex-wrap: wrap;
  }
  .og-debug :global(.in) {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    border: 1px solid #2f3542;
    border-radius: 3px;
    padding: 2px 4px;
    background: #0c0e13;
    color: #dfe4f0;
    font: inherit;
  }
  .og-debug :global(.in.tiny) {
    flex: 0 0 60px;
  }
  .og-debug :global(.in.area) {
    width: calc(100% - 16px);
    height: 54px;
    margin: 0 8px;
    resize: vertical;
  }
  .og-debug :global(.tog) {
    border: 1px solid #2f3542;
    border-radius: 3px;
    padding: 2px 6px;
    background: #232833;
    color: #c8cddb;
    font: inherit;
    cursor: pointer;
  }
  .og-debug :global(.tog.on) {
    border-color: #4d7fd0;
    background: #1d3557;
    color: #fff;
  }
  .og-debug :global(.tog.danger) {
    border-color: #6b2b2b;
    color: #ffb0b0;
  }
  .og-debug :global(.tog:disabled) {
    opacity: 0.4;
    cursor: default;
  }
  .og-debug :global(.link) {
    border: 0;
    background: none;
    color: #7fa6e8;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .og-debug :global(.tag) {
    border-radius: 3px;
    padding: 0 4px;
    background: #232833;
    color: #9fb0d0;
  }
  .og-debug :global(.tag.bad) {
    background: #4a1e1e;
    color: #ffb0b0;
  }
  .og-debug :global(.scroll-list) {
    max-height: 240px;
    overflow: auto;
    border-bottom: 1px solid #22262f;
  }
  .og-debug :global(.scroll-list.short) {
    max-height: 90px;
  }
  .og-debug :global(.commit) {
    display: flex;
    gap: 6px;
    width: 100%;
    border: 0;
    border-bottom: 1px solid #1a1e27;
    padding: 2px 8px;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .og-debug :global(.commit.on) {
    background: #1d3557;
  }
  .og-debug :global(.commit.cheat) {
    color: #e8cd9a;
  }
  .og-debug :global(.commit .seq) {
    color: #66708a;
  }
  .og-debug :global(.commit .label) {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .og-debug :global(.logline) {
    padding: 1px 8px;
    border-bottom: 1px solid #1a1e27;
  }
  .og-debug :global(.logline.bad),
  .og-debug :global(.logline.warn) {
    color: #ffb0b0;
  }
  .og-debug :global(.logline.good) {
    color: #a5e8a5;
  }
  .og-debug :global(.tree) {
    padding: 4px 8px;
  }
  .og-debug :global(.jt-kids) {
    margin-left: 10px;
    border-left: 1px solid #232833;
    padding-left: 6px;
  }
  .og-debug :global(.jt-leaf),
  .og-debug :global(.jt-twist) {
    display: flex;
    gap: 6px;
    width: 100%;
    border: 0;
    padding: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .og-debug :global(.jt-key) {
    color: #7fa6e8;
  }
  .og-debug :global(.jt-val) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #eaeef8;
  }
  .og-debug :global(.jt-val.jt-str) {
    color: #c7e8a5;
  }
  .og-debug :global(.jt-dim),
  .og-debug :global(.jt-caret) {
    color: #66708a;
  }
  .og-debug :global(.jt-empty) {
    padding-left: 6px;
  }
</style>
