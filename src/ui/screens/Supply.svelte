<script lang="ts">
  import { COMMODITY_BY_ID, PLANET_BY_ID, distanceBetween } from '../../engine';
  import Btn from '../components/Btn.svelte';
  import { game } from '../game.svelte';
  const co = $derived(game.co);
  const s = $derived(game.s);
  let sel: number | null = $state(null);
  // lowest supply per commodity (red arrow), and per planet lowest
  const lowest = $derived(
    Object.fromEntries(
      s.commodities.map((c) => {
        let best = 0;
        for (let i = 1; i < s.planets.length; i++)
          if ((s.planets[i]!.supply[c] ?? 50) < (s.planets[best]!.supply[c] ?? 50)) best = i;
        return [c, best];
      }),
    ) as Record<string, number>,
  );
</script>

<div class="supply">
  <div class="title">Supply Chart — how plentiful each commodity is on every planet</div>
  <div class="hint">
    0% = rare and expensive · 100% = plentiful and cheap. ◆ = you. Click a planet column to see the
    distance.
  </div>
  <table>
    <thead>
      <tr>
        <th></th>
        {#each s.planets as p, i (p.id)}
          <th class:me={i === co.planet} class:sel={sel === i} onclick={() => (sel = i)}>
            {PLANET_BY_ID[p.id].name}{i === co.planet ? ' ◆' : ''}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each s.commodities as c (c)}
        <tr>
          <td class="name">{COMMODITY_BY_ID[c].name}</td>
          {#each s.planets as p, i (p.id)}
            <td class:low={lowest[c] === i} class:sel={sel === i}
              >{Math.round(p.supply[c] ?? 0)}%</td
            >
          {/each}
        </tr>
      {/each}
      <tr class="dist">
        <td class="name">Distance</td>
        {#each s.planets as p, i (p.id)}
          <td class:sel={sel === i}
            >{i === co.planet ? '—' : `${distanceBetween(s, co.planet, i)}`}</td
          >
        {/each}
      </tr>
    </tbody>
  </table>
  <div class="foot">
    {#if sel !== null && sel !== co.planet}
      {PLANET_BY_ID[s.planets[sel]!.id].name} is {distanceBetween(s, co.planet, sel)} million kuters away
      · about
      {((distanceBetween(s, co.planet, sel) * 5) / co.ship.kuarps).toFixed(1)} days at {co.ship
        .kuarps} kuarps
    {:else}
      Prices are highest where supply is lowest. Red = the scarcest planet for that commodity.
    {/if}
  </div>
  <div class="buttons">
    <Btn color="green" onclick={() => game.go('menu')}>Continue</Btn>
    <Btn color="green" onclick={() => game.go('market')}>Marketplace</Btn>
    <Btn color="green" onclick={() => game.go('map')}>Galaxy Map</Btn>
    <Btn color="green" onclick={() => game.help()}>Help</Btn>
  </div>
</div>

<style>
  .supply {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
    box-sizing: border-box;
    color: #000;
  }
  .title {
    background: var(--c-navy);
    color: #fff;
    font: bold 14px var(--font-ui);
    text-align: center;
    padding: 5px;
  }
  .hint,
  .foot {
    background: #000;
    color: var(--c-green-grid);
    font: bold 11px var(--font-ui);
    text-align: center;
    padding: 4px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    flex: 1;
    background: var(--c-green-grid);
    font: bold 12px var(--font-ui);
  }
  th,
  td {
    border: 1px solid #000;
    padding: 3px;
    text-align: center;
  }
  th {
    background: var(--c-face);
    cursor: pointer;
  }
  th.me {
    background: var(--c-yellow-plate);
  }
  .sel {
    outline: 2px solid #ff0;
    outline-offset: -2px;
  }
  td.name {
    background: var(--c-face);
    text-align: left;
    padding-left: 8px;
  }
  td.low {
    color: #c00000;
    background: #ffe0e0;
  }
  .dist td {
    background: var(--c-cyan-plate);
  }
  .buttons {
    display: flex;
    gap: 6px;
  }
  .buttons :global(.btn) {
    flex: 1;
    font-size: 15px;
    padding: 6px;
  }
</style>
