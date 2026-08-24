<script lang="ts">
  import Btn from '../components/Btn.svelte';
  import { game } from '../game.svelte';

  /** The three cues that are other people's performances. Their licence obliges this credit. */
  const performances = [
    {
      work: 'J. S. Bach — Brandenburg Concerto No. 3, BWV 1048',
      by: 'Advent Chamber Orchestra, December 2006',
    },
    {
      work: 'Maurice Ravel — Miroirs: Une barque sur l’océan',
      by: 'Thérèse Dussaut, piano — Salle Pleyel, Paris, March 1975',
    },
    { work: 'Franz Liszt — Totentanz, S. 126', by: 'Neal O’Doan, piano' },
  ];
</script>

<div class="cr">
  <div class="title">Credits</div>

  <div class="body">
    <h3>Music</h3>
    <p>
      The fourteen planet themes and three of the six rival themes are original OpenGaz
      compositions, rendered with the FluidR3_GM soundfont (MIT). Released under CC BY-SA 4.0.
    </p>
    <p>
      The other three rival themes are recordings of public-domain works, from the Pandora Music
      collection at ibiblio under the EFF Open Audio License, excerpted and level-matched by us:
    </p>
    <ul>
      {#each performances as p (p.work)}
        <li><b>{p.work}</b><br />{p.by}</li>
      {/each}
    </ul>

    <h3>Artwork and sound effects</h3>
    <p>
      Original OpenGaz artwork, CC BY-SA 4.0. Effects are synthesised at runtime with ZzFX (MIT);
      the presets are ours, GPL-3.0-or-later.
    </p>

    <h3>The game</h3>
    <p>
      OpenGaz is a clean-room reimplementation under GPL-3.0-or-later. It contains no material from
      the game that inspired it.
    </p>
  </div>

  <div class="buttons">
    <Btn onclick={() => game.go('file')}>Back to File Options</Btn>
  </div>
</div>

<style>
  .cr {
    position: absolute;
    inset: 0;
    background: var(--c-periwinkle);
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 5px;
    box-sizing: border-box;
    color: #000;
  }
  .title {
    font: bold 16px/1 var(--font-ui);
    padding: 3px 4px;
  }
  .body {
    flex: 1;
    overflow-y: auto;
    background: var(--c-face);
    border: 2px solid;
    border-color: #404040 #fff #fff #404040;
    padding: 6px 10px;
    font: 12px/1.45 var(--font-ui);
  }
  h3 {
    margin: 9px 0 2px;
    font-size: 13px;
  }
  h3:first-child {
    margin-top: 0;
  }
  p {
    margin: 0 0 6px;
  }
  ul {
    margin: 0 0 6px;
    padding-left: 18px;
  }
  li {
    margin-bottom: 4px;
  }
  .buttons {
    display: flex;
    gap: 5px;
  }
</style>
