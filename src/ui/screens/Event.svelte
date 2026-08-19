<script lang="ts">
  import Btn from '../components/Btn.svelte';
  import Portrait from '../components/Portrait.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';
  const ev = $derived(game.s.pending!);
  const portrait = $derived(ev.portrait ?? ev.id);
  const mood = $derived(ev.mood ?? 'neutral');
  let amount = $derived(ev.input?.initial ?? 0);
  function choose(id: string) {
    game.dispatch({
      type: 'eventChoice',
      choice: id,
      amount: ev.input ? Math.floor(Number(amount) || 0) : undefined,
    });
  }
</script>

<div class="ev {mood}">
  <div class="card">
    <Portrait id={portrait} caption={ev.title} width={200} height={300} />
    <div class="text">
      <h2>{ev.title}</h2>
      <p>{ev.text}</p>
      {#if ev.input}
        <label class="inp">
          {ev.input.label}:
          <input type="number" min={ev.input.min} max={ev.input.max} bind:value={amount} />
          <span class="hint">
            you have {fmt(game.co.cash)}{ev.input.max < 1e10
              ? ` · at most ${fmt(ev.input.max)}`
              : ''}
          </span>
        </label>
      {/if}
      <div class="row">
        {#if ev.choices.length === 0}
          <Btn onclick={() => choose('ok')}>OK</Btn>
        {:else}
          {#each ev.choices as c (c.id)}
            <Btn onclick={() => choose(c.id)}>{c.label}</Btn>
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
    display: grid;
    place-items: center;
    z-index: 5;
  }
  .good {
    background: var(--c-navy);
  }
  .bad {
    background: #800000;
  }
  .neutral {
    background: #006000;
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
  .inp {
    display: flex;
    gap: 8px;
    align-items: center;
    font: bold 13px var(--font-ui);
  }
  input {
    font: bold 15px var(--font-ui);
    width: 120px;
    padding: 3px 6px;
    border: 2px inset #808080;
  }
  .hint {
    font-weight: normal;
    color: #404040;
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
    white-space: normal;
  }
</style>
