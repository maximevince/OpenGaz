<script lang="ts">
  /** The world log and the reports queued for the next arrival, filterable. */
  import type { GameState, LogEntry } from '../../../engine';

  let { s }: { s: GameState } = $props();

  const KINDS: LogEntry['kind'][] = ['news', 'event', 'info', 'warn', 'good', 'bad'];
  let kind = $state<'' | LogEntry['kind']>('');
  let who = $state<number | ''>('');
  let text = $state('');

  const rows = $derived(
    [...s.log]
      .reverse()
      .filter(
        (e) =>
          (!kind || e.kind === kind) &&
          (who === '' || e.company === who) &&
          (!text || e.text.toLowerCase().includes(text.toLowerCase())),
      ),
  );
  const nameOf = (i: number) => (i < 0 ? 'world' : (s.companies[i]?.name ?? `#${i}`));
</script>

<div class="bar">
  <select class="in" bind:value={kind}>
    <option value="">any kind</option>
    {#each KINDS as k (k)}<option value={k}>{k}</option>{/each}
  </select>
  <select class="in" bind:value={who}>
    <option value="">anyone</option>
    <option value={-1}>world news</option>
    {#each s.companies as c, i (c.id)}<option value={i}>{i} {c.name}</option>{/each}
  </select>
  <input class="in" placeholder="text" bind:value={text} />
</div>

{#if s.arrivalReports.length}
  <div class="sec-h">arrivalReports ({s.arrivalReports.length})</div>
  <div class="scroll-list short">
    {#each s.arrivalReports as e, i (i)}
      <div class="logline"><span class="dim">w{e.week} {e.kind}</span> {e.text}</div>
    {/each}
  </div>
{/if}

<div class="sec-h">log — {rows.length} of {s.log.length}</div>
<div class="scroll-list">
  {#each rows as e, i (i)}
    <div class="logline {e.kind}">
      <span class="dim">w{e.week} · {nameOf(e.company)} · {e.kind}</span>
      {e.text}
    </div>
  {:else}
    <div class="dim pad">nothing matches</div>
  {/each}
</div>
