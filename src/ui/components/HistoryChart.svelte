<script lang="ts">
  /** Every company's net worth week by week — the original's Company History line chart. */
  import type { GameState } from '../../engine';
  import { atWeekStart, colorOf, histSeries } from '../charts';
  import { fmt } from '../format';

  const { s, highlight = -1 }: { s: GameState; highlight?: number } = $props();

  const W = 600,
    H = 250,
    PL = 60,
    PB = 20;
  const hist = $derived(histSeries(s));
  const all = $derived(hist.flat());
  const minY = $derived(Math.min(0, ...all));
  const maxY = $derived(Math.max(100000, ...all));
  const y = (v: number) => H - PB - ((v - minY) / (maxY - minY)) * (H - PB - 10);
</script>

<svg viewBox="0 0 {W} {H}" class="chart">
  <line x1={PL} y1={y(0)} x2={W - 6} y2={y(0)} stroke="#000" />
  <line x1={PL} y1={6} x2={PL} y2={H - PB} stroke="#000" />
  <text x={PL - 4} y={y(maxY) + 10} font-size="11" text-anchor="end">{fmt(maxY / 1000)}k</text>
  <text x={PL - 4} y={y(0) + 4} font-size="11" text-anchor="end">0</text>
  {#if minY < 0}<text x={PL - 4} y={y(minY)} font-size="11" text-anchor="end"
      >{fmt(minY / 1000)}k</text
    >{/if}
  {#each hist as h, ci (ci)}
    {#if h.length > 1 && !s.companies[ci]!.bankrupt}
      <polyline
        points={h.map((v, i) => `${PL + (i / (h.length - 1)) * (W - PL - 10)},${y(v)}`).join(' ')}
        fill="none"
        stroke={colorOf(ci)}
        stroke-width={ci === highlight ? 3 : 1.5}
      />
    {/if}
  {/each}
  <text x={W / 2} y={H - 4} font-size="11" text-anchor="middle"
    >last {hist[0]?.length ?? 0} weeks</text
  >
</svg>
<div class="legend">
  {#each s.companies as c, i (c.id)}<span style:color={colorOf(i)}
      >■ {c.name}
      {c.bankrupt ? '(bust)' : fmt(atWeekStart(c))}</span
    >{/each}
</div>

<style>
  .chart {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
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
</style>
