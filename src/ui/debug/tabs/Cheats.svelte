<script lang="ts">
  /**
   * The edits that skip the rules.
   *
   * Everything here writes straight into the state, which is the point: getting to week 40 with
   * a full hold and a crashed exchange should take a click, not an afternoon. It is also why
   * the panel brands the game as hand-edited from the first click — and why nothing here is
   * broadcast: in an online room only this browser would move.
   */
  import { untrack } from 'svelte';
  import { currentIndex, type GameState } from '../../../engine';
  import { game, type Screen } from '../../game.svelte';
  import { online } from '../../../net/online.svelte';
  import {
    clearBills,
    clearDebts,
    clearEvent,
    dispatchJson,
    editPath,
    fillTank,
    finishTutorial,
    injectEvent,
    setBankrupt,
    setNumber,
    setTarget,
    setWeek,
  } from '../cheats';
  import { trace } from '../trace.svelte';

  let { s, pickedPath = '' }: { s: GameState; pickedPath?: string } = $props();

  /** kept in sync with App.svelte's screen table — tsc rejects a name that is not a Screen */
  const SCREENS: Screen[] = [
    'title',
    'setup',
    'handoff',
    'report',
    'tutorial',
    'menu',
    'market',
    'supply',
    'warehouse',
    'passengers',
    'advertise',
    'crew',
    'taxes',
    'insurance',
    'explore',
    'stock',
    'money',
    'bank',
    'loan',
    'zinn',
    'fuel',
    'file',
    'shortcuts',
    'soundtest',
    'map',
    'charts',
    'travel',
    'event',
    'arrival',
    'lobby',
    'waiting',
    'gameover',
  ];

  let ci = $state(-1);
  const target = $derived(ci >= 0 ? ci : currentIndex(s));
  const co = $derived(s.companies[target]);

  let amount = $state(1_000_000);
  // seeded from the state once, then owned by the input — they are what you are about to set,
  // not a readout of what the state currently holds
  let week = $state(untrack(() => s.week));
  let goal = $state(untrack(() => s.settings.targetNetWorth));
  let path = $state('');
  let valueJson = $state('');
  let actionJson = $state('{ "type": "continue" }');
  let note = $state('');

  // a path clicked anywhere else in the panel lands in the editor, ready to be written to
  $effect(() => {
    if (pickedPath) path = pickedPath;
  });

  function pirates() {
    injectEvent({
      id: 'debug.pirates',
      title: 'Pirates of the Nectum Belt',
      text: 'A test dialog, injected from the inspector. It resolves like any other event.',
      choices: [
        { id: 'fight', label: 'Fight them off' },
        { id: 'pay', label: 'Pay the ransom' },
      ],
      mood: 'bad',
      context: 'planet',
    });
  }
</script>

<div class="warn pad">
  These edits bypass every rule. The game is branded <b>hand-edited</b> from the first one, and
  nothing is sent to other players{online.active ? ' — this room will desync' : ''}.
</div>

<div class="sec-h">company</div>
<div class="bar">
  <select class="in" bind:value={ci}>
    <option value={-1}>current ({currentIndex(s)})</option>
    {#each s.companies as c, i (c.id)}<option value={i}>{i} {c.name}</option>{/each}
  </select>
  <input class="in" type="number" bind:value={amount} />
</div>
{#if co}
  <div class="bar wrap">
    <button class="tog" onclick={() => setNumber(target, 'cash', amount)}>cash =</button>
    <button class="tog" onclick={() => setNumber(target, 'bank', amount)}>bank =</button>
    <button class="tog" onclick={() => setNumber(target, 'cash', co.cash + amount)}>cash +=</button>
    <button class="tog" onclick={() => clearDebts(target)}>clear debts</button>
    <button class="tog" onclick={() => clearBills(target)}>clear wages/taxes</button>
    <button class="tog" onclick={() => fillTank(target)}>fill tank</button>
    <button class="tog danger" onclick={() => setBankrupt(target, !co.bankrupt)}
      >{co.bankrupt ? 'un-bankrupt' : 'bankrupt'}</button
    >
  </div>
{/if}

<div class="sec-h">game</div>
<div class="bar wrap">
  <input class="in tiny" type="number" min="1" bind:value={week} />
  <button class="tog" onclick={() => setWeek(week)}>set week</button>
  <input class="in" type="number" bind:value={goal} />
  <button class="tog" onclick={() => setTarget(goal)}>set target</button>
  <button class="tog" onclick={finishTutorial}>finish tutorial ladder</button>
</div>

<div class="sec-h">screen</div>
<div class="bar wrap">
  <select class="in" onchange={(e) => game.go(e.currentTarget.value as Screen)}>
    {#each SCREENS as sc (sc)}<option value={sc} selected={sc === game.screen}>{sc}</option>{/each}
  </select>
  <span class="dim">jumps the UI only; the state is untouched</span>
</div>

<div class="sec-h">dialogs</div>
<div class="bar wrap">
  <button class="tog" onclick={pirates}>inject a test event</button>
  <button class="tog" onclick={clearEvent} disabled={!s.pending}>clear pending</button>
</div>

<div class="sec-h">dispatch an action (rules apply)</div>
<textarea class="in area" bind:value={actionJson}></textarea>
<div class="bar">
  <button class="tog" onclick={() => (note = dispatchJson(actionJson) ?? 'accepted')}>send</button>
  <span class="dim">goes through the reducer, and is broadcast online</span>
</div>

<div class="sec-h">write any path</div>
<div class="bar">
  <input class="in" placeholder="companies[0].cash" bind:value={path} />
  <input class="in" placeholder="12345" bind:value={valueJson} />
  <button
    class="tog danger"
    disabled={!path.trim() || !valueJson.trim()}
    onclick={() => (note = editPath(path, valueJson) ?? 'written')}>set</button
  >
</div>

{#if note}<div class="pad" class:bad={note !== 'written' && note !== 'accepted'}>{note}</div>{/if}
{#if trace.handEdited}
  <div class="warn pad">This game has been hand-edited — do not file its behaviour as a bug.</div>
{/if}
