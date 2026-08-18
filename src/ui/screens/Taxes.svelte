<script lang="ts">
  import Btn from '../components/Btn.svelte';
  import Plate from '../components/Plate.svelte';
  import ServiceScreen from '../components/ServiceScreen.svelte';
  import { fmt, pct } from '../format';
  import { game } from '../game.svelte';
  const co = $derived(game.co);
  const total = $derived(co.taxOwedPassenger + co.taxOwedTariff);
  const e = $derived(game.s.econ);
</script>

<ServiceScreen portrait="tax" caption="Imperial Tax Auditor" title="Imperial Tax Office">
  {#snippet plates()}
    <Plate label="Passenger Taxes:" value={fmt(co.taxOwedPassenger)} />
    <Plate label="Commodity Tariffs:" value={fmt(co.taxOwedTariff)} />
    <Plate label="Total Owed:" value={fmt(total)} color={total > 0 ? 'yellow' : 'cyan'} />
    <Plate label="Cash:" value={fmt(co.cash)} />
    <Plate
      label="Rates:"
      value={`pax ${pct(e.passengerTax)} · import ${pct(e.importTariff)} · export ${pct(e.exportTariff)}`}
    />
  {/snippet}
  {#snippet buttons()}
    <Btn onclick={() => game.go('menu')}>Continue</Btn>
    <Btn
      onclick={() => game.dispatch({ type: 'payTaxes' })}
      disabled={total <= 0 || co.cash < total}>Pay All Taxes</Btn
    >
    <Btn onclick={() => game.help()}>Help</Btn>
  {/snippet}
</ServiceScreen>
