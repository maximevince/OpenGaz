<script lang="ts">
  import Btn from '../components/Btn.svelte';
  import { game } from '../game.svelte';
  import { QUICK_FLAGS, shortcuts } from '../shortcuts.svelte';

  const co = $derived(game.co);
  const on = $derived(shortcuts.count(co.id));
</script>

<div class="sc">
  <div class="title">Shortcuts — {co.name}</div>
  <div class="hint">
    A shortcut turns a button into the action itself, so a whole turn can be played without opening
    a screen. Right-clicking a shortcut control still opens the full screen, so you never lose
    anything by leaving one on. Each player keeps their own set.
  </div>

  <div class="grid">
    {#each QUICK_FLAGS as f (f.id)}
      {@const active = shortcuts.on(co.id, f.id)}
      <button class="row" class:active onclick={() => shortcuts.toggle(co.id, f.id)}>
        <span class="state" class:active>{active ? 'ON' : 'OFF'}</span>
        <span class="text">
          <b>{f.name}</b>
          <span class="desc">{f.desc}</span>
        </span>
      </button>
    {/each}
  </div>

  <div class="buttons">
    <Btn onclick={() => game.go('file')}>Back to File Options</Btn>
    <Btn color="green" onclick={() => shortcuts.setAll(co.id, true)}>All on</Btn>
    <Btn onclick={() => shortcuts.setAll(co.id, false)}>All off</Btn>
    <Btn onclick={() => game.help()}>Help</Btn>
  </div>
  <div class="foot">{on} of {QUICK_FLAGS.length} shortcuts on.</div>
</div>

<style>
  .sc {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 5px;
    box-sizing: border-box;
    color: #000;
  }
  .title {
    background: var(--c-navy);
    color: #fff;
    font: bold 14px/1.2 var(--font-ui);
    text-align: center;
    padding: 4px;
    border: 2px solid;
    border-color: #4040ff #000030 #000030 #4040ff;
  }
  .hint {
    background: #000;
    color: var(--c-green-grid);
    font: bold 10px/1.3 var(--font-ui);
    text-align: center;
    padding: 4px 8px;
  }
  .grid {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3px;
    align-content: start;
  }
  .row {
    display: flex;
    gap: 6px;
    align-items: flex-start;
    text-align: left;
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    padding: 3px 5px;
    cursor: pointer;
    font: 9px/1.25 var(--font-ui);
    color: #000;
  }
  .row.active {
    background: #e8ffe8;
  }
  .state {
    flex: 0 0 30px;
    text-align: center;
    font: bold 9px/1.4 var(--font-ui);
    background: #c0c0c0;
    border: 1px solid #606060;
    padding: 1px 0;
  }
  .state.active {
    background: var(--c-yellow-plate);
    border-color: #808000;
  }
  .text {
    display: block;
  }
  .text b {
    font-size: 10px;
  }
  .desc {
    display: block;
    color: #303030;
  }
  .buttons {
    display: flex;
    gap: 4px;
  }
  .buttons :global(.btn) {
    flex: 1;
    font-size: 13px;
    padding: 4px;
  }
  .foot {
    font: bold 10px var(--font-ui);
    text-align: center;
  }
</style>
