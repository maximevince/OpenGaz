<script lang="ts">
  import {
    COMMODITY_BY_ID,
    PLANET_BY_ID,
    cargoTons,
    warehouseTons,
    type CommodityId,
  } from '../../engine';
  import Btn from '../components/Btn.svelte';
  import Plate from '../components/Plate.svelte';
  import Prompt from '../components/Prompt.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';
  import { shortcuts } from '../shortcuts.svelte';
  const co = $derived(game.co);
  const pi = $derived(co.planet);
  const pname = $derived(PLANET_BY_ID[game.planet.id].name);
  const wh = $derived(co.warehouse[pi] ?? {});
  const used = $derived(warehouseTons(co, pi));
  const cap = $derived(co.warehouseSpace);
  let prompt: { mode: 'store' | 'retrieve'; c: CommodityId; max: number } | null = $state(null);
  const quick = $derived(shortcuts.on(co.id, 'warehouse'));

  /** Quick Warehouse: one click moves the goods, loading in preference to storing. */
  function quickMove(c: CommodityId) {
    const stored = wh[c]?.tons ?? 0;
    const onShip = co.cargo[c]?.tons ?? 0;
    const holdRoom = co.ship.cargo - cargoTons(co);
    if (stored > 0 && holdRoom > 0) {
      game.dispatch({ type: 'retrieve', commodity: c, tons: Math.min(stored, holdRoom) });
      return;
    }
    if (onShip > 0 && cap - used > 0) {
      game.dispatch({ type: 'store', commodity: c, tons: Math.min(onShip, cap - used) });
      return;
    }
    game.error =
      stored === 0 && onShip === 0
        ? 'Nothing here to load or store.'
        : 'No room to move it either way.';
  }
</script>

<div class="wh">
  <div class="title">Warehouse on {pname}</div>
  <div class="plates">
    <Plate label="Space used:" value={`${used} / ${cap} tons`} />
    <Plate label="Cargo bay:" value={`${cargoTons(co)} / ${co.ship.cargo} tons`} />
  </div>
  <div class="hint">
    <span>
      {quick
        ? 'Quick Warehouse: a click loads what is stored, or stores what you carry.'
        : "Goods in a warehouse pay no tariffs and wait for a better price. Extra space is offered by the Trader's Union lottery."}
    </span>
    <button class="quick" class:on={quick} onclick={() => shortcuts.toggle(co.id, 'warehouse')}>
      Quick Warehouse {quick ? 'ON' : 'OFF'}
    </button>
  </div>
  <div class="grid">
    <table>
      <thead
        ><tr
          ><th>Commodity</th><th>On ship</th><th>In warehouse</th><th>Paid</th><th></th><th
          ></th></tr
        ></thead
      >
      <tbody>
        {#each game.s.commodities as c (c)}
          {@const onShip = co.cargo[c]?.tons ?? 0}
          {@const stored = wh[c]?.tons ?? 0}
          <tr
            class:clickable={quick}
            onclick={() => quick && quickMove(c)}
            oncontextmenu={(e) => e.preventDefault()}
          >
            <td class="name">{COMMODITY_BY_ID[c].name}</td>
            <td>{onShip}</td>
            <td>{stored}</td>
            <td>{wh[c] ? fmt(wh[c]!.paid) : '—'}</td>
            <td
              ><Btn
                color="green"
                disabled={quick || onShip === 0 || used >= cap}
                onclick={() => (prompt = { mode: 'store', c, max: Math.min(onShip, cap - used) })}
                >Store ▶</Btn
              ></td
            >
            <td
              ><Btn
                color="green"
                disabled={quick || stored === 0 || cargoTons(co) >= co.ship.cargo}
                onclick={() =>
                  (prompt = {
                    mode: 'retrieve',
                    c,
                    max: Math.min(stored, co.ship.cargo - cargoTons(co)),
                  })}>◀ Load</Btn
              ></td
            >
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <div class="buttons">
    <Btn onclick={() => game.go('menu')}>Continue</Btn>
    <Btn onclick={() => game.go('market')}>Marketplace</Btn>
    <Btn onclick={() => game.help()}>Help</Btn>
  </div>
</div>

{#if prompt}
  <Prompt
    title={prompt.mode === 'store' ? 'Store how many tons?' : 'Load how many tons?'}
    initial={prompt.max}
    max={prompt.max}
    presets={[{ label: 'All', value: prompt.max }]}
    onok={(n) => {
      const a = prompt!;
      game.dispatch(
        a.mode === 'store'
          ? { type: 'store', commodity: a.c, tons: n }
          : { type: 'retrieve', commodity: a.c, tons: n },
      );
      prompt = null;
    }}
    oncancel={() => (prompt = null)}
  />
{/if}

<style>
  .wh {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 5px;
    box-sizing: border-box;
    color: #000;
  }
  .title {
    background: var(--c-navy);
    color: #fff;
    font: bold 13px/1.2 var(--font-ui);
    text-align: center;
    padding: 3px;
  }
  .plates {
    display: flex;
    gap: 6px;
  }
  .plates :global(.plate) {
    flex: 1;
  }
  .hint {
    font: 10px/1.2 var(--font-ui);
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .hint span {
    flex: 1;
  }
  .quick {
    font: bold 10px var(--font-ui);
    padding: 1px 6px;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    background: var(--c-face);
    color: #000;
    cursor: pointer;
    white-space: nowrap;
  }
  .quick.on {
    background: var(--c-yellow-plate);
    border-color: #404040 #fff #fff #404040;
  }
  tbody tr.clickable {
    cursor: pointer;
  }
  tbody tr.clickable:hover td {
    background: #c0ffc0;
  }
  /* elastic, scrolling block — keeps the button row on screen */
  .grid {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    height: 100%;
    background: var(--c-green-grid);
    font: bold 11px/1.15 var(--font-ui);
  }
  th,
  td {
    border: 1px solid #000;
    padding: 0 4px;
    text-align: center;
  }
  th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--c-face);
    font-size: 10px;
    padding: 2px 4px;
  }
  td.name {
    background: var(--c-face);
    text-align: left;
    padding-left: 8px;
  }
  td :global(.btn) {
    padding: 0 6px;
    font-size: 10px;
    border-width: 1px;
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
</style>
