<script lang="ts">
  /** Modal number prompt (the VB InputBox of the 90s), with optional preset buttons. */
  import { untrack } from 'svelte';
  import Btn from './Btn.svelte';
  let {
    title,
    text = '',
    initial = 0,
    max,
    presets = [],
    okLabel = 'OK',
    onok,
    oncancel,
  }: {
    title: string;
    text?: string;
    initial?: number;
    max?: number;
    presets?: { label: string; value: number }[];
    okLabel?: string;
    onok: (n: number) => void;
    oncancel: () => void;
  } = $props();
  let value = $state(untrack(() => initial));
  let input: HTMLInputElement | undefined = $state();
  $effect(() => {
    input?.focus();
    input?.select();
  });
  const submit = () => {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n <= 0) return oncancel();
    onok(max !== undefined ? Math.min(n, max) : n);
  };
</script>

<div class="backdrop" role="presentation" onkeydown={(e) => e.key === 'Escape' && oncancel()}>
  <div class="box">
    <div class="title">{title}</div>
    {#if text}<div class="text">{text}</div>{/if}
    <input
      bind:this={input}
      type="number"
      min="0"
      max={max ?? undefined}
      bind:value
      onkeydown={(e) => e.key === 'Enter' && submit()}
    />
    {#if presets.length}
      <div class="presets">
        {#each presets as p (p.label)}
          <Btn color="cyan" onclick={() => (value = p.value)}>{p.label}</Btn>
        {/each}
      </div>
    {/if}
    <div class="row">
      <Btn onclick={submit}>{okLabel}</Btn>
      <Btn onclick={oncancel}>Cancel</Btn>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: grid;
    place-items: center;
    z-index: 10;
  }
  .box {
    width: 340px;
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 3px 3px 0 #000;
    padding: 0 0 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: #000;
  }
  .title {
    background: var(--c-navy);
    color: #fff;
    font: bold 13px var(--font-ui);
    padding: 4px 8px;
  }
  .text {
    font: 13px var(--font-ui);
    padding: 0 10px;
  }
  input {
    margin: 0 10px;
    font: bold 16px var(--font-ui);
    padding: 4px 6px;
    border: 2px inset #808080;
    background: #fff;
    color: #000;
  }
  .presets,
  .row {
    display: flex;
    gap: 6px;
    padding: 0 10px;
    flex-wrap: wrap;
  }
  .row :global(.btn) {
    flex: 1;
  }
</style>
