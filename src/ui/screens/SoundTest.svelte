<script lang="ts">
  /**
   * Dev-only bench for the sound set. Every id can be heard from the active pack and from the
   * built-in synth side by side, which is how a candidate sample gets judged against what it is
   * replacing. The buttons that reach this screen — on the title screen and in File Options —
   * only appear under `pnpm dev`.
   */
  import { onMount } from 'svelte';
  import { COMMODITY_BY_ID, type CommodityId } from '../../engine';
  import { activePack } from '../assets';
  import Btn from '../components/Btn.svelte';
  import { game } from '../game.svelte';
  import {
    hasSample,
    onPlayingChange,
    play,
    playingId,
    soundIds,
    stop,
    type Source,
  } from '../sound';

  const GROUPS: { title: string; ids: string[] }[] = [
    { title: 'Interface', ids: ['click', 'help', 'ping', 'select', 'error', 'unlock'] },
    { title: 'Money', ids: ['buy', 'sell', 'coins', 'cash', 'gooddeal', 'baddeal'] },
    {
      title: 'Services',
      ids: [
        'market',
        'warehouse',
        'pickup',
        'advert',
        'crew',
        'tax',
        'insure',
        'stock',
        'stock2',
        'money',
        'bank',
        'bank2',
        'loan',
        'zinn',
        'fuel',
        'map',
        'special',
      ],
    },
    { title: 'Explore', ids: ['news', 'weather', 'clock', 'history'] },
    {
      title: 'Travel and events',
      ids: [
        'rocket',
        'arrive',
        'event.good',
        'event.neutral',
        'event.bad',
        'stock.crash',
        'auction',
      ],
    },
    { title: 'Endings', ids: ['win', 'lose', 'bankrupt'] },
  ];

  const all = soundIds();
  const commodities = all.filter((id) => id.startsWith('commodity.'));
  const grouped = new Set([...GROUPS.flatMap((g) => g.ids), ...commodities]);
  /** anything added to the presets but not yet filed above still shows up here */
  const ungrouped = all.filter((id) => !grouped.has(id));
  const sampled = all.filter(hasSample);

  const label = (id: string) =>
    id.startsWith('commodity.')
      ? COMMODITY_BY_ID[id.slice('commodity.'.length) as CommodityId].name
      : id;

  /** `<id>|<source>` of the button that started the sound now playing */
  let active = $state('');
  onMount(() => onPlayingChange(() => playingId() === null && (active = '')));

  /** Click to play; click the same button again to cut it off. Any other sound stops first. */
  function hit(id: string, src: Source) {
    const key = `${id}|${src}`;
    const same = active === key;
    stop();
    active = same ? '' : key;
    if (!same) play(id, 1, src);
  }

  /** Walk a group, waiting for each sound to finish rather than talking over it. */
  let running = $state(false);
  async function playAll(ids: string[]) {
    if (running) {
      // pressing it again is a stop, and it has to take effect now rather than after this sound
      running = false;
      stop();
      active = '';
      return;
    }
    running = true;
    for (const id of ids) {
      if (!running) break;
      hit(id, hasSample(id) ? 'pack' : 'synth');
      // a short synth one-shot may finish before the first check, so cap the wait either way
      for (let waited = 0; waited < 2500 && running && playingId(); waited += 50)
        await new Promise((r) => setTimeout(r, 50));
      if (!running) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    if (running) {
      running = false;
      stop();
      active = '';
    }
  }
</script>

{#snippet chip(id: string)}
  <span class="pair">
    {#if hasSample(id)}
      <button
        class="sfx pack"
        class:on={active === `${id}|pack`}
        title={`play the ${activePack()} pack sample`}
        onclick={() => hit(id, 'pack')}
      >
        {label(id)}
      </button>
      <button
        class="sfx alt"
        class:on={active === `${id}|synth`}
        title="play the built-in synth version"
        onclick={() => hit(id, 'synth')}
      >
        ♪
      </button>
    {:else}
      <button
        class="sfx"
        class:on={active === `${id}|synth`}
        title="synth only — this pack has no sample for it"
        onclick={() => hit(id, 'synth')}
      >
        {label(id)}
      </button>
    {/if}
  </span>
{/snippet}

<div class="st">
  <div class="title">
    Sound Test — {all.length} ids · {sampled.length} in the “{activePack()}” pack, {all.length -
      sampled.length} synth only
  </div>

  <div class="body">
    {#each GROUPS as g (g.title)}
      <section>
        <h3>
          {g.title}
          <button class="all" onclick={() => playAll(g.ids)}>{running ? '■ stop' : '▶ all'}</button>
        </h3>
        <div class="row">
          {#each g.ids as id (id)}{@render chip(id)}{/each}
        </div>
      </section>
    {/each}

    <section>
      <h3>
        Commodities
        <button class="all" onclick={() => playAll(commodities)}
          >{running ? '■ stop' : '▶ all'}</button
        >
      </h3>
      <div class="row">
        {#each commodities as id (id)}{@render chip(id)}{/each}
      </div>
    </section>

    {#if ungrouped.length}
      <section>
        <h3>Not filed yet</h3>
        <div class="row">
          {#each ungrouped as id (id)}{@render chip(id)}{/each}
        </div>
      </section>
    {/if}
  </div>

  <div class="buttons">
    <span class="key">
      <i class="sw pack"></i> pack sample · <i class="sw alt">♪</i> synth · click again to stop
    </span>
    <Btn
      onclick={() => {
        running = false;
        stop();
        active = '';
      }}>Stop</Btn
    >
    <Btn
      onclick={() => {
        running = false;
        stop();
        game.go(game.state ? 'file' : 'title');
      }}>Back</Btn
    >
  </div>
</div>

<style>
  .st {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    box-sizing: border-box;
    color: #000;
  }
  .title {
    background: var(--c-navy);
    color: #fff;
    font: bold 14px var(--font-ui);
    padding: 7px;
    border: 2px solid;
    border-color: #4040ff #000030 #000030 #4040ff;
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    padding: 8px;
  }
  h3 {
    font: bold 12px var(--font-ui);
    margin: 8px 0 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  section:first-child h3 {
    margin-top: 0;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .pair {
    display: inline-flex;
  }
  .sfx,
  .all {
    font: bold 11px var(--font-ui);
    padding: 3px 6px;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    background: var(--c-face);
    color: #000;
    cursor: pointer;
  }
  .sfx.pack {
    background: var(--c-cyan);
    border-right-width: 1px;
  }
  .sfx.alt {
    border-left-width: 1px;
    padding: 3px 4px;
  }
  .sfx.on {
    border-color: #404040 #fff #fff #404040;
    background: var(--c-yellow-plate);
  }
  .buttons {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .key {
    flex: 1;
    font: 11px var(--font-ui);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .sw {
    width: 13px;
    height: 13px;
    background: var(--c-face);
    border: 1px solid #404040;
    display: inline-grid;
    place-items: center;
    font-size: 9px;
    font-style: normal;
  }
  .sw.pack {
    background: var(--c-cyan);
  }
</style>
