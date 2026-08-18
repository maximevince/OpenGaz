<script lang="ts">
  import { PLANET_BY_ID, cargoTons, passengersWaiting } from '../../engine';
  import { img } from '../assets';
  import Btn from '../components/Btn.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';

  const co = $derived(game.co);
  const p = $derived(game.planet);
  const def = $derived(PLANET_BY_ID[p.id]);
  const surface = $derived(img(`planet.${p.id}.surface`));
  const fuelCost = $derived((co.ship.fuelCap - co.ship.fuel) * p.fuelPrice);
  const fuelPct = $derived(co.ship.fuel / co.ship.fuelCap);
  const taxes = $derived(co.taxOwedPassenger + co.taxOwedTariff);
</script>

<div class="menu">
  <!-- left column -->
  <div class="left">
    <div class="planet" style:background-image={surface ? `url(${surface})` : undefined}>
      {#if !surface}<div class="planet-ph">{def.name}</div>{/if}
      <button class="journey" onclick={() => game.go('map')}>Journey (Leave {def.name})</button>
    </div>
    <Btn color="blue" onclick={() => game.go('stock')}>Stock Market</Btn>
    <Btn color="blue" onclick={() => game.go('money')}>Money: {fmt(co.cash)} cash</Btn>
    <Btn color="blue" onclick={() => game.go('bank')}>Bank: {fmt(co.bank)}</Btn>
    <Btn color="blue" onclick={() => game.go('loan')}>Loan: {fmt(co.unionLoan)}</Btn>
    <Btn color="blue" onclick={() => game.go('zinn')}>Zinn's Loan: {fmt(co.zinnLoan)}</Btn>
  </div>

  <!-- centre column -->
  <div class="center">
    <div class="banner">{co.name}</div>
    <div class="icons">
      <Btn color="blue" onclick={() => game.go('market')}
        ><span class="big">🛒</span>Marketplace</Btn
      >
      <Btn color="blue" onclick={() => game.go('supply')}><span class="big">%</span>Supply</Btn>
      <Btn color="blue" onclick={() => game.go('warehouse')}
        ><span class="big">🏭</span>Warehouse</Btn
      >
    </div>
    <Btn color="green" onclick={() => game.go('passengers')}>
      Pickup Passengers: {co.passengers > 0 ? `${co.passengers} aboard` : passengersWaiting(co)}
    </Btn>
    <Btn color="green" onclick={() => game.go('advertise')}>Advertise for Next Planet</Btn>
    <Btn color="green" onclick={() => game.go('crew')}>
      Crew Wages Owed: {fmt(co.wagesOwed)}{co.onStrike ? ' — ON STRIKE!' : ''}
    </Btn>
    <Btn color="green" onclick={() => game.go('taxes')}>Taxes Owed: {fmt(taxes)}</Btn>
    <Btn color="green" onclick={() => game.go('insurance')}>
      Insurance/Cost: {co.insured ? 'Insured' : 'None'}/{fmt(co.insurancePremium)}
    </Btn>
    <Btn color="green" onclick={() => game.go('explore')}>Explore Planet</Btn>
    <Btn color="green" onclick={() => game.go('file')}>File Options</Btn>
  </div>

  <!-- right column -->
  <div class="right">
    <div class="fuelcost">Fuel Cost: {fmt(fuelCost)}</div>
    <button class="pump" onclick={() => game.go('fuel')} title="Fuel">⛽</button>
    <div class="gauge" title="Fuel tank">
      <div class="fill" style:height={`${Math.round(fuelPct * 100)}%`}></div>
      <span class="gauge-label">Fuel Tank</span>
    </div>
    <div class="status">wk {game.s.week} · {cargoTons(co)}/{co.ship.cargo} t</div>
  </div>
</div>

<style>
  .menu {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: grid;
    grid-template-columns: 240px 1fr 70px;
    gap: 8px;
    padding: 8px;
    box-sizing: border-box;
  }
  .left,
  .center,
  .right {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .left :global(.btn),
  .center :global(.btn) {
    justify-content: flex-start;
    padding: 8px 10px;
    font-size: 14px;
  }
  .planet {
    height: 232px;
    background: #000 center / cover no-repeat;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 2px 2px 0 #000;
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 6px;
    box-sizing: border-box;
  }
  .planet-ph {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font:
      bold 28px Georgia,
      serif;
    color: #fff;
    background: radial-gradient(circle at 40% 40%, #a0a0ff, #202060 60%, #000 100%);
  }
  .journey {
    position: relative;
    width: 100%;
    background: #000;
    color: #fff;
    border: 2px solid #c0c0c0;
    font: bold 12px var(--font-ui);
    padding: 4px;
    cursor: pointer;
  }
  .journey:hover {
    color: var(--c-yellow-plate);
  }
  .banner {
    background: var(--c-face);
    color: #000;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 2px 2px 0 #000;
    font: bold 17px var(--font-ui);
    text-align: center;
    padding: 8px;
  }
  .icons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .icons :global(.btn) {
    flex-direction: column;
    justify-content: center;
    padding: 6px;
    height: 62px;
    font-size: 12px;
  }
  .big {
    font-size: 22px;
    line-height: 1;
  }
  .right {
    align-items: center;
  }
  .fuelcost {
    background: var(--c-face);
    color: #000;
    font: bold 10px var(--font-ui);
    text-align: center;
    padding: 4px 2px;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    width: 100%;
    box-sizing: border-box;
  }
  .pump {
    font-size: 26px;
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    cursor: pointer;
    width: 100%;
    padding: 4px 0;
  }
  .gauge {
    flex: 1;
    width: 40px;
    background: #fff;
    border: 2px solid;
    border-color: #404040 #fff #fff #404040;
    position: relative;
    display: flex;
    align-items: flex-end;
    overflow: hidden;
  }
  .fill {
    width: 100%;
    background: #ff0000;
    transition: height 0.3s;
  }
  .gauge-label {
    position: absolute;
    left: 0;
    right: 0;
    top: 6px;
    text-align: center;
    font: bold 10px var(--font-ui);
    color: #000;
  }
  .status {
    font: 10px var(--font-ui);
    color: #000;
    text-align: center;
  }
</style>
