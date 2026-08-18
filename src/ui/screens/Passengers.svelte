<script lang="ts">
  import { passengersWaiting } from '../../engine';
  import { img } from '../assets';
  import Btn from '../components/Btn.svelte';
  import Plate from '../components/Plate.svelte';
  import Prompt from '../components/Prompt.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';
  const co = $derived(game.co);
  const waiting = $derived(passengersWaiting(co));
  const ship = $derived(img(`ship.${co.ship.defId}.picture`));
  let prompt = $state(false);
</script>

<div class="pax">
  <div class="shipbox">
    {#if ship}<img src={ship} alt="your ship" />{:else}<div class="ph">your ship</div>{/if}
  </div>
  <div class="right">
    <div class="title">Passenger Terminal</div>
    <Plate label="Ticket Price:" value={fmt(co.ticketPrice)} />
    <Plate label="Passengers Waiting:" value={waiting} />
    <Plate label="Seats:" value={co.ship.seats} />
    <Plate
      label="Aboard for next trip:"
      value={co.passengers}
      color={co.passengers > 0 ? 'green' : 'cyan'}
    />
    <Plate label="Expected fare income:" value={fmt(waiting * co.ticketPrice)} />
    {#if co.onStrike}<Plate label="Crew on strike — nobody boards!" color="yellow" />{/if}
    <div class="note">
      Fares are paid on arrival and taxed. Set the price too high and nobody shows up; advertise to
      fill the seats.
    </div>
  </div>
  <div class="buttons">
    <Btn onclick={() => game.go('menu')}>Continue</Btn>
    <Btn onclick={() => game.dispatch({ type: 'pickupPassengers' })} disabled={waiting === 0}
      >Pick Up Passengers</Btn
    >
    <Btn onclick={() => (prompt = true)}>Set TICKET PRICE</Btn>
    <Btn onclick={() => game.go('advertise')}>Advertise</Btn>
    <Btn onclick={() => game.help()}>Help</Btn>
  </div>
</div>

{#if prompt}
  <Prompt
    title="Set the ticket price"
    text="Between 100 and 10,000 kubars per passenger."
    initial={co.ticketPrice}
    max={10000}
    presets={[
      { label: '1,000', value: 1000 },
      { label: '3,000', value: 3000 },
      { label: '5,000', value: 5000 },
    ]}
    onok={(n) => {
      game.dispatch({ type: 'setTicketPrice', price: n });
      prompt = false;
    }}
    oncancel={() => (prompt = false)}
  />
{/if}

<style>
  .pax {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: grid;
    grid-template-columns: 300px 1fr;
    grid-template-rows: 1fr 84px;
    gap: 10px;
    padding: 10px;
    box-sizing: border-box;
  }
  .shipbox {
    background: #000;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  img {
    max-width: 100%;
    max-height: 100%;
  }
  .ph {
    color: #888;
    font: bold 14px var(--font-ui);
  }
  .right {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .title {
    background: var(--c-yellow-plate);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 2px 2px 0 #000;
    font: bold 17px var(--font-ui);
    text-align: center;
    padding: 9px;
    color: #000;
  }
  .note {
    font: 12px var(--font-ui);
    color: #000;
  }
  .buttons {
    grid-column: 1 / -1;
    display: flex;
    gap: 6px;
  }
  .buttons :global(.btn) {
    flex: 1;
    font-size: 15px;
    white-space: normal;
  }
</style>
