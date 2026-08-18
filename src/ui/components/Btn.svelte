<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    children,
    onclick,
    color = 'face',
    disabled = false,
    style = '',
    title = '',
  }: {
    children: Snippet;
    onclick?: () => void;
    color?: 'face' | 'green' | 'blue' | 'cyan' | 'black' | 'yellow' | 'red';
    disabled?: boolean;
    style?: string;
    title?: string;
  } = $props();
</script>

<button class="btn {color}" {onclick} {disabled} {style} {title}>
  {@render children()}
</button>

<style>
  .btn {
    font: bold 13px/1.15 var(--font-ui);
    padding: 4px 8px;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 1px 1px 0 #000;
    cursor: pointer;
    text-align: center;
    color: #000;
    background: var(--c-face);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    white-space: nowrap;
  }
  .btn:active:not(:disabled) {
    border-color: #404040 #fff #fff #404040;
    transform: translate(1px, 1px);
    box-shadow: none;
  }
  .btn:disabled {
    color: #808080;
    text-shadow: 1px 1px 0 #fff;
    cursor: default;
  }
  .green {
    background: var(--c-green);
    color: #fff;
    border-color: #40c040 #003000 #003000 #40c040;
  }
  .blue {
    background: var(--c-navy);
    color: #fff;
    border-color: #4040ff #000030 #000030 #4040ff;
  }
  .cyan {
    background: var(--c-cyan);
    color: #000;
    border-color: #c0ffff #008080 #008080 #c0ffff;
  }
  .black {
    background: #000;
    color: var(--c-cyan);
    border-color: #808080 #000 #000 #808080;
  }
  .yellow {
    background: var(--c-yellow-plate);
    color: #000;
    border-color: #ffffc0 #808000 #808000 #ffffc0;
  }
  .red {
    background: #c00000;
    color: #fff;
    border-color: #ff4040 #400000 #400000 #ff4040;
  }
  .green:disabled,
  .blue:disabled,
  .black:disabled,
  .red:disabled {
    color: #a0a0a0;
    text-shadow: none;
  }
</style>
