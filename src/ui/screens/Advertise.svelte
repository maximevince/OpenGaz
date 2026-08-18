<script lang="ts">
  import { ECON, adSpend } from '../../engine';
  import Btn from '../components/Btn.svelte';
  import Plate from '../components/Plate.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';
  const co = $derived(game.co);
  let tab: 'passenger' | 'commodity' = $state('passenger');
  let pax = $state(0);
  let com = $state(0);
  $effect(() => {
    pax = co.adPassenger;
    com = co.adCommodity;
  });
  const cost = $derived(adSpend(pax, co) + adSpend(com, co));
  const paid = $derived(adSpend(co.adPassenger, co) + adSpend(co.adCommodity, co));
</script>

<div class="ads">
  <div class="tabs">
    <button class:on={tab === 'passenger'} onclick={() => (tab = 'passenger')}
      >Passenger Advertising</button
    >
    <button class:on={tab === 'commodity'} onclick={() => (tab = 'commodity')}
      >Commodity Advertising</button
    >
  </div>
  <div class="body">
    <div class="options">
      {#each ECON.adTierNames as name, i (name)}
        <label class="opt">
          <input
            type="radio"
            name="tier-{tab}"
            value={i}
            checked={(tab === 'passenger' ? pax : com) === i}
            onchange={() => (tab === 'passenger' ? (pax = i) : (com = i))}
          />
          <span class="nm">{name}</span>
          <span class="cost">{fmt(adSpend(i, co))}</span>
        </label>
      {/each}
    </div>
    <div class="side">
      <Plate label="Passenger ads:" value={ECON.adTierNames[pax]} />
      <Plate label="Commodity ads:" value={ECON.adTierNames[com]} />
      <Plate label="Total cost:" value={fmt(cost)} color="yellow" />
      <Plate label="Already placed:" value={fmt(paid)} />
      <Plate label="Cash:" value={fmt(co.cash)} />
      <p class="note">
        Ads work for <b>one week</b> — they take effect on the <b>next</b> planet. Passenger ads bring
        travellers to your ticket counter; commodity ads bring extra tons of goods to that market (rivals
        can buy them too). Larger ships pay more.
      </p>
    </div>
  </div>
  <div class="buttons">
    <Btn onclick={() => game.go('menu')}>Continue</Btn>
    <Btn
      onclick={() => game.dispatch({ type: 'advertise', passenger: pax, commodity: com })}
      disabled={pax === co.adPassenger && com === co.adCommodity}
    >
      Place the Ad
    </Btn>
    <Btn onclick={() => game.help()}>Help</Btn>
  </div>
</div>

<style>
  .ads {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    box-sizing: border-box;
    color: #000;
  }
  .tabs {
    display: flex;
    gap: 4px;
  }
  .tabs button {
    flex: 1;
    font: bold 14px var(--font-ui);
    padding: 8px;
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    cursor: pointer;
  }
  .tabs button.on {
    background: var(--c-yellow-plate);
  }
  .body {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 260px;
    gap: 10px;
  }
  .options {
    background: #fff;
    border: 2px inset #808080;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .opt {
    display: grid;
    grid-template-columns: 24px 1fr 80px;
    align-items: center;
    font: bold 14px var(--font-ui);
    padding: 4px;
    cursor: pointer;
  }
  .opt:hover {
    background: #e0e0ff;
  }
  .cost {
    text-align: right;
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .note {
    font: 12px var(--font-ui);
    margin: 0;
  }
  .buttons {
    display: flex;
    gap: 6px;
  }
  .buttons :global(.btn) {
    flex: 1;
    font-size: 15px;
    padding: 8px;
  }
</style>
