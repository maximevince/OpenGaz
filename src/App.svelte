<script lang="ts">
  import Stage from './ui/Stage.svelte';
  import Title from './ui/screens/Title.svelte';
  import { initAssets } from './ui/assets';

  let ready = $state(false);
  let screen: 'title' | 'menu' = $state('title');
  initAssets().then(() => (ready = true));
</script>

<Stage>
  {#if !ready}
    <div class="loading">Loading…</div>
  {:else if screen === 'title'}
    <Title onstart={() => (screen = 'menu')} />
  {:else}
    <div class="loading">Main menu — coming in M2</div>
  {/if}
</Stage>

<style>
  .loading {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #fff;
    font-size: 18px;
  }
</style>
