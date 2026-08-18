<script lang="ts">
  import { onMount } from 'svelte';
  import { isMuted, onMuteChange, toggleMuted } from '../sound';
  let muted = $state(isMuted());
  onMount(() => onMuteChange(() => (muted = isMuted())));
</script>

<button
  class="snd"
  onclick={toggleMuted}
  title={muted ? 'Sound off — click to unmute' : 'Sound on — click to mute'}
  aria-label="toggle sound">{muted ? '🔇' : '🔊'}</button
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
