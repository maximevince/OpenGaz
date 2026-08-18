<script lang="ts">
  import Btn from '../components/Btn.svelte';
  import Plate from '../components/Plate.svelte';
  import Prompt from '../components/Prompt.svelte';
  import ServiceScreen from '../components/ServiceScreen.svelte';
  import { fmt, pct } from '../format';
  import { game } from '../game.svelte';
  const co = $derived(game.co);
  const maxPay = $derived(Math.min(co.cash, co.zinnLoan));
  let mode: 'repay' | null = $state(null);
</script>

<ServiceScreen portrait="zinn" caption="Mr. Zinn" title="Mr. Zinn's Loan">
  {#snippet plates()}
    <Plate label="Loan Amount:" value={fmt(co.zinnLoan)} />
    <Plate label="Interest Rate:" value={`${pct(co.zinnRate)} per week`} />
    <Plate label="Credit Limit:" value={fmt(co.zinnLimit)} />
    <Plate label="Cash:" value={fmt(co.cash)} />
    <Plate
      label="Interest Paid (last week):"
      value={fmt(Math.round(co.zinnLoan - co.zinnLoan / (1 + co.zinnRate)))}
    />
  {/snippet}
  {#snippet extra()}
    <div class="warn">
      Mr. Zinn financed your ship. Interest is added every week you travel. Exceed his credit limit
      and he repossesses the ship.
    </div>
  {/snippet}
  {#snippet buttons()}
    <Btn onclick={() => game.go('menu')}>Continue</Btn>
    <Btn onclick={() => (mode = 'repay')} disabled={maxPay <= 0}>Pay Back Loan</Btn>
    <Btn onclick={() => game.dispatch({ type: 'zinnRepay', amount: maxPay })} disabled={maxPay <= 0}
      >Pay Back Max</Btn
    >
    <Btn onclick={() => game.help()}>Help</Btn>
  {/snippet}
</ServiceScreen>

{#if mode === 'repay'}
  <Prompt
    title="Pay Mr. Zinn how much?"
    initial={maxPay}
    max={maxPay}
    presets={[
      { label: '10,000', value: 10000 },
      { label: '25,000', value: 25000 },
      { label: 'Max', value: maxPay },
    ]}
    onok={(n) => {
      game.dispatch({ type: 'zinnRepay', amount: n });
      mode = null;
    }}
    oncancel={() => (mode = null)}
  />
{/if}

<style>
  .warn {
    font: 12px var(--font-ui);
    color: #000;
    padding: 4px 2px;
  }
</style>
