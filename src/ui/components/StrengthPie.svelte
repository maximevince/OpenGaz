<script lang="ts">
  /** Market strength: each company's share of the fleet's total mass, as a pie. */
  import type { GameState } from '../../engine';
  import { colorOf } from '../charts';

  const { s }: { s: GameState } = $props();

  const alive = $derived(s.companies.map((c, i) => ({ c, i })).filter((x) => !x.c.bankrupt));
  const total = $derived(alive.reduce((a, x) => a + x.c.ship.tons, 0));
  const R = 92;
  /** pie slices, each carrying the SVG path for its wedge */
  const slices = $derived.by(() => {
    let from = -Math.PI / 2;
    return alive.map(({ c, i }) => {
      const frac = c.ship.tons / Math.max(1, total);
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

<div class="strength">
  <svg class="pie" viewBox="-110 -110 220 220" role="img" aria-label="Market strength">
    {#each slices as sl (sl.c.id)}
      <path d={sl.d} fill={colorOf(sl.i)} stroke="#000" stroke-width="1.5" />
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
      Market strength is each company's share of the fleet's total mass. Ships start at 400 tons;
      every enlargement won at auction adds 200.
    </p>
    {#each slices as sl (sl.c.id)}
      <div class="prow">
        <span class="swatch" style:background={colorOf(sl.i)}></span>
        <span class="bn">{sl.c.name}</span>
        <span class="bv">{sl.c.ship.tons} t · {Math.round(sl.frac * 100)}%</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .strength {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 10px;
    padding: 10px;
    align-items: center;
    min-height: 0;
    font: bold 12px var(--font-ui);
  }
  .pie {
    width: 100%;
    max-height: 240px;
  }
  .pielegend {
    display: flex;
    flex-direction: column;
    gap: 4px;
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
  .bv {
    text-align: right;
  }
  .note {
    font: 11px var(--font-ui);
    margin: 0;
  }
</style>
