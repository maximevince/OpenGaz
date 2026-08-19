<script lang="ts">
  import {
    netWorth,
    newsHeadline,
    planetName,
    weatherForecast,
    weatherIsHazard,
  } from '../../engine';
  import Btn from '../components/Btn.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';

  const s = $derived(game.s);
  const target = $derived(s.settings.targetNetWorth);
  const standings = $derived(
    s.companies
      .map((c, i) => ({ c, i, nw: netWorth(s, c) }))
      .sort((a, b) => (a.c.bankrupt ? 1 : 0) - (b.c.bankrupt ? 1 : 0) || b.nw - a.nw),
  );
  const leader = $derived(standings[0]);
  /** the week's rival moves and auction results, newest last */
  const chatter = $derived(s.log.filter((l) => l.company === -1 && l.week >= s.week - 1).slice(-4));
</script>

<div class="report">
  <div class="title">Week {s.week} — Company Standings</div>

  <div class="grid">
    <table>
      <thead>
        <tr>
          <th class="rank">#</th>
          <th class="who">Company</th>
          <th>Net Worth</th>
          <th>% of Goal</th>
          <th>Ship</th>
          <th>Located</th>
        </tr>
      </thead>
      <tbody>
        {#each standings as row, n (row.c.id)}
          <tr class:me={!row.c.isAI} class:bust={row.c.bankrupt}>
            <td class="rank">{row.c.bankrupt ? '—' : n + 1}</td>
            <td class="who">{row.c.name}{row.c.isAI ? '' : ' ★'}</td>
            <td class="nw" class:neg={row.nw < 0}>
              {row.c.bankrupt ? 'BANKRUPT' : fmt(row.nw)}
            </td>
            <td>{row.c.bankrupt ? '—' : `${Math.round((row.nw / target) * 100)}%`}</td>
            <td>{row.c.ship.tons} t</td>
            <td>{planetName(s, row.c.planet)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="goal">
    Goal: <b>{fmt(target)}</b> kubars net worth · leading:
    <b>{leader ? leader.c.name : '—'}</b>
  </div>

  <div class="cols">
    <div class="box news">
      <div class="head">Kuku News</div>
      <p>{newsHeadline(s)}</p>
      {#each chatter as l, i (i)}<p class="small">{l.text}</p>{/each}
    </div>
    <div class="box weather" class:hazard={weatherIsHazard(s)}>
      <div class="head">
        Weather Bureau — {planetName(s, s.weatherPlanet)}
      </div>
      <p>{weatherForecast(s)}</p>
    </div>
  </div>

  <div class="buttons">
    <Btn color="green" onclick={() => game.closeReport()}>Begin Week {s.week}</Btn>
  </div>
</div>

<style>
  .report {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 6px;
    box-sizing: border-box;
    color: #000;
  }
  .title {
    background: var(--c-navy);
    color: #fff;
    font:
      bold 20px/1.2 Georgia,
      serif;
    text-align: center;
    padding: 5px;
    border: 2px solid;
    border-color: #4040ff #000030 #000030 #4040ff;
  }
  /* the standings stretch; the two report boxes keep a fixed band at the bottom */
  .grid {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    height: 100%;
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
    background: var(--c-face);
    font-size: 11px;
  }
  .rank {
    width: 22px;
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
  .nw {
    color: #004000;
  }
  .nw.neg {
    color: #800000;
  }
  .goal {
    background: #000;
    color: var(--c-green-grid);
    font: bold 11px/1.2 var(--font-ui);
    text-align: center;
    padding: 3px;
  }
  .cols {
    display: flex;
    gap: 5px;
    flex: 0 0 132px;
    min-height: 0;
  }
  .box {
    flex: 1;
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    padding: 5px 7px;
    overflow: auto;
    font: 11px/1.3 var(--font-ui);
  }
  .box p {
    margin: 0 0 4px;
  }
  .box .small {
    font-size: 10px;
    color: #303030;
  }
  .head {
    font: bold 12px var(--font-ui);
    color: var(--c-navy);
    margin-bottom: 3px;
  }
  .weather.hazard {
    background: #ffe0e0;
  }
  .weather.hazard .head {
    color: #800000;
  }
  .buttons :global(.btn) {
    width: 100%;
    font-size: 15px;
    padding: 6px;
  }
</style>
