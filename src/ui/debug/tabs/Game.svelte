<script lang="ts">
  /** The scalars that decide what the game is doing right now. */
  import {
    LEVEL_BY_ID,
    newsHeadline,
    planetName,
    weatherForecast,
    weatherIsHazard,
    type GameState,
  } from '../../../engine';
  import { game } from '../../game.svelte';
  import { online } from '../../../net/online.svelte';
  import { sizes } from '../inspect';

  let { s }: { s: GameState } = $props();

  const level = $derived(LEVEL_BY_ID(s.settings.level));
  const size = $derived(sizes(s));
  const order = $derived(
    s.order.map((ci, i) => `${i === s.turnIndex ? '>' : ''}${ci}`).join(' ') || '—',
  );
</script>

<table class="dbg-t">
  <tbody>
    <tr><td class="k">week</td><td>{s.week}</td></tr>
    <tr><td class="k">phase</td><td>{s.phase}</td></tr>
    <tr><td class="k">screen</td><td>{game.screen}</td></tr>
    <tr><td class="k">turn order</td><td>{order} (turnIndex {s.turnIndex})</td></tr>
    <tr
      ><td class="k">destination</td><td
        >{s.destination === null ? '—' : `${s.destination} ${planetName(s, s.destination)}`}</td
      ></tr
    >
    <tr><td class="k">awaitingHandoff</td><td>{s.awaitingHandoff}</td></tr>
    <tr><td class="k">sellingProfit</td><td>{s.sellingProfit}</td></tr>
    <tr
      ><td class="k">winner</td><td
        >{s.winner === null ? '—' : `${s.winner} ${s.companies[s.winner]?.name ?? '?'}`}</td
      ></tr
    >
    <tr><td class="k">target</td><td>{s.settings.targetNetWorth.toLocaleString('en-US')}</td></tr>

    <tr class="sec"><td colspan="2">rules</td></tr>
    <tr
      ><td class="k">level</td><td
        >{level.name} — difficulty {level.difficulty}, iQ {level.opponentIq}%, eventGood {level.eventGood}</td
      ></tr
    >
    <tr><td class="k">ruleset</td><td>{s.settings.ruleset}</td></tr>
    <tr
      ><td class="k">tutorial</td><td
        >{s.settings.tutorial ? 'on' : 'off'} — stage {s.tutorStage}, taught {s.tutorTaught}, {s.tutorPending
          ? 'lesson owed'
          : 'no lesson owed'}</td
      ></tr
    >
    <tr><td class="k">save version</td><td>{s.version}</td></tr>

    <tr class="sec"><td colspan="2">economy</td></tr>
    <tr><td class="k">import tariff</td><td>{s.econ.importTariff}%</td></tr>
    <tr><td class="k">export tariff</td><td>{s.econ.exportTariff}%</td></tr>
    <tr><td class="k">passenger tax</td><td>{s.econ.passTax}%</td></tr>
    <tr><td class="k">fuel range</td><td>{s.econ.fuelPriceRange}</td></tr>

    <tr class="sec"><td colspan="2">this week's world</td></tr>
    <tr
      ><td class="k">news</td><td
        >#{s.news} data {s.newsData} on {planetName(s, s.newsPlanet)}
        <div class="dim">
          {newsHeadline(s)}
        </div></td
      ></tr
    >
    <tr
      ><td class="k">weather</td><td
        >#{s.weather} on {planetName(s, s.weatherPlanet)}
        {#if weatherIsHazard(s)}<span class="bad">HAZARD</span>{/if}
        <div class="dim">
          {weatherForecast(s)}
        </div></td
      ></tr
    >
    <tr><td class="k">market event</td><td>#{s.gameEvent} hits planet {s.week % 7}</td></tr>

    <tr class="sec"><td colspan="2">size on the wire</td></tr>
    <tr><td class="k">json</td><td>{size.json.toLocaleString('en-US')} chars</td></tr>
    <tr
      ><td class="k">play-by-link</td><td
        >{size.link.toLocaleString('en-US')} chars
        {#if size.link > 8000}<span class="bad">long links get mangled</span>{/if}</td
      ></tr
    >
    <tr><td class="k">log entries</td><td>{size.log} (capped at 400)</td></tr>

    {#if online.status !== 'idle'}
      <tr class="sec"><td colspan="2">online</td></tr>
      <tr><td class="k">status</td><td>{online.status} {online.isHost ? '(host)' : ''}</td></tr>
      <tr><td class="k">room</td><td>{online.code ?? '—'}</td></tr>
      <tr><td class="k">my seats</td><td>{online.mySeats().join(', ') || 'none'}</td></tr>
      <tr><td class="k">peers</td><td>{Object.values(online.peers).join(', ') || '—'}</td></tr>
      <tr><td class="k">seq</td><td>{online.seq}</td></tr>
      {#if online.error}<tr><td class="k">error</td><td class="bad">{online.error}</td></tr>{/if}
    {/if}
  </tbody>
</table>
