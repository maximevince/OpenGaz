<script lang="ts">
  import { img } from '../assets';
  /** Framed character portrait with a caption; placeholder box when the pack lacks the image. */
  let {
    id,
    caption,
    width = 220,
    height = 330,
  }: { id: string; caption: string; width?: number; height?: number } = $props();
  const src = $derived(img(`portrait.${id}`));
</script>

<div class="portrait" style:width={`${width}px`} style:height={`${height}px`}>
  <div class="frame">
    {#if src}
      <img {src} alt={caption} />
    {:else}
      <div class="ph"><span>{caption}</span></div>
    {/if}
  </div>
  <div class="caption">{caption}</div>
</div>

<style>
  .portrait {
    background: var(--c-navy);
    border: 2px solid;
    border-color: #4040ff #000030 #000030 #4040ff;
    box-shadow: 2px 2px 0 #000;
    padding: 6px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .frame {
    flex: 1;
    background: #fff;
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .ph {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    background: repeating-linear-gradient(45deg, #e0e0ff 0 8px, #fff 8px 16px);
    color: #404080;
    font: bold 14px var(--font-ui);
    text-align: center;
  }
  .caption {
    color: #fff;
    font: bold 11px var(--font-ui);
    text-align: center;
  }
</style>
