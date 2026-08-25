<script lang="ts">
  /**
   * "Welcome to «planet»" — the landing itself, before the dispatch cards that came down with
   * you. The planet's theme starts here, which is what the original used this screen for.
   */
  import { PLANET_BY_ID } from '../../engine';
  import { img } from '../assets';
  import Btn from '../components/Btn.svelte';
  import { game } from '../game.svelte';
  const s = $derived(game.s);
  const co = $derived(game.co);
  const p = $derived(game.planet);
  const large = $derived(img(`planet.${p.id}.large`));
</script>

<div class="arr" style:background-image={large ? `url(${large})` : undefined}>
  <div class="welcome">Welcome to {PLANET_BY_ID[p.id].name}</div>
  <div class="tagline">{PLANET_BY_ID[p.id].tagline}</div>
  <div class="who">{co.name} — week {s.week}</div>
  <div class="buttons">
    <Btn color="black" onclick={() => game.afterWelcome()}>Continue</Btn>
  </div>
</div>

<style>
  .arr {
    position: absolute;
    inset: 0;
    background: #000 center / cover no-repeat;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    box-sizing: border-box;
  }
  .welcome {
    margin-top: auto;
    font:
      bold 30px Georgia,
      serif;
    color: #fff;
    text-shadow:
      2px 2px 0 #000,
      0 0 12px #8080ff;
    text-align: center;
  }
  .tagline {
    font:
      italic 14px Georgia,
      serif;
    color: #d0d0ff;
    text-shadow: 1px 1px 0 #000;
    text-align: center;
    margin-top: -4px;
  }
  .who {
    margin-bottom: auto;
    text-align: center;
    font: bold 14px var(--font-ui);
    color: var(--c-yellow-plate);
    text-shadow: 1px 1px 0 #000;
  }
  .buttons :global(.btn) {
    width: 100%;
    font-size: 16px;
    padding: 8px;
  }
</style>
