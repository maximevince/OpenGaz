<script lang="ts">
  import { PLANET_BY_ID } from '../../engine';
  import Btn from '../components/Btn.svelte';
  import { game } from '../game.svelte';
  const co = $derived(game.co);
</script>

<div class="hand">
  <div class="box">
    <div class="small">Week {game.s.week} · pass the mouse to</div>
    <h1>{co.name}</h1>
    <p>You are on {PLANET_BY_ID[game.planet.id].name}. Other players: eyes closed!</p>
    <Btn color="green" onclick={() => game.go('menu')}>Start my turn</Btn>
  </div>
</div>

<style>
  .hand {
    position: absolute;
    inset: 0;
    background: #000;
    display: grid;
    place-items: center;
  }
  .box {
    text-align: center;
    color: #fff;
    font: 14px var(--font-ui);
  }
  .small {
    color: #c0c0ff;
  }
  h1 {
    font:
      bold 36px Georgia,
      serif;
    margin: 6px 0 12px;
    color: var(--c-yellow-plate);
  }
  .box :global(.btn) {
    font-size: 16px;
    padding: 8px 24px;
    margin-top: 12px;
  }
</style>
