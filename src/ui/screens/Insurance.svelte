<script lang="ts">
  import Btn from '../components/Btn.svelte';
  import Plate from '../components/Plate.svelte';
  import ServiceScreen from '../components/ServiceScreen.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';
  const co = $derived(game.co);
</script>

<ServiceScreen portrait="insurance" caption="Insurance Agent" title="Voyager's Insurance Company">
  {#snippet plates()}
    <Plate label="Premium (next trip):" value={fmt(co.insurancePremium)} />
    <Plate
      label="Status:"
      value={co.insured ? 'INSURED for the next trip' : 'Not insured'}
      color={co.insured ? 'green' : 'yellow'}
    />
    <Plate label="Cash:" value={fmt(co.cash)} />
  {/snippet}
  {#snippet extra()}
    <div class="warn">
      Covers losses from meteor storms, pirates, warehouse fires and other misfortunes on your next
      trip only. Does not cover fines, gambling, wages, loans or taxes.
    </div>
  {/snippet}
  {#snippet buttons()}
    <Btn onclick={() => game.go('menu')}>Continue</Btn>
    <Btn
      onclick={() => game.dispatch({ type: 'buyInsurance' })}
      disabled={co.insured || co.cash < co.insurancePremium}>Purchase Voyager's Insurance</Btn
    >
    <Btn onclick={() => game.go('menu')}>Help</Btn>
  {/snippet}
</ServiceScreen>

<style>
  .warn {
    font: 12px var(--font-ui);
    color: #000;
    padding: 4px 2px;
  }
</style>
