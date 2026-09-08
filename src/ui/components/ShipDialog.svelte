<script lang="ts">
  /**
   * The dealer's showroom as a modal: every ship with its figures, the chosen one previewed
   * large. Picking is live — `onpick` fires on every click, so the caller shows the change at
   * once (and, online, broadcasts it); both buttons at the bottom only close the dialog.
   */
  import { SHIPS } from '../../engine';
  import { img } from '../assets';
  import { play } from '../sound';
  import Btn from './Btn.svelte';

  let {
    title,
    ship,
    onpick,
    onclose,
  }: { title: string; ship: number; onpick: (id: number) => void; onclose: () => void } = $props();

  const def = $derived(SHIPS.find((s) => s.id === ship));
  const picture = $derived(img(`ship.${ship}.picture`));
</script>

<div class="backdrop" role="presentation" onkeydown={(e) => e.key === 'Escape' && onclose()}>
  <div class="dlg">
    <div class="dlg-title">{title}</div>
    {#if def}
      <div class="preview">
        {#if picture}<img src={picture} alt={def.name} />{/if}
        <div>
          <b>{def.name}</b>
          <span
            >{def.cargo}t cargo · {def.seats} passengers · {def.fuel}t fuel · {def.kuarps} kuarps</span
          >
        </div>
      </div>
    {/if}
    <div class="ships">
      {#each SHIPS as sdef (sdef.id)}
        {@const pic = img(`ship.${sdef.id}.icon`)}
        <button
          class="sh"
          class:on={ship === sdef.id}
          onclick={() => {
            play('select');
            onpick(sdef.id);
          }}
        >
          {#if pic}<img src={pic} alt="" />{/if}
          <b>{sdef.name}</b>
          <span
            >{sdef.cargo}t · {sdef.seats} pax · {sdef.fuel}t fuel · {sdef.kuarps} kuarps · crew {sdef.crew}</span
          >
        </button>
      {/each}
    </div>
    <div class="actions">
      <Btn onclick={onclose}>Cancel</Btn>
      <Btn color="green" onclick={onclose}>Choose {def?.name}</Btn>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    /* flex, not grid: a percentage max-height on a grid item resolves against the
       auto-sized row (i.e. against its own content) and is silently ignored */
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    box-sizing: border-box;
    z-index: 10;
  }
  .dlg {
    width: 600px;
    /* never taller than the stage: the ship grid scrolls instead of pushing the
       action row off the bottom */
    max-height: 100%;
    box-sizing: border-box;
    background: var(--c-face);
    color: #000;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 3px 3px 0 #000;
    padding: 0 8px 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font: 13px var(--font-ui);
  }
  .dlg-title {
    flex: none;
    background: var(--c-navy);
    color: #fff;
    font: bold 13px var(--font-ui);
    padding: 4px 8px;
    margin: 0 -8px;
  }
  .ships {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    overflow: auto;
    min-height: 0;
  }
  .sh {
    color: #000;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    background: #fff;
    border: 2px solid #808080;
    cursor: pointer;
    font: 10px var(--font-ui);
    padding: 4px;
  }
  .sh img {
    height: 40px;
  }
  .sh.on {
    background: var(--c-yellow-plate);
    border-color: #000;
  }
  .preview {
    height: 100px;
    flex: none;
    display: grid;
    grid-template-columns: 170px 1fr;
    align-items: center;
    gap: 10px;
    background: #000;
    color: #fff;
    padding: 4px;
  }
  .preview img {
    width: 160px;
    height: 92px;
    object-fit: contain;
  }
  .preview div {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .preview b {
    color: var(--c-yellow-plate);
    font-size: 15px;
  }
  .preview span {
    font-size: 11px;
  }
  .actions {
    flex: none;
    display: flex;
    gap: 6px;
  }
  .actions :global(.btn) {
    flex: 1;
  }
</style>
