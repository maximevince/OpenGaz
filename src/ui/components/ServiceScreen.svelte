<script lang="ts">
  import type { Snippet } from 'svelte';
  import Portrait from './Portrait.svelte';
  /**
   * The classic "portrait left, title + value plates right, button row bottom" layout used by
   * the bank, loans, crew, taxes, insurance, passengers …
   */
  let {
    portrait,
    caption,
    title,
    plates,
    buttons,
    extra,
  }: {
    portrait: string;
    caption: string;
    title: string;
    plates: Snippet;
    buttons: Snippet;
    extra?: Snippet;
  } = $props();
</script>

<div class="svc">
  <div class="left"><Portrait id={portrait} {caption} /></div>
  <div class="right">
    <div class="title">{title}</div>
    <div class="plates">{@render plates()}</div>
    {#if extra}{@render extra()}{/if}
  </div>
  <div class="buttons">{@render buttons()}</div>
</div>

<style>
  .svc {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: grid;
    grid-template-columns: 240px 1fr;
    grid-template-rows: 1fr 84px;
    gap: 8px;
    padding: 10px;
    box-sizing: border-box;
  }
  .left {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 6px;
  }
  .right {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 6px;
  }
  .title {
    background: var(--c-yellow-plate);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 2px 2px 0 #000;
    font: bold 17px/1 var(--font-ui);
    text-align: center;
    padding: 9px 6px;
    color: #000;
  }
  .plates {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .buttons {
    grid-column: 1 / -1;
    display: flex;
    gap: 6px;
    align-items: stretch;
  }
  .buttons :global(.btn) {
    flex: 1;
    font-size: 15px;
    padding: 6px 4px;
    white-space: normal;
  }
</style>
