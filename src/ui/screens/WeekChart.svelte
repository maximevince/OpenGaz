<script lang="ts">
  /**
   * The week's chart, shown with the standings it is drawn from — the original put one of
   * these up between turns, and its figures are the ones the rollover just recorded, so the
   * bars, the line and the standings table all agree.
   */
  import Btn from '../components/Btn.svelte';
  import HistoryChart from '../components/HistoryChart.svelte';
  import StrengthPie from '../components/StrengthPie.svelte';
  import { game } from '../game.svelte';

  const s = $derived(game.s);
</script>

<div class="week">
  <div class="title">
    {game.weekChart === 'history' ? 'Company History' : 'Market Strength'} — week {s.week}
  </div>
  <div class="body">
    {#if game.weekChart === 'history'}
      <HistoryChart {s} highlight={game.ci} />
    {:else}
      <StrengthPie {s} />
    {/if}
  </div>
  <div class="buttons">
    <Btn color="cyan" onclick={() => game.closeWeekChart()}>Continue</Btn>
  </div>
</div>

<style>
  .week {
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
