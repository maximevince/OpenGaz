<script lang="ts">
  import Btn from '../components/Btn.svelte';
  import SoundToggle from '../components/SoundToggle.svelte';
  import { game } from '../game.svelte';
  import { unlocked } from '../../engine';
  import { online } from '../../net/online.svelte';
  let link = $state('');
  let copied = $state(false);
  let importText = $state('');
  const slots = [1, 2, 3, 4, 5];
  let tick = $state(0);
  const info = (n: number) => {
    void tick;
    return game.slotInfo(n);
  };
  async function copyLink() {
    link = game.exportLink();
    try {
      await navigator.clipboard.writeText(link);
      copied = true;
    } catch {
      copied = false;
    }
  }
</script>

<div class="file">
  <div class="title">File Options</div>
  <div class="cols">
    <div class="col">
      <h3>Save / Load (this browser)</h3>
      {#each slots as n (n)}
        {@const i = info(n)}
        <div class="slot">
          <span class="lbl">Game {n}: {i ? `week ${i.week} — ${i.names}` : 'empty'}</span>
          <Btn
            onclick={() => {
              game.saveSlot(n);
              tick++;
            }}>Save</Btn
          >
          <Btn disabled={!i || online.active} onclick={() => game.loadSlot(n)}>Load</Btn>
        </div>
      {/each}
      <p class="note">The game also autosaves after every action.</p>
    </div>
    <div class="col">
      <h3>Play by link (the new play-by-email)</h3>
      <p class="note">
        Copy a link to the whole game and send it to the next player. They open it, take their turn,
        and send it back.
      </p>
      <Btn color="green" onclick={copyLink}>Copy game link</Btn>
      {#if link}<textarea readonly value={link}></textarea><span class="note"
          >{copied ? 'Copied to clipboard.' : 'Select and copy manually.'}</span
        >{/if}
      <h3>Load from a link</h3>
      <textarea placeholder="paste a game link here" bind:value={importText}></textarea>
      <Btn
        onclick={() => game.importLink(importText)}
        disabled={!importText.trim() || online.active}>Load link</Btn
      >
    </div>
  </div>
  <div class="buttons">
    <SoundToggle />
    <Btn onclick={() => game.go('menu')}>Continue</Btn>
    {#if unlocked(game.s, 'stock')}
      <Btn color="green" onclick={() => game.go('shortcuts')}>Shortcuts</Btn>
    {/if}
    {#if import.meta.env.DEV}
      <Btn onclick={() => game.go('soundtest')}>Sound test</Btn>
    {/if}
    <Btn
      onclick={() => {
        online.leave();
        game.go('title');
      }}>Quit to title</Btn
    >
  </div>
</div>

<style>
  .file {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    box-sizing: border-box;
    color: #000;
    font: 13px var(--font-ui);
  }
  .title {
    background: var(--c-navy);
    color: #fff;
    font: bold 15px var(--font-ui);
    text-align: center;
    padding: 5px;
  }
  .cols {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .col {
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: hidden;
  }
  h3 {
    margin: 0;
    font-size: 13px;
  }
  .slot {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 4px;
    align-items: center;
  }
  .lbl {
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .note {
    font-size: 11px;
    margin: 0;
  }
  textarea {
    width: 100%;
    height: 48px;
    font: 10px monospace;
    box-sizing: border-box;
    resize: none;
  }
  .buttons {
    display: flex;
    gap: 6px;
  }
  .buttons :global(.btn) {
    flex: 1;
    font-size: 15px;
    padding: 6px;
  }
</style>
