<script lang="ts">
  import {
    DELUXE_INITIAL_WINNING_POINT,
    LEVELS,
    OPPONENTS,
    PLANETS,
    Rng,
    SHIPS,
    randomCompanyName,
    type Level,
    type PlanetId,
  } from '../../engine';
  import { img } from '../assets';
  import Btn from '../components/Btn.svelte';
  import { game } from '../game.svelte';
  import { play } from '../sound';

  let level: Level = $state('novice');
  let opponents: string[] = $state(OPPONENTS.slice(0, 5).map((o) => o.id));
  const ai = $derived(opponents.length);
  // placeholder names only: one throwaway Rng for the whole screen, never the game seed
  const nameRng = new Rng((Math.random() * 0x1_0000_0000) >>> 0);
  let humans: { name: string; ship: number }[] = $state([
    { name: randomCompanyName(nameRng), ship: 1 },
  ]);
  let planets: PlanetId[] = $state(randomPlanets());
  let seed = $state(String(Date.now() % 1000000));
  let shipPick: number | null = $state(null);

  function randomPlanets(): PlanetId[] {
    const ids = PLANETS.map((p) => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    }
    return ids.slice(0, 7);
  }
  function reroll(i: number) {
    play('ping');
    humans[i]!.name = randomCompanyName(nameRng, {
      taken: humans.filter((_, j) => j !== i).map((h) => h.name),
    });
  }
  function toggle(id: PlanetId) {
    play('ping');
    if (planets.includes(id)) planets = planets.filter((p) => p !== id);
    else if (planets.length < 7) planets = [...planets, id];
  }
  function toggleOpponent(id: string) {
    play('ping');
    opponents = opponents.includes(id) ? opponents.filter((x) => x !== id) : [...opponents, id];
  }
  const canStart = $derived(
    planets.length === 7 && humans.every((h) => h.name.trim()) && humans.length + ai >= 2,
  );
  const selectedShip = $derived(shipPick === null ? undefined : humans[shipPick]?.ship);
  const selectedShipDef = $derived(SHIPS.find((s) => s.id === selectedShip));
  const selectedShipPicture = $derived(
    selectedShip === undefined ? undefined : img(`ship.${selectedShip}.picture`),
  );
  function start() {
    game.start({
      seed,
      level,
      planets,
      humans: humans.map((h) => ({ name: h.name.trim(), ship: h.ship })),
      ai,
      opponents,
    });
  }
</script>

