<script lang="ts">
  /** The seven worlds in play: fuel, exchange, facilities, and who is standing on them. */
  import type { GameState } from '../../../engine';
  import { planetRows } from '../inspect';
  import JsonTree from '../JsonTree.svelte';

  let { s, onpick }: { s: GameState; onpick?: (path: string) => void } = $props();

  const rows = $derived(planetRows(s));
  let open = $state<number | null>(null);
</script>

<table class="dbg-t grid">
  <thead>
    <tr><th>#</th><th>planet</th><th>slot</th><th>fuel</th><th>share</th><th>trend</th></tr>
  </thead>
  <tbody>
    {#each rows as r (r.i)}
      <tr>
        <td
          ><button class="link" onclick={() => (open = open === r.i ? null : r.i)}>{r.i}</button
          ></td
        >
        <td
          >{r.name}
          <div class="dim">{r.special}</div></td
        >
        <td class="num">{r.slot}</td>
        <td class="num">{r.fuel}</td>
        <td class="num" class:bad={r.crashed}>{r.crashed ? 'CRASHED' : r.share}</td>
        <td class="num">{r.trend}</td>
      </tr>
      <tr class="sub">
        <td></td>
        <td colspan="5" class="dim"
          >here: {r.here || 'nobody'} · ads {r.advertC} · facilities: {r.facilities}</td
        >
      </tr>
    {/each}
  </tbody>
</table>

{#if open !== null}
  <div class="sec-h">planet {open} — {rows[open]?.name}</div>
  <JsonTree value={s.planets[open]} name={`planets[${open}]`} path={`planets[${open}]`} {onpick} />
{/if}
