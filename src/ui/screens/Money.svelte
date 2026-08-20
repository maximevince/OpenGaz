<script lang="ts">
  import {
    LEVEL_BY_ID,
    PLANET_BY_ID,
    SHIP_BY_ID,
    cargoAtCost,
    companyLocation,
    companyStatus,
    netWorth,
    sharesValue,
  } from '../../engine';
  import { img } from '../assets';
  import Btn from '../components/Btn.svelte';
  import Plate from '../components/Plate.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';
  const s = $derived(game.s);
  const co = $derived(game.co);
  const nw = $derived(netWorth(s, co));
  const level = $derived(LEVEL_BY_ID(s.settings.level));
  const target = $derived(s.settings.targetNetWorth);
  let tab: 'summary' | 'history' | 'networth' | 'strength' | 'players' | 'ship' = $state('summary');
  const colors = ['#ff0000', '#00c000', '#0000ff', '#ff00ff', '#00c0c0', '#c0c000', '#ff8000'];
  const status = $derived(companyStatus(nw));
  /** net worth as recorded at the week rollover — what the charts are drawn from */
  const atWeekStart = (c: (typeof s.companies)[number]) =>
    c.netWorthHistory[c.netWorthHistory.length - 1] ?? 0;
  const nwStart = $derived(atWeekStart(co));

  // history chart
  const W = 600,
    H = 250,
    PL = 60,
    PB = 20;
  /**
   * Setup seeds the ring with a cosmetic opening value at index 0 so the bars have something
   * to show in week 1. It is never plotted: until the ring wraps past week 20 the line starts
   * at the first real weekly recording.
   */
  const hist = $derived(
    s.companies.map((c) => (s.week <= 20 ? c.netWorthHistory.slice(1) : c.netWorthHistory)),
  );
  /** week 1 has a single real recording, so there is no line to draw yet */
  const canPlot = $derived((hist[0]?.length ?? 0) > 1);
  const all = $derived(hist.flat());
  const minY = $derived(Math.min(0, ...all));
  const maxY = $derived(Math.max(100000, ...all));
  const y = (v: number) => H - PB - ((v - minY) / (maxY - minY)) * (H - PB - 10);
  const shipPic = $derived(img(`ship.${co.ship.defId}.picture`));
  /** rival card art; humans have no portrait of their own */
  const faceOf = (c: (typeof s.companies)[number]) =>
    c.isAI ? (img(`portrait.op${c.aiIndex}`) ?? null) : null;
  const BLANK =
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E';

  // net-worth bars use the recorded figure, so they agree with the history line's last point
  const bars = $derived(s.companies.map((c, i) => ({ c, i, v: atWeekStart(c) })));
  const maxAbs = $derived(Math.max(1, ...bars.map((b) => Math.abs(b.v))));

  // market strength: share of the fleet's total mass, as a pie
  const alive = $derived(s.companies.map((c, i) => ({ c, i })).filter((x) => !x.c.bankrupt));
  const strengthTotal = $derived(alive.reduce((a, x) => a + x.c.ship.tons, 0));
  const R = 92;
  /** pie slices, each carrying the SVG path for its wedge */
  const slices = $derived.by(() => {
    let from = -Math.PI / 2;
    return alive.map(({ c, i }) => {
      const frac = c.ship.tons / Math.max(1, strengthTotal);
      const to = from + frac * Math.PI * 2;
      const p = (a: number) => `${(R * Math.cos(a)).toFixed(2)},${(R * Math.sin(a)).toFixed(2)}`;
      // a single company owning the whole fleet cannot be drawn as an arc — draw a full circle
      const d =
        frac >= 0.999
          ? `M 0,-${R} A ${R},${R} 0 1 1 -0.01,-${R} Z`
          : `M 0,0 L ${p(from)} A ${R},${R} 0 ${to - from > Math.PI ? 1 : 0} 1 ${p(to)} Z`;
      const mid = (from + to) / 2;
      from = to;
      return { c, i, frac, d, lx: R * 0.62 * Math.cos(mid), ly: R * 0.62 * Math.sin(mid) };
    });
  });
</script>

