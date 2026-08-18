<script lang="ts">
  import { SHIP_BY_ID } from '../../engine';
  import Btn from '../components/Btn.svelte';
  import Plate from '../components/Plate.svelte';
  import ServiceScreen from '../components/ServiceScreen.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';
  const co = $derived(game.co);
</script>

<ServiceScreen portrait="crew" caption="Union Boss" title="Crew Wages">
  {#snippet plates()}
    <Plate label="Ship:" value={SHIP_BY_ID(co.ship.defId).name} />
    <Plate label="Employees:" value={co.ship.crew} />
    <Plate label="Salary:" value={`${fmt(co.crewSalary)} per employee per week`} />
    <Plate
      label="Wages Owed:"
      value={fmt(co.wagesOwed)}
      color={co.wagesOwed > 0 ? 'yellow' : 'cyan'}
    />
    <Plate label="Cash:" value={fmt(co.cash)} />
    {#if co.onStrike}<Plate label="YOUR CREW IS ON STRIKE" color="yellow" />{/if}
  {/snippet}
  {#snippet extra()}
    <div class="warn">
      Wages accrue every week. Fall behind and the crew may go on strike — no passengers until you
      pay up.
    </div>
  {/snippet}
  {#snippet buttons()}
    <Btn onclick={() => game.go('menu')}>Continue</Btn>
    <Btn
      onclick={() => game.dispatch({ type: 'payCrew' })}
      disabled={co.wagesOwed <= 0 || co.cash < co.wagesOwed}>Pay Employees</Btn
    >
    <Btn onclick={() => game.help()}>Help</Btn>
  {/snippet}
</ServiceScreen>

<style>
  .warn {
    font: 12px var(--font-ui);
    color: #000;
    padding: 4px 2px;
  }
</style>
