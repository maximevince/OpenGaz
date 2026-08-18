<script lang="ts">
  import type { Snippet } from 'svelte';
  /** Fixed 640×480 virtual stage, uniformly scaled to fit the viewport (letterboxed). */
  let { children }: { children: Snippet } = $props();
  let vw = $state(640);
  let vh = $state(480);
  const scale = $derived(Math.max(0.25, Math.min(vw / 640, vh / 480)));
</script>

<svelte:window bind:innerWidth={vw} bind:innerHeight={vh} />

<div class="viewport">
  <div class="stage" style:transform={`scale(${scale})`}>
    {@render children()}
  </div>
</div>

<style>
  .viewport {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: #000;
  }
  .stage {
    width: 640px;
    height: 480px;
    position: relative;
    overflow: hidden;
    transform-origin: center center;
    background: var(--c-periwinkle);
    image-rendering: pixelated;
    user-select: none;
  }
</style>
