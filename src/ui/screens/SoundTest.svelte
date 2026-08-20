<script lang="ts">
  /**
   * Dev-only bench for the sound set: every id the game can play, what it sounds like, and
   * whether it is coming from a pack sample or the built-in synth. The buttons that reach it —
   * on the title screen and in File Options — only appear under `pnpm dev`.
   */
  import { COMMODITY_BY_ID, type CommodityId } from '../../engine';
  import Btn from '../components/Btn.svelte';
  import { game } from '../game.svelte';
  import { hasSample, play, soundIds } from '../sound';

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

  const label = (id: string) =>
    id.startsWith('commodity.')
      ? COMMODITY_BY_ID[id.slice('commodity.'.length) as CommodityId].name
      : id;

  let last = $state('');
  function hit(id: string) {
    last = id;
    play(id);
  }
  async function playAll(ids: string[]) {
    for (const id of ids) {
      hit(id);
      await new Promise((r) => setTimeout(r, 450));
    }
  }
</script>

<div class="st">
  <div class="title">
    Sound Test — {all.length} ids · {all.filter(hasSample).length} from samples, {all.filter(
      (i) => !hasSample(i),
    ).length} synthesised
  </div>

  <div class="body">
    {#each GROUPS as g (g.title)}
      <section>
        <h3>{g.title} <button class="all" onclick={() => playAll(g.ids)}>▶ all</button></h3>
        <div class="row">
          {#each g.ids as id (id)}
            <button
              class="sfx"
              class:on={last === id}
              class:sample={hasSample(id)}
              onclick={() => hit(id)}
            >
              {label(id)}
            </button>
          {/each}
        </div>
      </section>
    {/each}

    <section>
      <h3>
        Commodities <button class="all" onclick={() => playAll(commodities)}>▶ all</button>
      </h3>
      <div class="row">
        {#each commodities as id (id)}
          <button
            class="sfx"
            class:on={last === id}
            class:sample={hasSample(id)}
            onclick={() => hit(id)}
          >
            {label(id)}
          </button>
        {/each}
      </div>
    </section>

    {#if ungrouped.length}
      <section>
        <h3>Not filed yet</h3>
        <div class="row">
          {#each ungrouped as id (id)}
            <button class="sfx" class:on={last === id} onclick={() => hit(id)}>{id}</button>
          {/each}
        </div>
      </section>
    {/if}
  </div>

  <div class="buttons">
    <span class="key"><i class="sw sample"></i> pack sample <i class="sw"></i> synth</span>
    <Btn onclick={() => game.go(game.state ? 'file' : 'title')}>Back</Btn>
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
  .sfx.sample {
    background: var(--c-cyan);
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
    font: 11px var(--font-ui);
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .sw {
    width: 11px;
    height: 11px;
    background: var(--c-face);
    border: 1px solid #404040;
    display: inline-block;
  }
  .sw.sample {
    background: var(--c-cyan);
  }
</style>
