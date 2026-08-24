<script lang="ts">
  import { onMount } from 'svelte';
  import { audioMode, cycleAudioMode, onAudioModeChange, type AudioMode } from '../audio';
  import { unlockMusic } from '../music';

  let mode = $state<AudioMode>(audioMode());
  onMount(() => onAudioModeChange(() => (mode = audioMode())));

  const ICON: Record<AudioMode, string> = {
    all: '\u{1F3B5}',
    effects: '\u{1F50A}',
    off: '\u{1F507}',
  };
  const LABEL: Record<AudioMode, string> = {
    all: 'Music and effects \u2014 click for effects only',
    effects: 'Effects only \u2014 click to silence',
    off: 'Sound off \u2014 click for music and effects',
  };
</script>

<button
  class="snd"
  onclick={() => {
    cycleAudioMode();
    unlockMusic();
  }}
  title={LABEL[mode]}
  aria-label="toggle sound">{ICON[mode]}</button
>

<style>
  .snd {
    font: 14px/1 var(--font-ui);
    padding: 2px 5px;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    background: var(--c-face);
    cursor: pointer;
  }
</style>
