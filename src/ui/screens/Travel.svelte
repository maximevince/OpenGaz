<script lang="ts">
  /**
   * The week in the air. The original never cut straight from the map to the next planet: it
   * flew the ship across a starfield first. The week's chart comes later, with the standings
   * it is drawn from — see WeekChart.
   */
  import { onMount } from 'svelte';
  import { PLANET_BY_ID } from '../../engine';
  import { img } from '../assets';
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

  /** the flight plays itself out; a click cuts it short */
  const FLIGHT_MS = 2400;
  let done = false;
  const land = () => {
    if (done) return;
    done = true;
    game.endTravel();
  };
  onMount(() => {
    const t = setTimeout(land, FLIGHT_MS);
    return () => clearTimeout(t);
  });
</script>

<div
  class="flight"
  style:background-image={stars ? `url(${stars})` : undefined}
  role="presentation"
  onclick={land}
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
</style>
