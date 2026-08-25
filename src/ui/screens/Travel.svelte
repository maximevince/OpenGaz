<script lang="ts">
  /**
   * The week in the air. The original never cut straight from the map to the next planet: it
   * flew the ship across a starfield, and between turns it put up one of the company charts —
   * the history line, or the market-strength pie — before anyone landed.
   */
  import { onMount } from 'svelte';
  import { PLANET_BY_ID } from '../../engine';
  import { img } from '../assets';
  import HistoryChart from '../components/HistoryChart.svelte';
  import StrengthPie from '../components/StrengthPie.svelte';
  import Btn from '../components/Btn.svelte';
  import { cutout } from '../cutout';
  import { game } from '../game.svelte';

  const s = $derived(game.s);
  const co = $derived(game.co);
  const from = $derived(s.planets[co.planetLast]);
  const to = $derived(s.planets[co.planet]);
  const stars = img('bg.stars.1');
  /* the dealer picture, not the 80x50 map icon: at this size the icon is a blur */
  const ship = $derived(img(`ship.${co.ship.defId}.picture`) ?? img(`ship.${co.ship.defId}.icon`));
  /** the same art with its own starfield keyed out, so it flies over ours */
  let sprite = $state<string | undefined>(undefined);
  $effect(() => {
    const src = ship;
    if (!src) return;
    let live = true;
    cutout(src).then((u) => {
      if (live) sprite = u;
    });
    return () => (live = false);
  });

  /** the flight plays itself out, then the chart waits for a click */
  let stage: 'flight' | 'chart' = $state('flight');
  const FLIGHT_MS = 2400;
  onMount(() => {
    const t = setTimeout(() => (stage = 'chart'), FLIGHT_MS);
    return () => clearTimeout(t);
  });
  /** a click cuts the flight short rather than skipping the whole interlude */
  const skip = () => (stage = 'chart');
</script>

{#if stage === 'flight'}
  <div
    class="flight"
    style:background-image={stars ? `url(${stars})` : undefined}
    role="presentation"
    onclick={skip}
  >
    <!-- the ship crosses the starfield and leaves the frame; that is the point of it -->
    {#if sprite ?? ship}
      <img class="ship" src={sprite ?? ship} alt="" data-overflow-ok />
    {:else}
      <div class="ship glyph" data-overflow-ok>🚀</div>
    {/if}
    <div class="caption">
      {from ? PLANET_BY_ID[from.id].name : '?'} → {to ? PLANET_BY_ID[to.id].name : '?'} · week {s.week}
    </div>
  </div>
{:else}
  <div class="report">
    <div class="title">
      {game.travelChart === 'history' ? 'Company History' : 'Market Strength'}
    </div>
    <div class="body">
      {#if game.travelChart === 'history'}
        <HistoryChart {s} highlight={game.ci} />
      {:else}
        <StrengthPie {s} />
      {/if}
    </div>
    <div class="buttons">
      <Btn color="cyan" onclick={() => game.endTravel()}>Continue</Btn>
    </div>
  </div>
{/if}

<style>
  .flight {
    position: absolute;
    inset: 0;
    background: #000 center / cover no-repeat;
    overflow: hidden;
    cursor: pointer;
  }
  /* Every ship in the pack is drawn nose-left with its exhaust to the right, so the flight
     runs right to left; anything else has the ship flying backwards. */
  .ship {
    position: absolute;
    left: 100%;
    top: 24%;
    width: 170px;
    image-rendering: pixelated;
    animation: cross 2.4s linear forwards;
  }
  .ship.glyph {
    font-size: 64px;
    line-height: 1;
    width: auto;
  }
  @keyframes cross {
    from {
      transform: translate(0, 0);
    }
    to {
      transform: translate(-820px, 180px);
    }
  }
  .caption {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 14px;
    text-align: center;
    color: #fff;
    font: bold 14px var(--font-ui);
    text-shadow: 1px 1px 0 #000;
  }
  .report {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: grid;
    grid-template-rows: auto 1fr 44px;
    gap: 8px;
    padding: 8px;
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
  /* the history legend is absolutely placed, so it needs this box to hang from */
  .body {
    position: relative;
    min-height: 0;
    overflow: hidden;
  }
  .buttons :global(.btn) {
    width: 100%;
  }
</style>
