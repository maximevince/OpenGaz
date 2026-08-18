<script lang="ts">
  /** A bevelled value plate: "Label:  value". */
  let {
    label,
    value = '',
    color = 'cyan',
    style = '',
  }: {
    label: string;
    value?: string | number;
    color?: 'cyan' | 'yellow' | 'green' | 'white';
    style?: string;
  } = $props();
</script>

<div class="plate {color}" {style}>
  <span class="label">{label}</span>
  {#if value !== ''}<span class="value">{value}</span>{/if}
</div>

<style>
  .plate {
    font: bold 14px/1 var(--font-ui);
    padding: 7px 10px;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 2px 2px 0 #000;
    color: #000;
    display: flex;
    gap: 10px;
    align-items: center;
    white-space: nowrap;
    overflow: hidden;
  }
  .cyan {
    background: var(--c-cyan-plate);
  }
  .yellow {
    background: var(--c-yellow-plate);
  }
  .green {
    background: var(--c-green-grid);
  }
  .white {
    background: #fff;
  }
</style>
