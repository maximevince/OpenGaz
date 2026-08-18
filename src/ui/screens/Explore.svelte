<script lang="ts">
  import { PLANET_BY_ID, seedFromString } from '../../engine';
  import Btn from '../components/Btn.svelte';
  import Portrait from '../components/Portrait.svelte';
  import { game } from '../game.svelte';
  const s = $derived(game.s);
  const co = $derived(game.co);
  const p = $derived(game.planet);
  const def = $derived(PLANET_BY_ID[p.id]);
  type Tab = 'special' | 'weather' | 'news' | 'time' | 'history';
  let tab = $state<Tab>('special');
  const news = $derived(
    s.log
      .filter((l) => l.company === -1)
      .slice(-8)
      .reverse(),
  );
  const specialUsed = $derived(co.mods.specialWeek === s.week);
  const SPECIAL_BLURB: Record<string, string> = {
    magistrate:
      'Petition the Imperial Magistrate for lower tariffs or taxes. Rarely granted; occasionally backfires.',
    zinn: 'Pay Mr. Zinn a visit and ask a favour: a lower rate, a bigger limit, or a piece of your debt forgiven. He is fickle.',
    union:
      "Lobby the Trader's Union: loan rate, bank rate, credit limit or debt relief. Committees may be formed.",
    insurance: "Ask Voyager's Insurance to review your premiums. Could go either way.",
    broker: 'Buy a stock broker a drink and hear which exchanges are bullish or bearish.',
    media: 'Stage a publicity stunt for Channel 7. Sponsors may pay; the cleanup may cost.',
    mechanic: 'Your mechanic on Xeen sells permanent upgrades: cargo, seats, fuel or a turbo.',
    engines: 'L-Tech sells engines. One more kuarp means arriving first, more often.',
    fuel: 'Zobrok the fuel wholesaler hands out discounts to people he likes.',
    shoreleave:
      'Give the crew shore leave on Loro. Wages forgiven, salaries cut — or bail to post.',
    blessing: 'Ask the Grand Sages for a blessing on your voyage. Do not ask twice.',
    fortune: 'A soothsayer reads your aura and tells you how lucky you are right now.',
    casino: 'A straight 50/50 wager of 5 % of your cash, with a double-or-nothing on top.',
    smuggler: 'Lady Cornucopia offers a commodity at or below market price. No paperwork.',
  };
  // deterministic weather text per planet & week
  const weather = $derived.by(() => {
    const h = seedFromString(`${p.id}-${s.week}`);
    const meteors = ['minimal', 'light', 'moderate', 'heavy'][h % 4];
    const solar = ['quiet', 'restless', 'stormy'][(h >> 3) % 3];
    const pirates = [
      'no reports',
      'rumours of Bro Nap sightings',
      'Baid-Rowel bandits active on the outer routes',
    ][(h >> 6) % 3];
    return `Meteor activity: ${meteors}. Solar weather: ${solar}. Pirates: ${pirates}. Your luck reads ${co.luck >= 0.6 ? 'favourable' : co.luck <= 0.35 ? 'poor — insure the trip' : 'average'}.`;
  });
  const portraitId = $derived(
    tab === 'news'
      ? 'news'
      : tab === 'weather'
        ? 'weather'
        : tab === 'time'
          ? 'clock'
          : tab === 'history'
            ? 'history'
            : def.special,
  );
</script>

<div class="ex">
  <div class="left">
    <Portrait id={portraitId} caption={def.name} width={210} height={300} />
  </div>
  <div class="right">
    <div class="title">{def.name} — {def.tagline}</div>
    <div class="body">
      {#if tab === 'special'}
        <h3>Planet Special</h3>
        <p>{SPECIAL_BLURB[def.special]}</p>
        {#if specialUsed}<p class="dim">You have already used the special this week.</p>{/if}
        <Btn color="green" disabled={specialUsed} onclick={() => game.dispatch({ type: 'special' })}
          >Visit the special</Btn
        >
      {:else if tab === 'news'}
        <h3>Channel 7 Kuku News</h3>
        {#if news.length === 0}<p>Nothing to report. Slow news week in the colonies.</p>{/if}
        {#each news as n, i (i)}<p>• wk {n.week}: {n.text}</p>{/each}
      {:else if tab === 'weather'}
        <h3>Weather Bureau — week {s.week}</h3>
        <p>{weather}</p>
        <p class="dim">
          Forecasts are indicative. The Bureau accepts no liability for hurricanes, whales or Bobble
          Warps.
        </p>
      {:else if tab === 'time'}
        <h3>Ministry of Time</h3>
        <p>
          It is week {s.week} of the year 139 A.B. (After Bass). One turn is one kuku week; every journey
          takes about a week regardless of distance, but faster ships arrive first and trade first. Interest,
          wages and taxes accrue each week you travel.
        </p>
      {:else}
        <h3>History of {def.name}</h3>
        <p>{def.lore}</p>
      {/if}
    </div>
  </div>
  <div class="buttons">
    <Btn color="blue" onclick={() => game.go('menu')}>Continue</Btn>
    <Btn color="blue" onclick={() => (tab = 'special')}>Planet Special</Btn>
    <Btn color="blue" onclick={() => (tab = 'weather')}>Weather Bureau</Btn>
    <Btn color="blue" onclick={() => (tab = 'news')}>News Center</Btn>
    <Btn color="blue" onclick={() => (tab = 'time')}>Ministry of Time</Btn>
    <Btn color="blue" onclick={() => (tab = 'history')}>History</Btn>
    <Btn color="blue" onclick={() => game.help('explore')}>Help</Btn>
  </div>
</div>

<style>
  .ex {
    position: absolute;
    inset: 0;
    background: var(--c-navy);
    display: grid;
    grid-template-columns: 230px 1fr;
    grid-template-rows: 1fr 60px;
    gap: 10px;
    padding: 10px;
    box-sizing: border-box;
    color: #fff;
  }
  .title {
    background: var(--c-yellow-plate);
    color: #000;
    font: bold 14px var(--font-ui);
    padding: 8px;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
  }
  .body {
    margin-top: 10px;
    background: #fff;
    color: #000;
    padding: 10px;
    height: 250px;
    overflow: auto;
    font: 13px/1.4 var(--font-ui);
    border: 2px inset #808080;
  }
  h3 {
    margin: 0 0 6px;
  }
  .dim {
    color: #606060;
    font-style: italic;
  }
  .buttons {
    grid-column: 1 / -1;
    display: flex;
    gap: 6px;
  }
  .buttons :global(.btn) {
    flex: 1;
    white-space: normal;
    font-size: 12px;
  }
</style>
