<script lang="ts">
  import {
    PLANET_BY_ID,
    companyLocation,
    distanceBetween,
    facilityHoldings,
    humanTravelTime,
    planetName,
  } from '../../engine';
  import Btn from '../components/Btn.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';

  const s = $derived(game.s);
  const co = $derived(game.co);
  /** the planet both charts are measured against — your own by default */
  let target = $state(-1);
  const t = $derived(target < 0 ? co.planet : target);
  let tab: 'distance' | 'facilities' = $state('distance');

  const holdings = $derived(facilityHoldings(s, t).filter((h) => h.count > 0));
  const owedHere = $derived(
    holdings.filter((h) => h.company !== game.ci).reduce((a, h) => a + h.fee, 0),
  );
</script>

<div class="charts">
  <div class="title">
    {tab === 'distance' ? 'Distance Chart' : 'Facilities Chart'} — {planetName(s, t)}
  </div>

  <div class="picker">
    {#each s.planets as p, i (p.id)}
      <button class:on={i === t} class:home={i === co.planet} onclick={() => (target = i)}>
        {PLANET_BY_ID[p.id].name}
      </button>
    {/each}
  </div>

  <div class="grid">
    {#if tab === 'distance'}
      <table>
        <thead>
          <tr>
            <th class="who">Company</th>
            <th>Located</th>
            <th>Engine</th>
            <th>Distance</th>
            <th>Travel time</th>
          </tr>
        </thead>
        <tbody>
          {#each s.companies as c, i (c.id)}
            {@const at = companyLocation(s, i)}
            {@const d = distanceBetween(s, at, t)}
            <tr class:me={i === game.ci} class:bust={c.bankrupt}>
              <td class="who">{c.name}</td>
              {#if c.bankrupt}
                <td>—</td><td>—</td><td>—</td><td>—</td>
              {:else}
                <td>{planetName(s, at)}</td>
                <td>{c.ship.kuarps} kuarps</td>
                <td>{at === t ? '—' : `${d.toFixed(1)} m.kuters`}</td>
                <td>{at === t ? '—' : `${humanTravelTime(d, c.ship.kuarps, 1)} days`}</td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <table>
        <thead>
          <tr>
            <th class="who">Company</th>
            <th>Facilities</th>
            <th>Landing fee</th>
            <th>Fees banked</th>
          </tr>
        </thead>
        <tbody>
          {#each holdings as h (h.company)}
            <tr class:me={h.company === game.ci}>
              <td class="who">{s.companies[h.company]?.name}</td>
              <td>{h.count}</td>
              <td>{fmt(h.fee)}</td>
              <td>{h.company === game.ci ? fmt(h.revenue) : '—'}</td>
            </tr>
          {/each}
          {#if holdings.length === 0}
            <tr><td class="empty" colspan="4">Nobody owns a facility on {planetName(s, t)}.</td></tr
            >
          {/if}
        </tbody>
      </table>
    {/if}
  </div>

  <div class="foot">
    {#if tab === 'distance'}
      A company that has already flown this week is shown where its ship is parked, not where it is
      headed. Travel time is what the trip would cost that engine.
    {:else if owedHere > 0}
      Landing on {planetName(s, t)} costs you {fmt(owedHere)} kubars in fees. Fees you are owed wait on
      the planet until you land there yourself.
    {:else}
      Emperor Dred privatises one government facility at a time. Its owner charges every other
      company a landing fee, collected when the owner next touches down.
    {/if}
  </div>

  <div class="buttons">
    <Btn color="black" onclick={() => game.go('map')}>Back to Map</Btn>
    <Btn color="black" onclick={() => (tab = 'distance')}>Distances</Btn>
    <Btn color="black" onclick={() => (tab = 'facilities')}>Facilities</Btn>
    <Btn color="black" onclick={() => game.help()}>Help</Btn>
  </div>
</div>

<style>
  .charts {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 5px;
    box-sizing: border-box;
    color: #000;
  }
  .title {
    background: var(--c-navy);
    color: #fff;
    font: bold 14px/1.2 var(--font-ui);
    text-align: center;
    padding: 4px;
    border: 2px solid;
    border-color: #4040ff #000030 #000030 #4040ff;
  }
  .picker {
    display: flex;
    gap: 4px;
  }
  .picker button {
    flex: 1;
    font: bold 11px/1.15 var(--font-ui);
    padding: 4px 2px;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    background: var(--c-face);
    cursor: pointer;
  }
  .picker button.home {
    background: var(--c-yellow-plate);
  }
  .picker button.on {
    border-color: #404040 #fff #fff #404040;
    background: var(--c-cyan-plate);
  }
  .grid {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  /* natural height: both charts have few rows, so the panel simply ends after the last one */
  table {
    border-collapse: collapse;
    width: 100%;
    background: var(--c-green-grid);
    font: bold 12px/1.2 var(--font-ui);
  }
  th,
  td {
    border: 1px solid #000;
    padding: 2px 5px;
    text-align: center;
  }
  th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--c-face);
    font-size: 11px;
  }
  td.who {
    background: var(--c-face);
    text-align: left;
  }
  tr.me td.who {
    background: var(--c-yellow-plate);
  }
  tr.bust td {
    color: #808080;
  }
  td.empty {
    background: var(--c-face);
    font-weight: normal;
    font-style: italic;
  }
  .foot {
    background: #000;
    color: var(--c-green-grid);
    font: bold 10px/1.25 var(--font-ui);
    text-align: center;
    padding: 4px;
  }
  .buttons {
    display: flex;
    gap: 4px;
  }
  .buttons :global(.btn) {
    flex: 1;
    font-size: 13px;
    padding: 4px;
  }
</style>
