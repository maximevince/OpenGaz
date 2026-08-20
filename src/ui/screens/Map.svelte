<script lang="ts">
  import {
    MAP_SLOTS,
    PLANET_BY_ID,
    distanceBetween,
    humanTravelTime,
    unlocked,
  } from '../../engine';
  import { img } from '../assets';
  import Btn from '../components/Btn.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';
  import { shortcuts } from '../shortcuts.svelte';
  const s = $derived(game.s);
  const co = $derived(game.co);
  let hover: number | null = $state(null);
  let confirm: number | null = $state(null);
  // slot grid units -> pixels inside a 640x420 field
  const pos = (slot: number) => {
    const g = MAP_SLOTS[slot]!;
    return { x: 40 + (g.x / 21) * 540, y: 40 + (g.y / 13) * 330 };
  };
  const stars = img('bg.stars.1');
  const worst = (to: number) => {
    const d = distanceBetween(s, co.planet, to);
    return Math.floor(d / 2) + Math.floor(co.ship.tons / 100);
  };

  /**
   * Leave for `to`. Quick Deposit banks the cash first, so it earns interest in flight; the
   * deposit is a normal action, so it is logged and replayed like any other.
   */
  function depart(to: number) {
    confirm = null;
    if (shortcuts.on(co.id, 'deposit') && co.cash > 0) {
      game.dispatch({ type: 'bankDeposit', amount: co.cash });
    }
    game.dispatch({ type: 'journey', to });
  }
</script>

<div class="map" style:background-image={stars ? `url(${stars})` : undefined}>
  {#each s.planets as p, i (p.id)}
    {@const pt = pos(p.slot)}
    {@const icon = img(`planet.${p.id}.medium`)}
    {@const here = i === co.planet}
    <button
      class="planet"
      class:here
      style:left={`${pt.x}px`}
      style:top={`${pt.y}px`}
      onmouseenter={() => (hover = i)}
      onmouseleave={() => (hover = null)}
      onclick={() => !here && (shortcuts.on(co.id, 'travel') ? depart(i) : (confirm = i))}
      oncontextmenu={(e) => {
        e.preventDefault();
        if (!here) confirm = i;
      }}
      title={PLANET_BY_ID[p.id].name}
    >
      {#if icon}<img src={icon} alt="" />{:else}<span class="ball"></span>{/if}
      <span class="nm" class:yellow={hover === i}>{PLANET_BY_ID[p.id].name}</span>
    </button>
  {/each}
  <div class="galaxy">✦</div>
  <div class="info">
    {#if hover !== null && hover !== co.planet}
      {PLANET_BY_ID[s.planets[hover]!.id].name}: {distanceBetween(s, co.planet, hover).toFixed(1)} million
      kuters · ~{humanTravelTime(
        distanceBetween(s, co.planet, hover),
        co.ship.kuarps,
        co.travelDelayed,
      )} days · up to {worst(hover)} t fuel (tank {co.ship.fuel} t)
    {:else}
      You are on {PLANET_BY_ID[game.planet.id].name}. Click a planet to travel there. Week {s.week}.
      {#if shortcuts.on(co.id, 'travel')}⚡ Quick Travel: a click launches at once (right-click to
        see the trip first).{/if}
      {#if shortcuts.on(co.id, 'deposit')}⚡ Quick Deposit: your cash goes to the bank as you leave.{/if}
    {/if}
  </div>
  <div class="buttons">
    <Btn color="black" onclick={() => game.go('menu')}>Return to Main Menu</Btn>
    {#if unlocked(s, 'supply')}
      <Btn color="black" onclick={() => game.go('supply')}>Supply Chart</Btn>
    {/if}
    {#if unlocked(s, 'distance')}
      <Btn color="black" onclick={() => game.go('charts')}>Distances &amp; Facilities</Btn>
    {/if}
    <Btn color="black" onclick={() => game.help()}>Help</Btn>
  </div>

  {#if confirm !== null}
    {@const d = confirm}
    <div class="backdrop" role="presentation">
      <div class="dlg">
        <div class="dlg-title">Journey to {PLANET_BY_ID[s.planets[d]!.id].name}?</div>
        <div class="dlg-body">
          <p>
            {distanceBetween(s, co.planet, d).toFixed(1)} million kuters · about {humanTravelTime(
              distanceBetween(s, co.planet, d),
              co.ship.kuarps,
              co.travelDelayed,
            )} days at {co.ship.kuarps} kuarps.
          </p>
          <p>
            Fuel needed: up to {worst(d)} t (you have {co.ship.fuel} t){co.ship.fuel < worst(d)
              ? ' — you may run dry!'
              : ''}.
          </p>
          {#if co.wagesOwed > 0}<p class="w">Wages owed: {fmt(co.wagesOwed)}.</p>{/if}
          {#if !co.insured}<p class="w">You are not insured for this trip.</p>{/if}
          {#if co.passengers === 0}<p class="w">No passengers aboard.</p>{/if}
          <div class="row">
            <Btn color="green" onclick={() => depart(confirm!)}>Blast off!</Btn>
            <Btn onclick={() => (confirm = null)}>Stay</Btn>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .map {
    position: absolute;
    inset: 0;
    background: #000 center / cover;
    overflow: hidden;
  }
  .planet {
    position: absolute;
    transform: translate(-50%, -50%);
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    color: #fff;
    width: 90px;
  }
  .planet img {
    width: 56px;
    height: 56px;
    object-fit: contain;
    image-rendering: auto;
    mix-blend-mode: screen; /* hides the black square around planet renders */
  }
  .planet.here img,
  .planet.here .ball {
    filter: drop-shadow(0 0 8px #ff0);
  }
  .ball {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #c0c0ff, #404080 60%, #101030);
  }
  .nm {
    font: bold 12px var(--font-ui);
    text-shadow: 1px 1px 0 #000;
  }
  .yellow {
    color: #ff0;
  }
  .galaxy {
    position: absolute;
    right: 40px;
    top: 200px;
    color: #c0c0ff;
    font-size: 40px;
    opacity: 0.6;
    pointer-events: none;
  }
  .info {
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 48px;
    background: #000;
    color: var(--c-cyan);
    font: bold 12px var(--font-ui);
    text-align: center;
    padding: 4px;
    border: 1px solid #404040;
  }
  .buttons {
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 8px;
    display: flex;
    gap: 6px;
  }
  .buttons :global(.btn) {
    flex: 1;
    font-size: 14px;
    padding: 6px;
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: grid;
    place-items: center;
  }
  .dlg {
    width: 420px;
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 3px 3px 0 #000;
    color: #000;
  }
  .dlg-title {
    background: var(--c-navy);
    color: #fff;
    font: bold 14px var(--font-ui);
    padding: 5px 8px;
  }
  .dlg-body {
    padding: 8px 12px 12px;
    font: 13px var(--font-ui);
  }
  .dlg-body p {
    margin: 4px 0;
  }
  .w {
    color: #800000;
    font-weight: bold;
  }
  .row {
    display: flex;
    gap: 6px;
    margin-top: 10px;
  }
  .row :global(.btn) {
    flex: 1;
  }
</style>
