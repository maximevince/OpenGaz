<script lang="ts">
  /**
   * The random stream, looked at without disturbing it.
   *
   * `next()` is pure — state in, state out — so the panel can walk forward from the current
   * seed and show what the next few rolls *would* be. That turns "why did it pick that?" into
   * something you can read off before taking the turn, and re-seeding makes an awkward roll
   * reproducible.
   */
  import { next, type GameState } from '../../../engine';
  import { setRng } from '../cheats';

  let { s }: { s: GameState } = $props();

  let count = $state(12);
  let seed = $state('');

  /** the next `count` draws from the current state, left exactly where they were found */
  const peek = $derived.by(() => {
    const out: { i: number; state: number; f: number; d100: number }[] = [];
    let st = s.rng;
    for (let i = 0; i < count; i++) {
      const [nextState, f] = next(st);
      st = nextState;
      out.push({ i, state: nextState, f, d100: 1 + Math.floor(f * 100) });
    }
    return out;
  });
</script>

<table class="dbg-t">
  <tbody>
    <tr><td class="k">rng state</td><td>{s.rng}</td></tr>
    <tr><td class="k">week</td><td>{s.week}</td></tr>
  </tbody>
</table>

<div class="bar">
  <input class="in" placeholder="seed word or number" bind:value={seed} />
  <button class="tog" onclick={() => setRng(seed)} disabled={!seed.trim()}>re-seed</button>
</div>

<div class="sec-h">
  next draws
  <input class="in tiny" type="number" min="1" max="60" bind:value={count} />
</div>
<table class="dbg-t grid tight">
  <thead>
    <tr><th>n</th><th class="num">float</th><th class="num">1–100</th><th class="num">state</th></tr
    >
  </thead>
  <tbody>
    {#each peek as p (p.i)}
      <tr
        ><td>{p.i + 1}</td><td class="num">{p.f.toFixed(6)}</td><td class="num">{p.d100}</td><td
          class="num dim">{p.state}</td
        ></tr
      >
    {/each}
  </tbody>
</table>
<div class="dim pad">
  Looking is free: the state above is untouched until the game itself draws.
</div>
