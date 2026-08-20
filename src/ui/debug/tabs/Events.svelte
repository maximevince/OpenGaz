<script lang="ts">
  /**
   * The bookkeeping behind travel events, dialogs and auctions — the three places where a bug
   * shows up as "the wrong thing happened on the way somewhere" and the state is the only
   * witness.
   */
  import { facilityName, planetName, type GameState } from '../../../engine';
  import JsonTree from '../JsonTree.svelte';

  let { s, onpick }: { s: GameState; onpick?: (path: string) => void } = $props();
</script>

<div class="sec-h">pending dialog</div>
{#if s.pending}
  <table class="dbg-t">
    <tbody>
      <tr><td class="k">id</td><td>{s.pending.id}</td></tr>
      <tr><td class="k">title</td><td>{s.pending.title}</td></tr>
      <tr
        ><td class="k">context</td><td>{s.pending.context} · mood {s.pending.mood ?? 'neutral'}</td
        ></tr
      >
      <tr
        ><td class="k">choices</td><td
          >{s.pending.choices.map((c) => `${c.id}: ${c.label}`).join(' | ') ||
            'acknowledge only'}</td
        ></tr
      >
      {#if s.pending.input}
        <tr
          ><td class="k">input</td><td
            >{s.pending.input.label} ({s.pending.input.min}–{s.pending.input.max}, starts {s.pending
              .input.initial})</td
          ></tr
        >
      {/if}
      <tr><td class="k">text</td><td class="dim">{s.pending.text}</td></tr>
    </tbody>
  </table>
  {#if s.pending.data}
    <JsonTree value={s.pending.data} name="pending.data" path="pending.data" {onpick} />
  {/if}
{:else}
  <div class="dim pad">none</div>
{/if}

<div class="sec-h">travel chain</div>
{#if s.travel}
  <table class="dbg-t">
    <tbody>
      <tr
        ><td class="k">route</td><td
          >{planetName(s, s.travel.from)} → {planetName(s, s.travel.to)}</td
        ></tr
      >
      <tr
        ><td class="k">chain</td><td>{s.travel.good ? 'good' : 'bad'} · cursor {s.travel.cursor}</td
        ></tr
      >
      <tr><td class="k">fired</td><td>{s.travel.fired} · delays {s.travel.delays}</td></tr>
      <tr
        ><td class="k">flags</td><td
          >{[
            s.travel.badExclusiveDone && 'badExclusiveDone',
            s.travel.block4447 && 'block44-47',
            s.travel.badChainForced && 'badChainForced',
            s.travel.squowk && `squowk ${s.travel.squowk}`,
          ]
            .filter(Boolean)
            .join(' · ') || '—'}</td
        ></tr
      >
    </tbody>
  </table>
{:else}
  <div class="dim pad">not in flight</div>
{/if}

<div class="sec-h">auction</div>
{#if s.auction}
  <table class="dbg-t">
    <tbody>
      <tr
        ><td class="k">lot</td><td
          >{s.auction.kind === 'ship'
            ? 'a ship upgrade'
            : `${facilityName(s.auction, s)} — fee ${s.auction.fee}`}</td
        ></tr
      >
      <tr
        ><td class="k">high</td><td
          >{s.auction.highBid} by {s.companies[s.auction.highCompany]?.name ?? '—'}</td
        ></tr
      >
      <tr
        ><td class="k">next</td><td
          >{s.auction.nextBid} by {s.companies[s.auction.nextCompany]?.name ?? '—'}</td
        ></tr
      >
      <tr><td class="k">responded</td><td>{s.auction.responded.join(', ') || 'nobody yet'}</td></tr>
    </tbody>
  </table>
{:else}
  <div class="dim pad">nothing running</div>
{/if}

<div class="sec-h">last auction result</div>
{#if s.auctionLast}
  <JsonTree value={s.auctionLast} name="auctionLast" path="auctionLast" {onpick} />
{:else}
  <div class="dim pad">none</div>
{/if}
