<script lang="ts">
  import Btn from '../components/Btn.svelte';
  import Plate from '../components/Plate.svelte';
  import Prompt from '../components/Prompt.svelte';
  import ServiceScreen from '../components/ServiceScreen.svelte';
  import { fmt, pct } from '../format';
  import { game } from '../game.svelte';
  const co = $derived(game.co);
  let mode: 'deposit' | 'withdraw' | null = $state(null);
</script>

<ServiceScreen portrait="bank" caption="Bank Manager" title="Trader's Union Bank">
  {#snippet plates()}
    <Plate label="Savings Account:" value={fmt(co.bank)} />
    <Plate label="Interest Rate:" value={`${pct(co.bankRate)} per week`} />
    <Plate label="Cash:" value={fmt(co.cash)} />
    <Plate
      label="Interest Earned (last week):"
      value={fmt(Math.round(co.bank - co.bank / (1 + co.bankRate)))}
    />
  {/snippet}
  {#snippet buttons()}
    <Btn onclick={() => game.go('menu')}>Continue</Btn>
    <Btn onclick={() => (mode = 'deposit')} disabled={co.cash <= 0}>Deposit Money</Btn>
    <Btn
      onclick={() => game.dispatch({ type: 'bankDeposit', amount: co.cash })}
      disabled={co.cash <= 0}>Deposit All</Btn
    >
    <Btn onclick={() => (mode = 'withdraw')} disabled={co.bank <= 0}>Withdraw Money</Btn>
    <Btn
      onclick={() => game.dispatch({ type: 'bankWithdraw', amount: co.bank })}
      disabled={co.bank <= 0}>Withdraw All</Btn
    >
    <Btn onclick={() => game.go('menu')}>Help</Btn>
  {/snippet}
</ServiceScreen>

{#if mode === 'deposit'}
  <Prompt
    title="Deposit how much?"
    initial={co.cash}
    max={co.cash}
    presets={[
      { label: '10,000', value: 10000 },
      { label: 'Half', value: Math.floor(co.cash / 2) },
      { label: 'All', value: co.cash },
    ]}
    onok={(n) => {
      game.dispatch({ type: 'bankDeposit', amount: n });
      mode = null;
    }}
    oncancel={() => (mode = null)}
  />
{:else if mode === 'withdraw'}
  <Prompt
    title="Withdraw how much?"
    initial={co.bank}
    max={co.bank}
    presets={[
      { label: '10,000', value: 10000 },
      { label: 'Half', value: Math.floor(co.bank / 2) },
      { label: 'All', value: co.bank },
    ]}
    onok={(n) => {
      game.dispatch({ type: 'bankWithdraw', amount: n });
      mode = null;
    }}
    oncancel={() => (mode = null)}
  />
{/if}
