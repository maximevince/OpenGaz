<script lang="ts">
  /**
   * Commit history and time travel.
   *
   * Each row is one state the game passed through; selecting it shows exactly which leaves the
   * action moved, and *restore* puts the game back there. The engine is pure, so a restored
   * state plays on normally — this is the fastest way to answer "what did that click actually
   * do?" and to replay a suspicious turn.
   */
  import { brief } from '../path';
  import { RING, trace } from '../trace.svelte';

  let { onpick }: { onpick?: (path: string) => void } = $props();

  let filter = $state('');
  const sel = $derived(trace.current);
  const changes = $derived(
    sel
      ? sel.changes.filter((c) => !filter || c.path.toLowerCase().includes(filter.toLowerCase()))
      : [],
  );
</script>

<div class="bar">
  <button class="tog" onclick={() => trace.clear()}>clear</button>
  <button class="tog" class:on={trace.selected === null} onclick={() => (trace.selected = null)}
    >follow newest</button
  >
  <span class="dim">{trace.commits.length}/{RING} kept</span>
</div>

<div class="scroll-list">
  {#each [...trace.commits].reverse() as c (c.seq)}
    <button
      class="commit"
      class:on={sel?.seq === c.seq}
      class:cheat={c.kind === 'debug'}
      onclick={() => (trace.selected = c.seq)}
    >
      <span class="seq">#{c.seq}</span>
      <span class="label">{c.label}</span>
      <span class="dim">w{c.week} · {c.changes.length}Δ{c.ms ? ` · ${c.ms.toFixed(1)}ms` : ''}</span
      >
    </button>
  {:else}
    <div class="dim pad">nothing committed yet — take a turn</div>
  {/each}
</div>

{#if sel}
  <div class="sec-h">
    #{sel.seq}
    {sel.label}
    <button class="tog" onclick={() => trace.restore(sel.seq)}>restore</button>
  </div>
  <div class="bar">
    <input class="in" placeholder="filter paths" bind:value={filter} />
    <span class="dim">{changes.length} of {sel.changes.length}</span>
  </div>
  <table class="dbg-t grid tight">
    <tbody>
      {#each changes as c, i (c.path + i)}
        <tr>
          <td>
            <button class="link" onclick={() => onpick?.(c.path)}>{c.path || '(root)'}</button>
          </td>
          <td class="num dim">{brief(c.from, 24)}</td>
          <td class="num">→ {brief(c.to, 24)}</td>
        </tr>
      {:else}
        <tr><td colspan="3" class="dim">no change</td></tr>
      {/each}
    </tbody>
  </table>
{/if}
