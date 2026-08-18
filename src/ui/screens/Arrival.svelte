<script lang="ts">
  import { PLANET_BY_ID } from '../../engine';
  import { img } from '../assets';
  import Btn from '../components/Btn.svelte';
  import { game } from '../game.svelte';
  const s = $derived(game.s);
  const co = $derived(game.co);
  const p = $derived(game.planet);
  const large = $derived(img(`planet.${p.id}.large`));
  const news = $derived(s.log.filter((l) => l.company === -1 && l.week >= s.week - 1).slice(-3));
</script>

<div class="arr" style:background-image={large ? `url(${large})` : undefined}>
  <div class="welcome">Welcome to {PLANET_BY_ID[p.id].name}</div>
  <div class="panel">
    <div class="who">{co.name} — week {s.week}</div>
    {#if s.arrivalReports.length === 0}
      <div class="line info">An uneventful trip. Your pilot is almost disappointed.</div>
    {/if}
    {#each s.arrivalReports as r, i (i)}
      <div class="line {r.kind}">{r.text}</div>
    {/each}
    {#if news.length}
      <div class="newshead">Kuku News</div>
      {#each news as n, i (i)}<div class="line news">{n.text}</div>{/each}
    {/if}
  </div>
  <div class="buttons">
    <Btn color="black" onclick={() => game.dispatch({ type: 'continue' })}>Continue</Btn>
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
    font:
      bold 30px Georgia,
      serif;
    color: #fff;
    text-shadow:
      2px 2px 0 #000,
      0 0 12px #8080ff;
    text-align: center;
  }
  .panel {
    margin-top: auto;
    max-height: 46%;
    background: rgba(0, 0, 40, 0.85);
    border: 2px solid #8080ff;
    padding: 10px;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: #fff;
    font: 13px var(--font-ui);
  }
  .who {
    font-weight: bold;
    color: var(--c-yellow-plate);
  }
  .line {
    padding: 4px 8px;
    border-left: 4px solid #808080;
    background: rgba(255, 255, 255, 0.06);
  }
  .good {
    border-color: #00c000;
  }
  .bad {
    border-color: #ff4040;
  }
  .warn {
    border-color: #ffc000;
  }
  .info {
    border-color: #8080ff;
  }
  .newshead {
    font-weight: bold;
    color: var(--c-cyan);
    margin-top: 6px;
  }
  .news {
    border-color: var(--c-cyan);
    font-style: italic;
  }
  .buttons :global(.btn) {
    width: 100%;
    font-size: 16px;
    padding: 8px;
  }
</style>
