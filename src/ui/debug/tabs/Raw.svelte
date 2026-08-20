<script lang="ts">
  /** The whole state as a tree, plus the ways to get it out of the browser and back in. */
  import { encodeForLink, serialize, type GameState } from '../../../engine';
  import { replaceState } from '../cheats';
  import JsonTree from '../JsonTree.svelte';

  let { s, onpick }: { s: GameState; onpick?: (path: string) => void } = $props();

  let filter = $state('');
  let paste = $state('');
  let note = $state('');

  async function copy(what: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      note = `${what} copied (${text.length.toLocaleString('en-US')} chars)`;
    } catch {
      note = 'the clipboard said no — the browser wants a user gesture on a secure origin';
    }
  }
</script>

<div class="bar">
  <button class="tog" onclick={() => copy('state', serialize(s))}>copy json</button>
  <button
    class="tog"
    onclick={() => copy('link', `${location.origin}${location.pathname}#g=${encodeForLink(s)}`)}
    >copy game link</button
  >
  <input class="in" placeholder="filter keys and values" bind:value={filter} />
</div>
{#if note}<div class="dim pad">{note}</div>{/if}

<div class="tree">
  <JsonTree value={s} name="state" path="" {onpick} {filter} />
</div>

<div class="sec-h">replace the state</div>
<textarea class="in area" placeholder="paste a state json here" bind:value={paste}></textarea>
<div class="bar">
  <button
    class="tog danger"
    disabled={!paste.trim()}
    onclick={() => (note = replaceState(paste) ?? 'state replaced')}>load it</button
  >
  <span class="dim">no validation — a wrong shape will throw somewhere else</span>
</div>
