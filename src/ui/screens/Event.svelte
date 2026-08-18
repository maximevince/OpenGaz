<script lang="ts">
  import Btn from '../components/Btn.svelte';
  import Portrait from '../components/Portrait.svelte';
  import { game } from '../game.svelte';
  const ev = $derived(game.s.pending!);
  const portrait = $derived(ev.id === 'hitchhiker' ? 'snoz' : ev.id);
</script>

<div class="ev">
  <div class="card">
    <Portrait id={portrait} caption={ev.title} width={200} height={300} />
    <div class="text">
      <h2>{ev.title}</h2>
      <p>{ev.text}</p>
      <div class="row">
        {#if ev.choices.length === 0}
          <Btn onclick={() => game.dispatch({ type: 'eventChoice', choice: 'ok' })}>OK</Btn>
        {:else}
          {#each ev.choices as c (c.id)}
            <Btn onclick={() => game.dispatch({ type: 'eventChoice', choice: c.id })}>{c.label}</Btn
            >
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .ev {
    position: absolute;
    inset: 0;
    background: var(--c-navy);
    display: grid;
    place-items: center;
  }
  .card {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 16px;
    width: 600px;
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 4px 4px 0 #000;
    padding: 12px;
    color: #000;
  }
  h2 {
    margin: 0 0 8px;
    font: bold 20px var(--font-ui);
  }
  p {
    font: 15px/1.4 var(--font-ui);
  }
  .row {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
  .row :global(.btn) {
    flex: 1;
    font-size: 15px;
    padding: 8px;
  }
</style>
