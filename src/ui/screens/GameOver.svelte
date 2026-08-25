<script lang="ts">
  import { netWorth } from '../../engine';
  import { img } from '../assets';
  import Btn from '../components/Btn.svelte';
  import { fmt } from '../format';
  import { online } from '../../net/online.svelte';
  import { game } from '../game.svelte';
  const s = $derived(game.s);
  const winner = $derived(s.winner !== null ? s.companies[s.winner] : null);
  const humanWon = $derived(!!winner && !winner.isAI);
  const bg = $derived(img(humanWon ? 'screen.win' : 'screen.lose'));
  const deciding = $derived(s.phase === 'winner');
</script>

<div class="go" style:background-image={bg ? `url(${bg})` : undefined}>
  <div class="panel">
    <h1>{winner ? `${winner.name} wins!!!` : 'Game over'}</h1>
    {#if winner}<p>
        {winner.name} reached a net worth of {fmt(netWorth(s, winner))} kubars in week {s.week} and is
        now officially a Gazillionaire.
      </p>{/if}
    <ol>
      {#each [...s.companies].sort((a, b) => netWorth(s, b) - netWorth(s, a)) as c (c.id)}
        <li>{c.name}: {c.bankrupt ? 'bankrupt' : fmt(netWorth(s, c))}</li>
      {/each}
    </ol>
    {#if deciding}
      <p>The next winning target is higher. Continue the competition or retire from it.</p>
      <Btn color="green" onclick={() => game.dispatch({ type: 'continueCompetition' })}
        >Keep playing</Btn
      >
      <Btn onclick={() => game.dispatch({ type: 'retireCompetition' })}>End game</Btn>
    {:else}
      <Btn
        onclick={() => {
          online.leave();
          game.go('title');
        }}>Back to title</Btn
      >
    {/if}
  </div>
</div>

<style>
  .go {
    position: absolute;
    inset: 0;
    background: #000 center / cover no-repeat;
    display: grid;
    place-items: center;
  }
  .panel {
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    padding: 16px 24px;
    border: 2px solid #ffff80;
    max-width: 480px;
    font: 14px var(--font-ui);
  }
  h1 {
    margin: 0 0 8px;
    font:
      bold 32px Georgia,
      serif;
    color: #ffff80;
  }
</style>
