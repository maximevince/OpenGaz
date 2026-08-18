<script lang="ts">
  import { PLANET_BY_ID, netWorth } from '../../engine';
  import { online } from '../../net/online.svelte';
  import Btn from '../components/Btn.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';
  const s = $derived(game.s);
  const co = $derived(game.co);
  const recent = $derived(s.log.slice(-8).reverse());
</script>

<div class="wait">
  <div class="box">
    <div class="small">Week {s.week} · room {online.code}</div>
    <h1>{co.name}'s turn</h1>
    <p>
      Played by {online.peerNameFor(game.ci)} · on {PLANET_BY_ID[s.planets[co.planet]!.id].name}
    </p>
    <div class="board">
      {#each s.companies as c, i (c.id)}
        <div class="rowc" class:cur={i === game.ci}>
          <span>{c.name}</span><span>{c.bankrupt ? 'bankrupt' : fmt(netWorth(s, c))}</span>
        </div>
      {/each}
    </div>
    <div class="log">
      {#each recent as l, i (i)}<div class="l {l.kind}">wk {l.week}: {l.text}</div>{/each}
    </div>
    <div class="row">
      <Btn onclick={() => game.go('money')}>Money &amp; graphs</Btn>
      <Btn onclick={() => online.requestSync()}>Resync</Btn>
    </div>
  </div>
</div>

<style>
  .wait {
    position: absolute;
    inset: 0;
    background: #000;
    display: grid;
    place-items: center;
    color: #fff;
    font: 13px var(--font-ui);
  }
  .box {
    width: 560px;
    text-align: center;
  }
  .small {
    color: #c0c0ff;
  }
  h1 {
    font:
      bold 32px Georgia,
      serif;
    margin: 6px 0 4px;
    color: var(--c-yellow-plate);
  }
  .board {
    margin: 10px auto;
    width: 360px;
    background: #101030;
    border: 1px solid #8080ff;
  }
  .rowc {
    display: flex;
    justify-content: space-between;
    padding: 2px 8px;
  }
  .cur {
    background: #303070;
    font-weight: bold;
  }
  .log {
    text-align: left;
    height: 120px;
    overflow: auto;
    background: #080818;
    border: 1px solid #404040;
    padding: 4px 8px;
    font-size: 11px;
    color: #c0c0c0;
  }
  .l.news {
    color: var(--c-cyan);
  }
  .row {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-top: 10px;
  }
</style>
