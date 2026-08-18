<script lang="ts">
  import { game } from '../game.svelte';
</script>

{#if game.error}
  <div class="toast" role="alert">
    <span>{game.error}</span>
    <button onclick={() => (game.error = null)}>×</button>
  </div>
{/if}

<style>
  .toast {
    position: absolute;
    left: 50%;
    top: 8px;
    transform: translateX(-50%);
    background: var(--c-yellow-plate);
    color: #000;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 2px 2px 0 #000;
    font: bold 13px var(--font-ui);
    padding: 6px 10px;
    display: flex;
    gap: 10px;
    align-items: center;
    z-index: 20;
    max-width: 560px;
  }
  button {
    font: bold 13px var(--font-ui);
    background: var(--c-face);
    border: 1px solid #404040;
    cursor: pointer;
  }
</style>
