<script lang="ts">
  /** Every company side by side, with the whole of one of them on demand. */
  import type { GameState } from '../../../engine';
  import { companyDetail, companyRows } from '../inspect';
  import JsonTree from '../JsonTree.svelte';

  let { s, onpick }: { s: GameState; onpick?: (path: string) => void } = $props();

  const rows = $derived(companyRows(s));
  let open = $state<number | null>(null);
  const detail = $derived(open === null ? null : companyDetail(s, open));
  const money = (n: number) => n.toLocaleString('en-US');
</script>

<table class="dbg-t grid">
  <thead>
    <tr>
      <th>#</th><th>company</th><th>at</th><th>cash</th><th>bank</th><th>debt</th><th>worth</th>
    </tr>
  </thead>
  <tbody>
    {#each rows as r (r.i)}
      <tr class:cur={r.current} class:dim={s.companies[r.i]?.bankrupt}>
        <td>
          <button class="link" onclick={() => (open = open === r.i ? null : r.i)}>{r.i}</button>
        </td>
        <td
          >{r.name}
          <div class="dim">{r.ai}</div></td
        >
        <td>{r.planet}</td>
        <td class="num">{money(r.cash)}</td>
        <td class="num">{money(r.bank)}</td>
        <td class="num" class:bad={r.debt > 0}>{money(r.debt)}</td>
        <td class="num">{money(r.netWorth)}</td>
      </tr>
      <tr class="sub" class:cur={r.current}>
        <td></td>
        <td colspan="6" class="dim"
          >hold {r.cargo} · store {r.store}t · pax {r.pax} · fuel {r.fuel}
          {#if r.flags}· {r.flags}{/if}</td
        >
      </tr>
    {/each}
  </tbody>
</table>

{#if detail && open !== null}
  <div class="sec-h">company {open} — {rows[open]?.name}</div>
  <table class="dbg-t">
    <tbody>
      {#each Object.entries(detail) as [k, v] (k)}
        <tr><td class="k">{k}</td><td>{Array.isArray(v) ? v.join(', ') : String(v)}</td></tr>
      {/each}
    </tbody>
  </table>
  <div class="sec-h">raw</div>
  <JsonTree
    value={s.companies[open]}
    name={`companies[${open}]`}
    path={`companies[${open}]`}
    {onpick}
  />
{/if}
