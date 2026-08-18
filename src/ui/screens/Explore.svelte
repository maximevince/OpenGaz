<script lang="ts">
  import { PLANET_BY_ID } from '../../engine';
  import Btn from '../components/Btn.svelte';
  import Portrait from '../components/Portrait.svelte';
  import { game } from '../game.svelte';
  const s = $derived(game.s);
  const p = $derived(game.planet);
  const def = $derived(PLANET_BY_ID[p.id]);
  let tab: 'special' | 'weather' | 'news' | 'time' | 'history' = $state('news');
  const news = $derived(
    s.log
      .filter((l) => l.company === -1)
      .slice(-8)
      .reverse(),
  );
</script>

<div class="ex">
  <div class="left">
    <Portrait
      id={tab === 'news'
        ? 'news'
        : tab === 'weather'
          ? 'weather'
          : tab === 'time'
            ? 'clock'
            : tab === 'history'
              ? 'history'
              : def.special}
      caption={def.name}
      width={210}
      height={300}
    />
  </div>
  <div class="right">
    <div class="title">{def.name} — {def.tagline}</div>
    <div class="body">
      {#if tab === 'news'}
        <h3>Channel 7 Kuku News</h3>
        {#if news.length === 0}<p>Nothing to report. Slow news week in the colonies.</p>{/if}
        {#each news as n, i (i)}<p>• wk {n.week}: {n.text}</p>{/each}
      {:else if tab === 'special'}
        <h3>Planet Special</h3>
        <p>
          Every planet has a special institution. On {def.name}: <b>{def.special}</b>. Planet
          specials arrive in the next milestone (M3).
        </p>
      {:else if tab === 'weather'}
        <h3>Weather Bureau</h3>
        <p>
          Solar activity is {s.week % 3 === 0 ? 'elevated' : 'normal'}. Meteor showers reported on
          the outer routes. Insurance recommended for long hauls. (Detailed forecasts arrive with
          the full event catalogue.)
        </p>
      {:else if tab === 'time'}
        <h3>Ministry of Time</h3>
        <p>
          It is week {s.week} of the year 139 A.B. (After Bass). One turn is one kuku week; every journey
          takes about a week regardless of distance, but faster ships arrive first and trade first.
        </p>
      {:else}
        <h3>History of {def.name}</h3>
        <p>
          {def.tagline}. The full planet histories are being rewritten for OpenGaz — check back
          soon.
        </p>
      {/if}
    </div>
  </div>
  <div class="buttons">
    <Btn color="blue" onclick={() => game.go('menu')}>Continue</Btn>
    <Btn color="blue" onclick={() => (tab = 'special')}>Planet Special</Btn>
    <Btn color="blue" onclick={() => (tab = 'weather')}>Weather Bureau</Btn>
    <Btn color="blue" onclick={() => (tab = 'news')}>News Center</Btn>
    <Btn color="blue" onclick={() => (tab = 'time')}>Ministry of Time</Btn>
    <Btn color="blue" onclick={() => (tab = 'history')}>History</Btn>
  </div>
</div>

<style>
  .ex {
    position: absolute;
    inset: 0;
    background: var(--c-navy);
    display: grid;
    grid-template-columns: 230px 1fr;
    grid-template-rows: 1fr 60px;
    gap: 10px;
    padding: 10px;
    box-sizing: border-box;
    color: #fff;
  }
  .title {
    background: var(--c-yellow-plate);
    color: #000;
    font: bold 14px var(--font-ui);
    padding: 8px;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
  }
  .body {
    margin-top: 10px;
    background: #fff;
    color: #000;
    padding: 10px;
    height: 250px;
    overflow: auto;
    font: 13px/1.4 var(--font-ui);
    border: 2px inset #808080;
  }
  h3 {
    margin: 0 0 6px;
  }
  .buttons {
    grid-column: 1 / -1;
    display: flex;
    gap: 6px;
  }
  .buttons :global(.btn) {
    flex: 1;
    white-space: normal;
    font-size: 12px;
  }
</style>