<div class="money">
  <div class="top">
    {#if tab === 'summary'}
      <div class="plates">
        <Plate label="Company:" value={co.name} color="yellow" />
        <Plate label="Game Level:" value={level.name} color="yellow" />
        <Plate label="Net Worth (start of week):" value={fmt(nwStart)} color="yellow" />
        <Plate label="Net Worth (right now):" value={fmt(nw)} color="yellow" />
        <Plate label="Company Status:" value={status} color="yellow" />
        <Plate label="Goal:" value={`${fmt(target)} net worth`} color="yellow" />
        <div class="breakdown">
          cash {fmt(co.cash)} + bank {fmt(co.bank)} + shares {fmt(sharesValue(s, co))} + goods at cost {fmt(
            cargoAtCost(co),
          )} − Union {fmt(co.unionLoan)} − Zinn {fmt(co.zinnLoan)}
        </div>
      </div>
      <div class="coins">🪙</div>
    {:else if tab === 'history'}
      <svg viewBox="0 0 {W} {H}" class="chart">
        <line x1={PL} y1={y(0)} x2={W - 6} y2={y(0)} stroke="#000" />
        <line x1={PL} y1={6} x2={PL} y2={H - PB} stroke="#000" />
        <text x={PL - 4} y={y(maxY) + 10} font-size="11" text-anchor="end">{fmt(maxY / 1000)}k</text
        >
        <text x={PL - 4} y={y(0) + 4} font-size="11" text-anchor="end">0</text>
        {#if minY < 0}<text x={PL - 4} y={y(minY)} font-size="11" text-anchor="end"
            >{fmt(minY / 1000)}k</text
          >{/if}
        {#each hist as h, ci (ci)}
          {#if h.length > 1 && !s.companies[ci]!.bankrupt}
            <polyline
              points={h
                .map((v, i) => `${PL + (i / (h.length - 1)) * (W - PL - 10)},${y(v)}`)
                .join(' ')}
              fill="none"
              stroke={colors[ci % colors.length]}
              stroke-width={ci === game.ci ? 3 : 1.5}
            />
          {/if}
        {/each}
        <text x={W / 2} y={H - 4} font-size="11" text-anchor="middle"
          >last {hist[0]?.length ?? 0} weeks</text
        >
      </svg>
      <div class="legend">
        {#each s.companies as c, i (c.id)}<span style:color={colors[i % colors.length]}
            >■ {c.name}
            {c.bankrupt ? '(bust)' : fmt(atWeekStart(c))}</span
          >{/each}
      </div>
    {:else if tab === 'networth'}
      <div class="bars">
        <p class="note">Net worth as recorded at the start of week {s.week}.</p>
        {#each bars as { c, i, v } (c.id)}
          <div class="barrow">
            <span class="bn">{c.name}</span>
            <div
              class="bar"
              class:neg={v < 0}
              style:width={`${Math.max(2, (Math.abs(v) / maxAbs) * 100)}%`}
              style:background={colors[i % colors.length]}
            ></div>
            <span class="bv">{c.bankrupt ? 'BANKRUPT' : fmt(v)}</span>
          </div>
        {/each}
        <div class="goal">goal: {fmt(target)}</div>
      </div>
    {:else if tab === 'strength'}
      <div class="strength">
        <svg class="pie" viewBox="-110 -110 220 220" role="img" aria-label="Market strength">
          {#each slices as sl (sl.c.id)}
            <path d={sl.d} fill={colors[sl.i % colors.length]} stroke="#000" stroke-width="1.5" />
            {#if sl.frac > 0.07}
              <text
                x={sl.lx}
                y={sl.ly}
                font-size="12"
                font-weight="bold"
                fill="#fff"
                text-anchor="middle"
                dominant-baseline="middle">{Math.round(sl.frac * 100)}%</text
              >
            {/if}
          {/each}
        </svg>
        <div class="pielegend">
          <p class="note">
            Market strength is each company's share of the fleet's total mass. Ships start at 400
            tons; every enlargement won at auction adds 200.
          </p>
          {#each slices as sl (sl.c.id)}
            <div class="prow">
              <span class="swatch" style:background={colors[sl.i % colors.length]}></span>
              <span class="bn">{sl.c.name}</span>
              <span class="bv">{sl.c.ship.tons} t · {Math.round(sl.frac * 100)}%</span>
            </div>
          {/each}
        </div>
      </div>
    {:else if tab === 'players'}
      <div class="players">
        {#each s.companies as c, i (c.id)}
          <div class="pl" class:bust={c.bankrupt} style:border-color={colors[i % colors.length]}>
            <img
              class="face"
              class:empty={!faceOf(c)}
              src={faceOf(c) ?? BLANK}
              alt=""
              style:border-color={colors[i % colors.length]}
            />
            <div class="who">
              <b>{c.name}</b>
              <span class="tag">{c.isAI ? c.aiStyle : 'human'}</span>
              <span class="det">
                {SHIP_BY_ID(c.ship.defId).name} · {c.ship.tons} t · on {PLANET_BY_ID[
                  s.planets[companyLocation(s, i)]!.id
                ].name}
              </span>
              <span class="det">
                {c.bankrupt ? 'BANKRUPT' : `net worth ${fmt(netWorth(s, c))}`}
              </span>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="ship">
        <div
          class="pic"
          class:empty={!shipPic}
          style:background-image={shipPic ? `url(${shipPic})` : undefined}
        >
          {#if !shipPic}<span>{SHIP_BY_ID(co.ship.defId).name}</span>{/if}
        </div>
        <div class="plates">
          <Plate label="Ship:" value={SHIP_BY_ID(co.ship.defId).name} />
          <Plate label="Cargo bay:" value={`${co.ship.cargo} tons`} />
          <Plate label="Passenger seats:" value={co.ship.seats} />
          <Plate label="Fuel tank:" value={`${co.ship.fuelCap} tons`} />
          <Plate label="Engine:" value={`${co.ship.kuarps} kuarps`} />
          <Plate label="Crew:" value={co.ship.crew} />
          <Plate label="Class:" value={`${co.ship.tons}-ton`} />
        </div>
      </div>
    {/if}
  </div>
  <div class="iconbar">
    <Btn color="cyan" onclick={() => game.go('menu')}>Continue</Btn>
    <Btn color="cyan" disabled={!canPlot} onclick={() => (tab = 'history')}>Company History</Btn>
    <Btn color="cyan" onclick={() => (tab = 'networth')}>Net Worth</Btn>
    <Btn color="cyan" onclick={() => (tab = 'strength')}>Market Strength</Btn>
    <Btn color="cyan" onclick={() => (tab = 'players')}>Players</Btn>
    <Btn color="cyan" onclick={() => (tab = 'ship')}>Ship Info</Btn>
    <Btn color="cyan" onclick={() => game.help('money')}>Help</Btn>
  </div>
</div>

<style>
  .money {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: grid;
    grid-template-rows: 1fr 90px;
    gap: 8px;
    padding: 8px;
    box-sizing: border-box;
    color: #000;
  }
  .top {
    display: grid;
    grid-template-columns: 1fr;
    position: relative;
    overflow: hidden;
  }
  /* Ship Info: the dealer picture beside the spec plates */
  .ship {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 8px;
    height: 100%;
    min-height: 0;
  }
  .pic {
    background: #000 center / contain no-repeat;
    border: 2px solid;
    border-color: #404040 #fff #fff #404040;
  }
  .pic.empty {
    display: grid;
    place-items: center;
    background: radial-gradient(circle at 50% 40%, #303060, #000 70%);
    color: #fff;
    font: bold 15px var(--font-ui);
    text-align: center;
    padding: 8px;
  }
  .plates {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 330px;
    padding: 12px;
  }
  .breakdown {
    font: 11px var(--font-ui);
  }
  .coins {
    position: absolute;
    right: 40px;
    top: 30px;
    font-size: 150px;
    line-height: 1;
  }
  .chart {
    width: 100%;
    height: 100%;
    background: #fff;
    border: 2px inset #808080;
    font-family: var(--font-ui);
  }
  .legend {
    position: absolute;
    left: 70px;
    top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font: bold 10px var(--font-ui);
  }
  .bars {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font: bold 12px var(--font-ui);
  }
  .barrow {
    display: grid;
    grid-template-columns: 140px 1fr 90px;
    gap: 8px;
    align-items: center;
  }
  .bar {
    height: 22px;
    border: 1px solid #000;
    box-shadow: 2px 2px 0 #000;
    min-width: 2px;
  }
  .bv {
    text-align: right;
  }
  .neg {
    opacity: 0.45;
    background-image: repeating-linear-gradient(
      45deg,
      transparent 0 4px,
      rgba(0, 0, 0, 0.4) 4px 8px
    ) !important;
  }
  .goal,
  .note {
    font: 11px var(--font-ui);
    margin: 0;
  }
  .players {
    padding: 8px 10px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    align-content: start;
    overflow: auto;
    font: 11px var(--font-ui);
  }
  .pl {
    background: #fff;
    border-left: 8px solid;
    padding: 4px 6px;
    display: flex;
    gap: 6px;
    align-items: flex-start;
  }
  .pl.bust {
    opacity: 0.55;
  }
  .face {
    width: 44px;
    height: 56px;
    object-fit: cover;
    border: 2px solid;
    background: var(--c-navy);
    flex: none;
  }
  .face.empty {
    background: radial-gradient(circle at 50% 35%, #6060c0, #202060 70%);
  }
  .who {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .tag {
    color: #505050;
    font-style: italic;
  }
  .det {
    color: #303030;
  }
  /* market strength */
  .strength {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 10px;
    padding: 10px;
    align-items: center;
    min-height: 0;
  }
  .pie {
    width: 100%;
    max-height: 240px;
  }
  .pielegend {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font: bold 12px var(--font-ui);
  }
  .prow {
    display: grid;
    grid-template-columns: 16px 1fr 120px;
    gap: 8px;
    align-items: center;
  }
  .swatch {
    width: 14px;
    height: 14px;
    border: 1px solid #000;
  }
  .iconbar {
    display: flex;
    gap: 6px;
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    padding: 6px;
  }
  .iconbar :global(.btn) {
    flex: 1;
    white-space: normal;
    font-size: 12px;
  }
</style>
