<script lang="ts">
  /**
   * One fact, one card, an OK to move on — the way the original dealt out what happened while
   * you were in the air. A card about a rival carries that company's portrait and its theme;
   * everything else is a headline and a line of text over the planet you have landed on.
   */
  import { PLANET_BY_ID } from '../../engine';
  import { img } from '../assets';
  import Btn from '../components/Btn.svelte';
  import Portrait from '../components/Portrait.svelte';
  import { game } from '../game.svelte';

  const s = $derived(game.s);
  const p = $derived(game.planet);
  const large = $derived(img(`planet.${p.id}.large`));
  const card = $derived(game.card);
  const rival = $derived(game.cardRival);
  const count = $derived(game.cards.length);
  /** most cards title themselves; the rest borrow the name of the sequence they belong to */
  const fallback = $derived(
    game.cardSource === 'news' ? 'Kuku News' : s.awaitingHandoff ? 'Flight Report' : 'Dispatch',
  );
  const heading = $derived(card?.header ?? fallback);
  const last = $derived(game.cardIndex + 1 >= count);
</script>

<div class="dispatch" style:background-image={large ? `url(${large})` : undefined}>
  <div class="head">
    <span class="where">{PLANET_BY_ID[p.id].name} — week {s.week}</span>
    {#if count > 1}<span class="of">{game.cardIndex + 1} of {count}</span>{/if}
  </div>

  <div class="card {card?.kind ?? 'info'}">
    <h2>{heading}</h2>
    <div class="body" class:with-face={!!rival}>
      {#if rival}
        <Portrait id={`op${rival.aiIndex}`} caption={rival.name} width={150} height={200} />
      {/if}
      <p>{card?.text ?? ''}</p>
    </div>
  </div>

  <div class="buttons">
    <Btn color="black" onclick={() => game.nextCard()}>{last ? 'Continue' : 'OK'}</Btn>
  </div>
</div>

<style>
  .dispatch {
    position: absolute;
    inset: 0;
    background: #000 center / cover no-repeat;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    box-sizing: border-box;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    color: #fff;
    font: bold 13px var(--font-ui);
    text-shadow: 1px 1px 0 #000;
    /* clear of the dev inspector's badge, which sits in the top-right corner */
    padding-right: 26px;
  }
  .where {
    color: var(--c-yellow-plate);
  }
  .of {
    color: #c0c0e0;
  }
  .card {
    margin: auto 0;
    background: rgba(0, 0, 40, 0.88);
    border: 2px solid #8080ff;
    border-left-width: 6px;
    padding: 12px 14px;
    color: #fff;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
    overflow: auto;
  }
  .good {
    border-left-color: #00c000;
  }
  .bad {
    border-left-color: #ff4040;
  }
  .warn {
    border-left-color: #ffc000;
  }
  .news {
    border-left-color: var(--c-cyan);
  }
  h2 {
    margin: 0;
    font: bold 19px var(--font-ui);
    color: var(--c-yellow-plate);
  }
  .body {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }
  .body.with-face p {
    padding-top: 4px;
  }
  p {
    margin: 0;
    font: 15px/1.45 var(--font-ui);
  }
  .buttons :global(.btn) {
    width: 100%;
    font-size: 16px;
    padding: 8px;
  }
</style>
