<script lang="ts">
  import Btn from '../components/Btn.svelte';
  import Plate from '../components/Plate.svelte';
  import Prompt from '../components/Prompt.svelte';
  import ServiceScreen from '../components/ServiceScreen.svelte';
  import { fmt } from '../format';
  import { game } from '../game.svelte';
  const co = $derived(game.co);
  const room = $derived(Math.max(0, co.unionLimit - co.unionLoan));
  let mode: 'borrow' | 'repay' | null = $state(null);
</script>

<ServiceScreen
  portrait="union"
  caption="Trader's Union Official"
  title="Trader's Union - Loan Department"
>
  {#snippet plates()}
    <Plate label="Loan Amount:" value={fmt(co.unionLoan)} />
    <Plate label="Interest Rate:" value={`${co.loanRate}% per week`} />
    <Plate label="Credit Limit:" value={fmt(co.unionLimit)} />
    <Plate label="Cash:" value={fmt(co.cash)} />
    <Plate label="Interest Paid (last week):" value={fmt(co.loanInterest)} />
  {/snippet}
  {#snippet extra()}
    <div class="warn">
      If your loan ever exceeds the credit limit, the Union will force you into bankruptcy.
    </div>
  {/snippet}
  {#snippet buttons()}
    <Btn onclick={() => game.go('menu')}>Continue</Btn>
    <Btn onclick={() => (mode = 'borrow')} disabled={room <= 0}>Borrow Money</Btn>
    <Btn onclick={() => game.dispatch({ type: 'unionBorrow', amount: room })} disabled={room <= 0}
      >Borrow Max</Btn
    >
    <Btn onclick={() => (mode = 'repay')} disabled={co.unionLoan <= 0 || co.cash <= 0}
      >Pay Back Loan</Btn
    >
    <Btn
      onclick={() => game.dispatch({ type: 'unionRepay', amount: Math.min(co.cash, co.unionLoan) })}
      disabled={co.unionLoan <= 0 || co.cash <= 0}>Pay Back Max</Btn
    >
    <Btn onclick={() => game.help()}>Help</Btn>
  {/snippet}
</ServiceScreen>

{#if mode === 'borrow'}
  <Prompt
    title="Borrow how much?"
    initial={Math.min(room, 20000)}
    max={room}
    presets={[
      { label: '10,000', value: 10000 },
      { label: '25,000', value: 25000 },
      { label: 'Max', value: room },
    ]}
    onok={(n) => {
      game.dispatch({ type: 'unionBorrow', amount: n });
      mode = null;
    }}
    oncancel={() => (mode = null)}
  />
{:else if mode === 'repay'}
  <Prompt
    title="Pay back how much?"
    initial={Math.min(co.cash, co.unionLoan)}
    max={Math.min(co.cash, co.unionLoan)}
    presets={[
      { label: '10,000', value: 10000 },
      { label: 'Max', value: Math.min(co.cash, co.unionLoan) },
    ]}
    onok={(n) => {
      game.dispatch({ type: 'unionRepay', amount: n });
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
