<script lang="ts">
  import { FINAL_STAGE, lessonFor } from '../../engine';
  import Btn from '../components/Btn.svelte';
  import { game } from '../game.svelte';

  /** the stage from which the player, not the calendar, decides when the next feature lands */
  const SELF_PACED = 7;

  const s = $derived(game.s);
  const stage = $derived(s.tutorStage);
  const lesson = $derived(lessonFor(stage));
  const pct = $derived(Math.floor((100 * stage) / FINAL_STAGE));
  const solo = $derived(s.companies.filter((c) => !c.isAI && !c.bankrupt).length === 1);
  /** this lesson has been read before — the player is between features, not learning one */
  const recap = $derived(s.tutorTaught >= stage);
  /**
   * The offer to take the next feature appears once the schedule has run out. It is held back
   * on the very screen that introduces the last scheduled feature, so that screen is about
   * fuel rather than about the button.
   */
  const canAdvance = $derived(solo && stage >= SELF_PACED && stage < FINAL_STAGE && recap);
  const done = $derived(stage >= FINAL_STAGE);
</script>

<div class="tut">
  <div class="title">{recap && !done ? `Week ${s.week}` : lesson.title}</div>

  <div class="body">
    {#if recap && !done}
      <p>
        You have <b>{FINAL_STAGE - stage}</b>
        {FINAL_STAGE - stage === 1 ? 'feature' : 'features'} still to come.
        {#if canAdvance}
          Take the next one whenever you feel ready for it — there is no hurry, and nothing is lost
          by trading for a few more weeks first.
        {:else}
          The next one arrives at the end of this week.
        {/if}
      </p>
      <hr />
      <p class="dim">Last lesson — {lesson.title}</p>
      {#each lesson.text.split('\n\n') as para, i (i)}
        <p class="dim">{para}</p>
      {/each}
    {:else}
      {#each lesson.text.split('\n\n') as para, i (i)}
        <p>{para}</p>
      {/each}
    {/if}
  </div>

  <div class="progress">
    <div class="track">
      <div class="fill" style:width={`${pct}%`}></div>
      <span class="pl">Tutorial completed: {pct}%</span>
    </div>
    <span class="stage">stage {stage} of {FINAL_STAGE}</span>
  </div>

  <div class="buttons">
    <Btn color="green" onclick={() => game.dispatch({ type: 'tutorialContinue' })}>
      {done ? 'Start playing' : 'Continue'}
    </Btn>
    {#if canAdvance}
      <Btn color="blue" onclick={() => game.dispatch({ type: 'tutorialAdvance' })}
        >Add New Feature</Btn
      >
    {/if}
  </div>
  {#if !solo && stage >= 7 && !done}
    <div class="foot">A new feature arrives every week while more than one of you is playing.</div>
  {/if}
</div>

<style>
  .tut {
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
    font:
      bold 22px/1.2 Georgia,
      serif;
    text-align: center;
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
    box-shadow: 2px 2px 0 #000;
    padding: 12px 16px;
    font: 14px/1.5 var(--font-ui);
  }
  .body p {
    margin: 0 0 10px;
  }
  .body p:last-child {
    margin-bottom: 0;
  }
  .body .dim {
    color: #404040;
    font-size: 12px;
  }
  .body hr {
    border: none;
    border-top: 1px solid #808080;
    margin: 10px 0;
  }
  .progress {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .track {
    position: relative;
    flex: 1;
    height: 22px;
    background: #fff;
    border: 2px solid;
    border-color: #404040 #fff #fff #404040;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--c-green-grid);
    transition: width 0.3s;
  }
  .pl {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font: bold 11px var(--font-ui);
  }
  .stage {
    font: bold 11px var(--font-ui);
  }
  .buttons {
    display: flex;
    gap: 8px;
  }
  .buttons :global(.btn) {
    flex: 1;
    font-size: 15px;
    padding: 7px;
  }
  .foot {
    font: 11px var(--font-ui);
    text-align: center;
  }
</style>
