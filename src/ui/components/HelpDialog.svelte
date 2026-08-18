<script lang="ts">
  import Btn from './Btn.svelte';
  import { HELP } from '../help';
  import { game } from '../game.svelte';
  const h = $derived(HELP[game.helpFor ?? 'menu']);
</script>

{#if game.helpFor && h}
  <div
    class="backdrop"
    role="presentation"
    onkeydown={(e) => e.key === 'Escape' && (game.helpFor = null)}
  >
    <div class="box">
      <div class="title">👆 Help — {h.title}</div>
      <p>{h.text}</p>
      <Btn onclick={() => (game.helpFor = null)}>OK</Btn>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: grid;
    place-items: center;
    z-index: 15;
  }
  .box {
    width: 440px;
    background: var(--c-yellow-plate);
    color: #000;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 3px 3px 0 #000;
    padding: 0 12px 12px;
    font: 14px/1.4 var(--font-ui);
  }
  .title {
    background: var(--c-navy);
    color: #fff;
    font: bold 14px var(--font-ui);
    padding: 5px 8px;
    margin: 0 -12px 8px;
  }
</style>
