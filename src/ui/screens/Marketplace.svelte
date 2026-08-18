<script lang="ts">
  import {
    COMMODITY_BY_ID,
    PLANET_BY_ID,
    cargoTons,
    priceRange,
    type CommodityId,
  } from '../../engine';
  import Btn from '../components/Btn.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';

  const co = $derived(game.co);
  const p = $derived(game.planet);
  const pname = $derived(PLANET_BY_ID[p.id].name);
  const tons = $derived(cargoTons(co));
  const fillPct = $derived(Math.round((tons / co.ship.cargo) * 100));

  let sel: CommodityId | null = $state(null);
  let qty = $state(0);
  let input: HTMLInputElement | undefined = $state();

  const maxBuy = (c: CommodityId) =>
    Math.max(
      0,
      Math.min(
        p.stock[c] ?? 0,
        co.ship.cargo - tons,
        Math.floor(co.cash / Math.max(1, p.price[c] ?? 1)),
      ),
    );
  const maxSell = (c: CommodityId) => co.cargo[c]?.tons ?? 0;

  function open(c: CommodityId) {
    sel = c;
    qty = Math.max(1, maxBuy(c) > 0 ? maxBuy(c) : maxSell(c));
    setTimeout(() => {
      input?.focus();
      input?.select();
    });
  }
  function buy(n = qty) {
    if (sel && game.dispatch({ type: 'buy', commodity: sel, tons: n })) sel = null;
  }
  function sell(n = qty) {
    if (sel && game.dispatch({ type: 'sell', commodity: sel, tons: n })) sel = null;
  }
</script>

<div class="market">
  <div class="title">Marketplace (All Goods on {pname})</div>
  <div class="strip">
    <div class="plate wide">ship's cargo bay = {fillPct}% filled ({tons}/{co.ship.cargo})</div>
    <div class="plate green">Cash: {fmt(co.cash)}</div>
    <div class="plate green">Profit: {fmt(co.visitProfit)}</div>
  </div>
  <div class="hint">Click on the commodity you wish to buy or sell.</div>
  <table>
    <thead>
      <tr>
        <th class="corner">week {game.s.week}</th>
        <th>Tons on Ship</th>
        <th>Tons on {pname}</th>
        <th>Price You Paid</th>
        <th>Market Price</th>
        <th>Price Range</th>
      </tr>
    </thead>
    <tbody>
      {#each game.s.commodities as c (c)}
        {@const def = COMMODITY_BY_ID[c]}
        {@const range = priceRange(def)}
        <tr class:sel={sel === c} onclick={() => open(c)}>
          <td class="name">{def.name}</td>
          <td>{co.cargo[c]?.tons ?? 0}</td>
          <td>{p.stock[c] ?? 0}</td>
          <td>{co.cargo[c] ? fmt(co.cargo[c]!.paid) : 0}</td>
          <td class="price">{fmt(p.price[c] ?? 0)}</td>
          <td>{range.min} - {range.max}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  <div class="buttons">
    <Btn color="green" onclick={() => game.go('menu')}>Continue</Btn>
    <Btn color="green" onclick={() => game.go('supply')}>Supply %</Btn>
    <Btn color="green" onclick={() => game.go('warehouse')}>Warehouse</Btn>
    <Btn color="green" onclick={() => game.help()}>Help</Btn>
  </div>

  {#if sel}
    {@const def = COMMODITY_BY_ID[sel]}
    <div class="backdrop" role="presentation" onkeydown={(e) => e.key === 'Escape' && (sel = null)}>
      <div class="dlg">
        <div class="dlg-title">{def.name} — {fmt(p.price[sel] ?? 0)} kubars/ton</div>
        <div class="dlg-body">
          <div>
            On ship: <b>{maxSell(sel)}</b> t · On {pname}: <b>{p.stock[sel] ?? 0}</b> t · You can
            afford <b>{maxBuy(sel)}</b> t
          </div>
          <label>Tons: <input bind:this={input} type="number" min="1" bind:value={qty} /></label>
          <div class="row">
            <Btn color="green" onclick={() => buy()} disabled={maxBuy(sel) === 0}>Buy</Btn>
            <Btn color="green" onclick={() => buy(maxBuy(sel!))} disabled={maxBuy(sel) === 0}
              >Buy Max</Btn
            >
            <Btn color="yellow" onclick={() => sell()} disabled={maxSell(sel) === 0}>Sell</Btn>
            <Btn color="yellow" onclick={() => sell(maxSell(sel!))} disabled={maxSell(sel) === 0}
              >Sell All</Btn
            >
            <Btn onclick={() => (sel = null)}>Cancel</Btn>
          </div>
          {#if game.error}<div class="err">{game.error}</div>{/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .market {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px;
    box-sizing: border-box;
    color: #000;
  }
  .title {
    background: var(--c-navy);
    color: #fff;
    font: bold 15px var(--font-ui);
    text-align: center;
    padding: 5px;
    border: 2px solid;
    border-color: #4040ff #000030 #000030 #4040ff;
  }
  .strip {
    display: flex;
    gap: 6px;
  }
  .plate {
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 2px 2px 0 #000;
    font: bold 12px var(--font-ui);
    padding: 5px 8px;
    text-align: center;
  }
  .wide {
    flex: 1;
  }
  .green {
    background: var(--c-green-grid);
    color: #000;
  }
  .hint {
    background: #000;
    color: var(--c-green-grid);
    font: bold 12px var(--font-ui);
    text-align: center;
    padding: 5px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font: bold 12px var(--font-ui);
    background: var(--c-green-grid);
    flex: 1;
  }
  th,
  td {
    border: 1px solid #000;
    padding: 3px 4px;
    text-align: center;
  }
  th {
    background: var(--c-face);
    font-size: 11px;
  }
  .corner {
    background: var(--c-face);
    color: #404040;
    font-weight: normal;
  }
  td.name {
    background: var(--c-face);
    text-align: left;
    padding-left: 8px;
  }
  tbody tr {
    cursor: pointer;
  }
  tbody tr:hover td {
    background: #c0ffc0;
  }
  tbody tr:hover td.name {
    background: #e0e0e0;
  }
  tr.sel td {
    background: var(--c-yellow-plate);
  }
  .price {
    color: #800000;
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
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: grid;
    place-items: center;
  }
  .dlg {
    width: 480px;
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 3px 3px 0 #000;
  }
  .dlg-title {
    background: var(--c-navy);
    color: #fff;
    font: bold 13px var(--font-ui);
    padding: 4px 8px;
  }
  .dlg-body {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font: 13px var(--font-ui);
  }
  input {
    font: bold 15px var(--font-ui);
    width: 100px;
    padding: 3px 6px;
    border: 2px inset #808080;
  }
  .row {
    display: flex;
    gap: 6px;
  }
  .row :global(.btn) {
    flex: 1;
  }
  .err {
    color: #800000;
    font-weight: bold;
  }
</style>
