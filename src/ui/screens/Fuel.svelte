<script lang="ts">
  import Btn from '../components/Btn.svelte';
  import Prompt from '../components/Prompt.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';
  const co = $derived(game.co);
  const p = $derived(game.planet);
  const room = $derived(co.ship.fuelCap - co.ship.fuel);
  const fillCost = $derived(room * p.fuelPrice);
  const affordable = $derived(Math.min(room, Math.floor(co.cash / p.fuelPrice)));
  let prompt = $state(false);
</script>

<div class="fuel">
  <div class="gauge">
    <div class="fill" style:height={`${(co.ship.fuel / co.ship.fuelCap) * 100}%`}></div>
    <div class="ticks">
      {#each [100, 75, 50, 25, 0] as t (t)}<span>{t}%</span>{/each}
    </div>
  </div>
  <div class="info">
    <h2>Ionic Fuel Depot</h2>
    <p>Fuel in tank: <b>{co.ship.fuel} / {co.ship.fuelCap} tons</b></p>
    <p>Price today: <b>{fmt(p.fuelPrice)} kubars per ton</b></p>
    <p>Cost to fill the tank: <b>{fmt(fillCost)}</b></p>
    <p>Cash: <b>{fmt(co.cash)}</b></p>
    <p class="note">
      Every trip burns fuel: roughly half the distance in million kuters plus a few tons for the
      ship's mass. Run dry in deep space and an emergency tanker will charge you a fortune.
    </p>
  </div>
  <div class="buttons">
    <Btn color="black" onclick={() => game.go('menu')}>Continue</Btn>
    <Btn
      color="black"
      onclick={() => game.dispatch({ type: 'buyFuel', tons: affordable })}
      disabled={affordable <= 0}
    >
      FILL UP THE TANK
    </Btn>
    <Btn color="black" onclick={() => (prompt = true)} disabled={affordable <= 0}>Buy some fuel</Btn
    >
    <Btn color="black" onclick={() => game.help()}>Help</Btn>
  </div>
</div>

{#if prompt}
  <Prompt
    title="How many tons of fuel?"
    initial={affordable}
    max={affordable}
    presets={[
      { label: '5 t', value: 5 },
      { label: '10 t', value: 10 },
      { label: 'Fill', value: affordable },
    ]}
    onok={(n) => {
      game.dispatch({ type: 'buyFuel', tons: n });
      prompt = false;
    }}
    oncancel={() => (prompt = false)}
  />
{/if}

<style>
  .fuel {
    position: absolute;
    inset: 0;
    background: #000;
    color: #fff;
    display: grid;
    grid-template-columns: 120px 1fr;
    grid-template-rows: 1fr 70px;
    gap: 16px;
    padding: 16px;
    box-sizing: border-box;
  }
  .gauge {
    position: relative;
    background: #202020;
    border: 3px solid #808080;
    display: flex;
    align-items: flex-end;
  }
  .fill {
    width: 100%;
    background: linear-gradient(#ff8080, #ff0000);
  }
  .ticks {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font: bold 11px var(--font-ui);
    padding: 2px 4px;
    color: #fff;
  }
  .info h2 {
    margin: 0 0 12px;
    font: bold 22px var(--font-ui);
    color: #ff4040;
  }
  .info p {
    margin: 6px 0;
    font: 15px var(--font-ui);
  }
  .note {
    color: #c0c0c0;
    font-size: 13px !important;
    max-width: 440px;
  }
  .buttons {
    grid-column: 1 / -1;
    display: flex;
    gap: 6px;
  }
  .buttons :global(.btn) {
    flex: 1;
    font-size: 15px;
  }
</style>
