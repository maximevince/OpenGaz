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
  import HistoryChart from '../components/HistoryChart.svelte';
  import Plate from '../components/Plate.svelte';
  import StrengthPie from '../components/StrengthPie.svelte';
  import { atWeekStart, canPlotHistory, colorOf } from '../charts';
  import { fmt } from '../format';
  import { game } from '../game.svelte';
  const s = $derived(game.s);
  const co = $derived(game.co);
  const nw = $derived(netWorth(s, co));
  const level = $derived(LEVEL_BY_ID(s.settings.level));
  const target = $derived(s.settings.targetNetWorth);
  let tab: 'summary' | 'history' | 'networth' | 'strength' | 'players' | 'ship' = $state('summary');
  const status = $derived(companyStatus(nw));
  const nwStart = $derived(atWeekStart(co));
  /** week 1 has a single recording, so the history line has nothing to join up yet */
  const canPlot = $derived(canPlotHistory(s));
  const shipPic = $derived(img(`ship.${co.ship.defId}.picture`));
  /**
   * Rival card art. These are the original's landscape creature cards — a whole creature on
   * black, 320x200 — not busts, so the frame they hang in has to be landscape too.
   */
  const faceOf = (c: (typeof s.companies)[number]) =>
    c.isAI ? (img(`portrait.op${c.aiIndex}`) ?? null) : null;
  /** the original had art for the six rivals only, so a human company gets its monogram */
  const monogram = (name: string) =>
    name
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?';

  // net-worth bars use the recorded figure, so they agree with the history line's last point
  const bars = $derived(s.companies.map((c, i) => ({ c, i, v: atWeekStart(c) })));
  /**
   * The bars diverge from a shared zero: debt grows left, worth grows right, both measured
   * against the same kubar-per-pixel scale. The track is split by the deepest debt's share of
   * the whole span, so with nobody in the red the zero line sits flush against the left edge
   * and the bars read exactly as they did before.
   */
  const maxNeg = $derived(Math.max(0, ...bars.map((b) => -b.v)));
  const maxPos = $derived(Math.max(0, ...bars.map((b) => b.v)));
  const span = $derived(Math.max(1, maxNeg + maxPos));
  const negFrac = $derived(maxNeg / span);
  /** length within a half; the halves are already proportional, so this stays to scale */
  const barPct = (v: number, max: number) => Math.max(2, (Math.abs(v) / max) * 100);
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
          cash {fmt(co.cash)} + bank {fmt(co.bank)} + shares {fmt(sharesValue(s, co))} + goods at cost
          {fmt(cargoAtCost(co))} − Union {fmt(co.unionLoan)} − Zinn {fmt(co.zinnLoan)}
        </div>
      </div>
      <div class="coins">🪙</div>
    {:else if tab === 'history'}
      <HistoryChart {s} highlight={game.ci} />
    {:else if tab === 'networth'}
      <div class="bars">
        <p class="note">Net worth as recorded at the start of week {s.week}.</p>
        {#each bars as { c, i, v } (c.id)}
          <div class="barrow">
            <span class="bn">{c.name}</span>
            <div
              class="track"
              style:grid-template-columns={`${negFrac * 100}% ${(1 - negFrac) * 100}%`}
              style:--zero={`${negFrac * 100}%`}
            >
              <div class="half owed">
                {#if v < 0}
                  <div
                    class="bar neg"
                    style:width={`${barPct(v, maxNeg)}%`}
                    style:background={colorOf(i)}
                  ></div>
                {/if}
              </div>
              <div class="half worth">
                {#if v > 0}
                  <div
                    class="bar"
                    style:width={`${barPct(v, maxPos)}%`}
                    style:background={colorOf(i)}
                  ></div>
                {/if}
              </div>
            </div>
            <span class="bv" class:red={v < 0}>{c.bankrupt ? 'BANKRUPT' : fmt(v)}</span>
          </div>
        {/each}
        <div class="goal">goal: {fmt(target)}</div>
      </div>
    {:else if tab === 'strength'}
      <StrengthPie {s} />
    {:else if tab === 'players'}
      <div class="players">
        {#each s.companies as c, i (c.id)}
          {@const face = faceOf(c)}
          <div class="pl" class:bust={c.bankrupt} style:border-color={colorOf(i)}>
            {#if face}
              <img class="face" src={face} alt="" style:border-color={colorOf(i)} />
            {:else}
              <div class="face mono" style:border-color={colorOf(i)} style:background={colorOf(i)}>
                {monogram(c.name)}
              </div>
            {/if}
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
  .track {
    display: grid;
    align-items: center;
    /* the zero line, drawn on the seam between the two halves */
    background: linear-gradient(#000, #000) no-repeat;
    background-size: 1px 100%;
    background-position-x: var(--zero, 0);
  }
  .half {
    display: flex;
    min-width: 0;
  }
  .half.owed {
    justify-content: flex-end;
  }
  .bar {
    height: 22px;
    border: 1px solid #000;
    box-shadow: 2px 2px 0 #000;
  }
  .bv {
    text-align: right;
  }
  .bv.red {
    color: #a00000;
  }
  .neg {
    box-shadow: -2px 2px 0 #000;
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
  /* the rival cards are 320x200: a landscape frame, and contain so nothing is cropped away */
  .face {
    width: 88px;
    height: 55px;
    object-fit: contain;
    border: 2px solid;
    background: #000;
    flex: none;
  }
  .face.mono {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font: bold 22px/1 var(--font-ui);
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.6);
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