<div class="setup">
  <div class="title">New Game</div>
  <div class="grid">
    <section>
      <h3>Human players ({humans.length})</h3>
      {#each humans as h, i (i)}
        <div class="row">
          <input class="name" bind:value={h.name} placeholder="Company name" maxlength="24" />
          <button class="dice" title="Random company name" onclick={() => reroll(i)}
            >&#127922;</button
          >
          <button
            class="ship"
            onclick={() => {
              play('select');
              shipPick = i;
            }}>{SHIPS.find((s) => s.id === h.ship)?.name}</button
          >
          <Btn
            disabled={humans.length <= 1}
            onclick={() => (humans = humans.filter((_, j) => j !== i))}>−</Btn
          >
        </div>
      {/each}
      <Btn
        disabled={humans.length + ai >= 7 || humans.length >= 6}
        onclick={() =>
          (humans = [
            ...humans,
            {
              name: randomCompanyName(nameRng, { taken: humans.map((h) => h.name) }),
              ship: 1 + (humans.length % 12),
            },
          ])}>+ add human</Btn
      >
      <h3>Computer opponents ({ai})</h3>
      <div class="opps">
        {#each OPPONENTS as o, i (o.id)}
          {@const on = opponents.includes(o.id)}
          <button
            class="opp"
            class:on
            title={o.blurb}
            disabled={!on && humans.length + ai >= 7}
            onclick={() => toggleOpponent(o.id)}
          >
            <img src={img(`portrait.op${i + 1}`)} alt="" />
            <span>{o.name}</span>
          </button>
        {/each}
      </div>
      <label class="line"
        >Level:
        <select bind:value={level}
          >{#each LEVELS as l (l.id)}<option value={l.id}
              >{l.name} — goal {(DELUXE_INITIAL_WINNING_POINT / 1e6).toFixed(1)}M</option
            >{/each}</select
        >
      </label>
      <label class="line">Seed: <input class="seed" bind:value={seed} /></label>
    </section>
    <section>
      <h3>
        Planets ({planets.length}/7) <Btn onclick={() => (planets = randomPlanets())}>Randomize</Btn
        >
      </h3>
      <div class="planets">
        {#each PLANETS as p (p.id)}
          {@const icon = img(`planet.${p.id}.icon`)}
          <button
            class="pl"
            class:on={planets.includes(p.id)}
            onclick={() => toggle(p.id)}
            title={p.tagline}
          >
            {#if icon}<img src={icon} alt="" />{/if}
            {p.name}
          </button>
        {/each}
      </div>
    </section>
  </div>
  <div class="buttons">
    <Btn onclick={() => game.go('title')}>Back</Btn>
    <Btn color="green" disabled={!canStart} onclick={start}>Start the game</Btn>
  </div>

  {#if shipPick !== null}
    <div class="backdrop" role="presentation">
      <div class="dlg">
        <div class="dlg-title">Choose a ship for {humans[shipPick]!.name}</div>
        {#if selectedShipDef}
          <div class="dealer-preview">
            {#if selectedShipPicture}<img
                src={selectedShipPicture}
                alt={selectedShipDef.name}
              />{/if}
            <div>
              <b>{selectedShipDef.name}</b>
              <span
                >{selectedShipDef.cargo}t cargo · {selectedShipDef.seats} passengers · {selectedShipDef.fuel}t
                fuel · {selectedShipDef.kuarps} kuarps</span
              >
            </div>
          </div>
        {/if}
        <div class="ships">
          {#each SHIPS as sdef (sdef.id)}
            {@const pic = img(`ship.${sdef.id}.icon`)}
            <button
              class="sh"
              class:on={humans[shipPick!]!.ship === sdef.id}
              onclick={() => {
                play('select');
                humans[shipPick!]!.ship = sdef.id;
              }}
            >
              {#if pic}<img src={pic} alt="" />{/if}
              <b>{sdef.name}</b>
              <span
                >{sdef.cargo}t · {sdef.seats} pax · {sdef.fuel}t fuel · {sdef.kuarps} kuarps · crew {sdef.crew}</span
              >
            </button>
          {/each}
        </div>
        <div class="ship-actions">
          <Btn onclick={() => (shipPick = null)}>Cancel</Btn>
          <Btn color="green" onclick={() => (shipPick = null)}>Choose {selectedShipDef?.name}</Btn>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .setup {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    box-sizing: border-box;
    color: #000;
    font: 13px var(--font-ui);
  }
  .title {
    background: var(--c-navy);
    color: #fff;
    font: bold 15px var(--font-ui);
    text-align: center;
    padding: 5px;
  }
  .grid {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    min-height: 0;
  }
  section {
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: auto;
  }
  h3 {
    margin: 0;
    font-size: 13px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 4px;
  }
  .dice {
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    padding: 2px 6px;
  }
  input,
  select {
    font: 13px var(--font-ui);
    padding: 3px 4px;
    border: 2px inset #808080;
    background: #fff;
    color: #000;
  }
  .seed {
    width: 100px;
  }
  .ship {
    color: #000;
    font: bold 11px var(--font-ui);
    background: var(--c-cyan-plate);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    cursor: pointer;
    padding: 2px 6px;
  }
  .line {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .planets {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
  }
  .pl {
    color: #000;
    display: flex;
    align-items: center;
    gap: 6px;
    font: bold 12px var(--font-ui);
    background: #fff;
    border: 2px solid #808080;
    cursor: pointer;
    padding: 2px 6px;
    text-align: left;
  }
  .pl img {
    width: 22px;
    height: auto;
    max-height: 22px;
    object-fit: contain;
    flex: 0 0 22px;
  }
  .pl.on {
    background: var(--c-yellow-plate);
    border-color: #000;
  }
  .opps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }
  .opp {
    color: #000;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    font: bold 10px var(--font-ui);
    background: #fff;
    border: 2px solid #808080;
    cursor: pointer;
    padding: 2px;
    opacity: 0.85;
  }
  .opp img {
    width: 64px;
    height: 40px;
    object-fit: cover;
  }
  .opp.on {
    background: var(--c-yellow-plate);
    border-color: #000;
    opacity: 1;
  }
  .opp:disabled {
    cursor: default;
    opacity: 0.35;
  }
  .buttons {
    display: flex;
    gap: 6px;
  }
  .buttons :global(.btn) {
    flex: 1;
    font-size: 15px;
    padding: 6px;
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    /* flex, not grid: a percentage max-height on a grid item resolves against the
       auto-sized row (i.e. against its own content) and is silently ignored */
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    box-sizing: border-box;
  }
  .dlg {
    width: 600px;
    /* never taller than the stage: the ship grid scrolls instead of pushing the
       action row off the bottom */
    max-height: 100%;
    box-sizing: border-box;
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 3px 3px 0 #000;
    padding: 0 8px 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .dlg-title {
    flex: none;
    background: var(--c-navy);
    color: #fff;
    font: bold 13px var(--font-ui);
    padding: 4px 8px;
    margin: 0 -8px;
  }
  .ships {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    overflow: auto;
    min-height: 0;
  }
  .sh {
    color: #000;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    background: #fff;
    border: 2px solid #808080;
    cursor: pointer;
    font: 10px var(--font-ui);
    padding: 4px;
  }
  .sh img {
    height: 40px;
  }
  .sh.on {
    background: var(--c-yellow-plate);
    border-color: #000;
  }
  .dealer-preview {
    height: 100px;
    flex: none;
    display: grid;
    grid-template-columns: 170px 1fr;
    align-items: center;
    gap: 10px;
    background: #000;
    color: #fff;
    padding: 4px;
  }
  .dealer-preview img {
    width: 160px;
    height: 92px;
    object-fit: contain;
  }
  .dealer-preview div {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .dealer-preview b {
    color: var(--c-yellow-plate);
    font-size: 15px;
  }
  .dealer-preview span {
    font-size: 11px;
  }
  .ship-actions {
    flex: none;
    display: flex;
    gap: 6px;
  }
  .ship-actions :global(.btn) {
    flex: 1;
  }
</style>
