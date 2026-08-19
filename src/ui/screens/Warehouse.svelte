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
  const co = $derived(game.co);
  const pi = $derived(co.planet);
  const pname = $derived(PLANET_BY_ID[game.planet.id].name);
  const wh = $derived(co.warehouse[pi] ?? {});
  const used = $derived(warehouseTons(co, pi));
  const cap = $derived(co.warehouseSpace);
  let prompt: { mode: 'store' | 'retrieve'; c: CommodityId; max: number } | null = $state(null);
</script>

<div class="wh">
  <div class="title">Warehouse on {pname}</div>
  <div class="plates">
    <Plate label="Space used:" value={`${used} / ${cap} tons`} />
    <Plate label="Cargo bay:" value={`${cargoTons(co)} / ${co.ship.cargo} tons`} />
  </div>
  <div class="hint">
    Goods in a warehouse pay no tariffs and wait for a better price. Extra space is offered by the
    Trader's Union lottery.
  </div>
  <table>
    <thead
      ><tr
        ><th>Commodity</th><th>On ship</th><th>In warehouse</th><th>Paid</th><th></th><th></th></tr
      ></thead
    >
    <tbody>
      {#each game.s.commodities as c (c)}
        {@const onShip = co.cargo[c]?.tons ?? 0}
        {@const stored = wh[c]?.tons ?? 0}
        <tr>
          <td class="name">{COMMODITY_BY_ID[c].name}</td>
          <td>{onShip}</td>
          <td>{stored}</td>
          <td>{wh[c] ? fmt(wh[c]!.paid) : '—'}</td>
          <td
            ><Btn
              color="green"
              disabled={onShip === 0 || used >= cap}
              onclick={() => (prompt = { mode: 'store', c, max: Math.min(onShip, cap - used) })}
              >Store ▶</Btn
            ></td
          >
          <td
            ><Btn
              color="green"
              disabled={stored === 0 || cargoTons(co) >= co.ship.cargo}
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
    gap: 6px;
    padding: 8px;
    box-sizing: border-box;
    color: #000;
  }
  .title {
    background: var(--c-navy);
    color: #fff;
    font: bold 15px var(--font-ui);
    text-align: center;
    padding: 5px;
  }
  .plates {
    display: flex;
    gap: 8px;
  }
  .plates :global(.plate) {
    flex: 1;
  }
  .hint {
    font: 12px var(--font-ui);
  }
  table {
    border-collapse: collapse;
    width: 100%;
    background: var(--c-green-grid);
    font: bold 12px var(--font-ui);
    flex: 1;
  }
  th,
  td {
    border: 1px solid #000;
    padding: 2px 4px;
    text-align: center;
  }
  th {
    background: var(--c-face);
  }
  td.name {
    background: var(--c-face);
    text-align: left;
    padding-left: 8px;
  }
  td :global(.btn) {
    padding: 2px 6px;
    font-size: 11px;
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
