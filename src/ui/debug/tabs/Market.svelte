<script lang="ts">
  /**
   * The whole economy on one screen: 18 commodities × 7 planets.
   *
   * Prices are shaded against each commodity's own band for the level, so a cell that is dark
   * is cheap *for that good* — which is the judgement a trader makes and the one balance work
   * needs to see all at once.
   */
  import { PLANET_BY_ID, type GameState } from '../../../engine';
  import { bands, marketGrid, type Metric } from '../inspect';

  let { s }: { s: GameState } = $props();

  let metric = $state<Metric>('price');
  const grid = $derived(marketGrid(s, metric));
  const band = $derived(bands(s));
  const heads = $derived(s.planets.map((p) => PLANET_BY_ID[p.id].name.slice(0, 4)));
  const shade = (h: number) => `background: rgba(120, 200, 255, ${(0.05 + h * 0.5).toFixed(3)})`;
</script>

<div class="bar">
  {#each ['price', 'supply', 'stock'] as const as m (m)}
    <button class="tog" class:on={metric === m} onclick={() => (metric = m)}>{m}</button>
  {/each}
  <span class="dim"
    >{metric === 'price'
      ? 'shaded within each price band'
      : metric === 'supply'
        ? 'comR 0–100'
        : 'tons on the market'}</span
  >
</div>

<table class="dbg-t grid tight">
  <thead>
    <tr>
      <th>commodity</th>
      {#each heads as h, i (i)}<th class="num">{h}</th>{/each}
      {#if metric === 'price'}<th class="num">band</th>{/if}
    </tr>
  </thead>
  <tbody>
    {#each grid as row, ri (row.id)}
      <tr>
        <td>{row.name}</td>
        {#each row.cells as c, ci (ci)}
          <td class="num" style={shade(c.heat)} title={c.title}>{c.value}</td>
        {/each}
        {#if metric === 'price'}
          <td class="num dim">{band[ri]?.min}–{band[ri]?.max}</td>
        {/if}
      </tr>
    {/each}
  </tbody>
</table>
