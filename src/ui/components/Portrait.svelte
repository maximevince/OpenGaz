<script lang="ts">
  import { img } from '../assets';
  /** Framed character portrait with a caption; placeholder box when the pack lacks the image. */
  let {
    id,
    caption,
    width = 220,
    height = 330,
    fit = 'cover',
  }: {
    id: string;
    caption: string;
    width?: number;
    height?: number;
    /**
     * `cover` for the tall character busts, which are drawn deeper than their frame.
     * `contain` for the rivals' landscape creature cards: cropping those to a bust throws
     * most of the creature away, so they are letterboxed on black instead.
     */
    fit?: 'cover' | 'contain';
  } = $props();
  const src = $derived(img(`portrait.${id}`));
</script>

<div class="portrait" style:width={`${width}px`} style:height={`${height}px`}>
  <div class="frame" class:letterbox={fit === 'contain'}>
    {#if src}
      <img {src} alt={caption} style:object-fit={fit} />
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
    min-height: 0;
    background: #fff;
    /* flex, not grid: `max-height: 100%` on a grid item resolves against the auto-sized
       row (its own content) and is dropped, which cropped every portrait instead of
       letterboxing it */
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .frame.letterbox {
    background: #000;
  }
  img {
    width: 100%;
    height: 100%;
    display: block;
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
