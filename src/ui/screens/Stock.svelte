<script lang="ts">
  import { PLANET_BY_ID } from '../../engine';
  import Btn from '../components/Btn.svelte';
  import Prompt from '../components/Prompt.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';
  import { play } from '../sound';
  const s = $derived(game.s);
  const co = $derived(game.co);
  let view = $state(-1); // -1 = local exchange
  const pi = $derived(view < 0 ? co.planet : view);
  const p = $derived(s.planets[pi]!);
  const ex = $derived(p.exchange);
  const local = $derived(pi === co.planet);
  const lot = $derived(co.shares[pi]);
  const maxBuy = $derived(
    ex.crashed || co.stockBoughtThisWeek ? 0 : Math.floor((0.5 * (co.cash + co.bank)) / ex.price),
  );
  let mode: 'buy' | 'sell' | null = $state(null);
  /** a crashed board announces itself — the shares are already gone by the time you look */
  $effect(() => {
    if (ex.crashed) play('stock.crash');
  });

  // chart geometry
  const W = 400,
    H = 330,
    PL = 44,
    PB = 24;
  const hist = $derived(ex.history.slice(-16));
  const maxY = $derived(Math.max(1500, ...hist) * 1.05);
  const pts = $derived(
    hist
      .map(
        (v, i) =>
          `${PL + (i / Math.max(1, hist.length - 1)) * (W - PL - 10)},${H - PB - (v / maxY) * (H - PB - 10)}`,
      )
      .join(' '),
  );
  const firstWeek = $derived(s.week - hist.length + 1);
</script>

<div class="stock">
  <svg class="chart" viewBox="0 0 {W} {H}">
    <line x1={PL} y1={10} x2={PL} y2={H - PB} stroke="#fff" />
    <line x1={PL} y1={H - PB} x2={W - 6} y2={H - PB} stroke="#fff" />
    {#each [0, 500, 1000, 1500, 2000, 2500, 3000] as y (y)}
      {#if y <= maxY}
        <text
          x={PL - 6}
          y={H - PB - (y / maxY) * (H - PB - 10) + 4}
          fill="#fff"
          font-size="11"
          text-anchor="end">{y}</text
        >
        <line
          x1={PL - 3}
          y1={H - PB - (y / maxY) * (H - PB - 10)}
          x2={PL}
          y2={H - PB - (y / maxY) * (H - PB - 10)}
          stroke="#fff"
        />
      {/if}
    {/each}
    {#each hist.keys() as i (i)}
      <text
        x={PL + (i / Math.max(1, hist.length - 1)) * (W - PL - 10)}
        y={H - 8}
        fill="#fff"
        font-size="10"
        text-anchor="middle">{firstWeek + i}</text
      >
    {/each}
    <polyline points={pts} fill="none" stroke="#ff2020" stroke-width="3" />
  </svg>
  <div class="side">
    <div class="ex">{PLANET_BY_ID[p.id].exchange}</div>
    <div class="sub">Planetary Stock Market</div>
    <div class="kv">
      Current Price: <b>{ex.crashed ? 'CLOSED (crashed)' : fmt(ex.price)}</b>
    </div>
    <div class="kv">Price You Paid: <b>{lot ? fmt(lot.paid) : 0}</b></div>
    <div class="kv">Your Stock: <b>{lot?.tons ?? 0} shares</b></div>
    <div class="kv">Cash: <b>{fmt(co.cash)} kubars</b></div>
    <div class="kv">Bank: <b>{fmt(co.bank)} kubars</b></div>
    <div class="kv">Loan: <b>{fmt(co.unionLoan)} kubars</b></div>
    {#if !local}<div class="note">
        You can only trade on the exchange of the planet you are on.
      </div>{/if}
    {#if co.stockBoughtThisWeek}<div class="note">
        One purchase per week — come back next week.
      </div>{/if}
  </div>
  <div class="buttons">
    <Btn onclick={() => game.go('menu')}>Continue</Btn>
    <Btn onclick={() => (mode = 'buy')} disabled={!local || maxBuy <= 0}>Buy</Btn>
    <Btn onclick={() => (mode = 'sell')} disabled={!local || !lot || ex.crashed}>Sell</Btn>
    <Btn onclick={() => (view = (pi + 1) % s.planets.length)}>Show Next</Btn>
    <Btn onclick={() => (view = -1)}>Show Local</Btn>
    <Btn onclick={() => game.go('money')}>Show Shares</Btn>
    <Btn onclick={() => game.help()}>Help</Btn>
  </div>
</div>

{#if mode === 'buy'}
  <Prompt
    title="Buy how many shares?"
    text={`Price ${fmt(ex.price)} + 1% commission. Max 50% of your cash per week.`}
    initial={maxBuy}
    max={maxBuy}
    presets={[
      { label: 'Max', value: maxBuy },
      { label: 'Half', value: Math.floor(maxBuy / 2) },
    ]}
    onok={(n) => {
      game.dispatch({ type: 'stockBuy', shares: n });
      mode = null;
    }}
    oncancel={() => (mode = null)}
  />
{:else if mode === 'sell' && lot}
  <Prompt
    title="Sell how many shares?"
    text={`Price ${fmt(ex.price)} − 1% commission.`}
    initial={lot.tons}
    max={lot.tons}
    presets={[
      { label: 'All', value: lot.tons },
      { label: 'Half', value: Math.floor(lot.tons / 2) },
    ]}
    onok={(n) => {
      game.dispatch({ type: 'stockSell', shares: n });
      mode = null;
    }}
    oncancel={() => (mode = null)}
  />
{/if}

<style>
  .stock {
    position: absolute;
    inset: 0;
    background: #000;
    color: #fff;
    display: grid;
    grid-template-columns: 1fr 200px;
    grid-template-rows: 1fr 44px;
    gap: 8px;
    padding: 8px;
    box-sizing: border-box;
  }
  .chart {
    width: 100%;
    height: 100%;
  }
  .side {
    color: #ff2020;
    font: bold 13px var(--font-ui);
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 20px;
  }
  .ex {
    font-size: 15px;
  }
  .kv b {
    display: block;
    color: #ff6060;
  }
  .note {
    color: #c0c0c0;
    font-weight: normal;
    font-size: 11px;
  }
  .buttons {
    grid-column: 1 / -1;
    display: flex;
    gap: 4px;
  }
  .buttons :global(.btn) {
    flex: 1;
    font-size: 12px;
    padding: 4px;
  }
</style>
