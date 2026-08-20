<script lang="ts">
  import { LEVEL_BY_ID, PLANET_BY_ID, SHIP_BY_ID, netWorth, sharesValue } from '../../engine';
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
  const alive = $derived(s.companies.map((c, i) => ({ c, i })).filter((x) => !x.c.bankrupt));
  const colors = ['#ff0000', '#00c000', '#0000ff', '#ff00ff', '#00c0c0', '#c0c000', '#ff8000'];
  const status = $derived(
    nw < 0
      ? 'Struggling'
      : nw < target * 0.1
        ? 'Modest'
        : nw < target * 0.4
          ? 'Respectable'
          : nw < target * 0.8
            ? 'Formidable'
            : 'Supreme',
  );
  // history chart
  const W = 600,
    H = 250,
    PL = 60,
    PB = 20;
  const hist = $derived(s.companies.map((c) => c.netWorthHistory.slice(-20)));
  const all = $derived(hist.flat());
  const minY = $derived(Math.min(0, ...all));
  const maxAbs = $derived(Math.max(1, ...s.companies.map((c) => Math.abs(netWorth(s, c)))));
  const maxY = $derived(Math.max(100000, ...all));
  const y = (v: number) => H - PB - ((v - minY) / (maxY - minY)) * (H - PB - 10);
  const shipPic = $derived(img(`ship.${co.ship.defId}.picture`));
  const strengthTotal = $derived(
    alive.reduce((a, x) => a + x.c.ship.cargo + x.c.ship.seats * 10, 0),
  );
</script>

<div class="money">
  <div class="top">
    {#if tab === 'summary'}
      <div class="plates">
        <Plate label="Net Worth:" value={fmt(nw)} color="yellow" />
        <Plate label="Game Level:" value={level.name} color="yellow" />
        <Plate label="Company Status:" value={status} color="yellow" />
        <Plate label="Goal:" value={`${fmt(target)} net worth`} color="yellow" />
        <div class="breakdown">
          cash {fmt(co.cash)} + bank {fmt(co.bank)} + shares {fmt(sharesValue(s, co))} − Union {fmt(
            co.unionLoan,
          )} − Zinn {fmt(co.zinnLoan)}
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
            >■ {c.name}{c.bankrupt ? ' (bust)' : ''}</span
          >{/each}
      </div>
    {:else if tab === 'networth'}
      <div class="bars">
        {#each s.companies as c, i (c.id)}
          {@const v = netWorth(s, c)}
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
      <div class="bars">
        <p class="note">Market strength = share of total cargo &amp; passenger capacity.</p>
        {#each alive as { c, i } (c.id)}
          {@const v = (c.ship.cargo + c.ship.seats * 10) / strengthTotal}
          <div class="barrow">
            <span class="bn">{c.name}</span>
            <div
              class="bar"
              style:width={`${v * 100}%`}
              style:background={colors[i % colors.length]}
            ></div>
            <span class="bv">{Math.round(v * 100)}%</span>
          </div>
        {/each}
      </div>
    {:else if tab === 'players'}
      <div class="players">
        {#each s.companies as c, i (c.id)}
          <div class="pl" style:border-color={colors[i % colors.length]}>
            <b>{c.name}</b>
            {c.isAI ? `(computer, ${c.aiStyle})` : '(human)'}<br />
            {SHIP_BY_ID(c.ship.defId).name} · on {PLANET_BY_ID[s.planets[c.planet]!.id].name} · net worth
            {fmt(netWorth(s, c))}{c.bankrupt ? ' · BANKRUPT' : ''}
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
    <Btn color="cyan" onclick={() => (tab = 'history')}>Company History</Btn>
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
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font: 12px var(--font-ui);
  }
  .pl {
    background: #fff;
    border-left: 8px solid;
    padding: 4px 8px;
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
