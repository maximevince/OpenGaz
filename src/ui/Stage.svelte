<script lang="ts">
  import type { Snippet } from 'svelte';
  import { STAGE_W, STAGE_H, fitScale, rotationHelps } from './stage';
  import { installGuard } from './overflow-guard';

  /** Fixed 640×480 virtual stage, uniformly scaled to fit the visible viewport (letterboxed). */
  let { children }: { children: Snippet } = $props();

  const ROTATE_KEY = 'opengaz:rotate';
  function readRotatePref(): boolean {
    try {
      return localStorage.getItem(ROTATE_KEY) === '1';
    } catch {
      return false;
    }
  }

  // The field is measured rather than derived from window.innerWidth/Height: on mobile browsers
  // those report the viewport *behind* the collapsible toolbars, which pushed part of the stage
  // off screen. The element is sized with dvh and padded by the safe-area insets, so its own box
  // is exactly the area we may draw in.
  let field = $state<HTMLDivElement>();
  let vw = $state(STAGE_W);
  let vh = $state(STAGE_H);
  let wantRotate = $state(readRotatePref());

  const canRotate = $derived(rotationHelps(vw, vh));
  const rotated = $derived(canRotate && wantRotate);
  const scale = $derived(fitScale(vw, vh, rotated));
  // the letterbox band under the stage — when it is too thin to hold the toggle (a 4:3 tablet
  // turned sideways fills the screen exactly) the toggle drops its label and sits on top instead
  const band = $derived((vh - (rotated ? STAGE_W : STAGE_H) * scale) / 2);

  $effect(() => {
    const el = field;
    if (!el) return;
    const measure = () => {
      vw = el.clientWidth;
      vh = el.clientHeight;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  // dev watchdog: shout as soon as a screen pushes content off the stage (see overflow-guard.ts)
  let stageEl = $state<HTMLDivElement>();
  $effect(() => {
    if (!import.meta.env.DEV || !stageEl) return;
    return installGuard(stageEl);
  });

  function toggleRotate() {
    wantRotate = !wantRotate;
    try {
      localStorage.setItem(ROTATE_KEY, wantRotate ? '1' : '0');
    } catch {
      // private browsing: the choice just doesn't stick
    }
  }
</script>

<div class="viewport">
  <div class="field" bind:this={field}>
    <div
      bind:this={stageEl}
      class="stage"
      style:width={`${STAGE_W}px`}
      style:height={`${STAGE_H}px`}
      style:transform={`translate(-50%, -50%) rotate(${rotated ? 90 : 0}deg) scale(${scale})`}
    >
      {@render children()}
    </div>
    {#if canRotate}
      {@const label = rotated
        ? 'Show the game upright'
        : 'Turn the game sideways to fill the screen'}
      <button
        class="rotate"
        class:on={rotated}
        class:compact={band < 52}
        onclick={toggleRotate}
        aria-pressed={rotated}
        aria-label={label}
        title={label}
      >
        <span class="glyph" aria-hidden="true">⟳</span>
        {#if band >= 52}{rotated ? 'Upright' : 'Rotate to fill'}{/if}
      </button>
    {/if}
  </div>
</div>

<style>
  .viewport {
    position: fixed;
    top: 0;
    left: 0;
    /* the dev inspector docks on the right and reserves its width here; 0 in every real build */
    width: calc(100% - var(--og-debug-dock, 0px));
    /* dvh follows the mobile toolbars as they collapse; vh is the desktop/legacy fallback */
    height: 100vh;
    height: 100dvh;
    box-sizing: border-box;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
      env(safe-area-inset-left);
    background: #000;
    overflow: hidden;
    overscroll-behavior: none;
  }
  .field {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .stage {
    position: absolute;
    left: 50%;
    top: 50%;
    overflow: hidden;
    transform-origin: center center;
    background: var(--c-periwinkle);
    image-rendering: pixelated;
    user-select: none;
    -webkit-user-select: none;
  }
  .rotate {
    position: absolute;
    right: 6px;
    bottom: 6px;
    z-index: 30;
    display: inline-flex;
    gap: 6px;
    align-items: center;
    min-height: 44px;
    padding: 8px 14px;
    border: 1px solid #606060;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.65);
    color: #c0c0c0;
    font: bold 12px/1 var(--font-ui);
    cursor: pointer;
    opacity: 0.7;
  }
  .rotate.compact {
    min-width: 44px;
    padding: 8px;
    justify-content: center;
    opacity: 0.5;
  }
  .rotate.on,
  .rotate:active {
    opacity: 1;
    color: #fff;
  }
  .glyph {
    font-size: 15px;
  }
</style>
