<script lang="ts">
  import { activePack, img } from '../assets';
  import { BUILD } from '../build';
  import Btn from '../components/Btn.svelte';
  import SoundToggle from '../components/SoundToggle.svelte';
  import { game } from '../game.svelte';
  const bg = img('screen.title');
  const pack = activePack();
  const hasAuto = $derived(game.hasAutosave());
</script>

<div class="title" style:background-image={bg ? `url(${bg})` : undefined}>
  {#if !bg}
    <div class="stars"></div>
  {/if}
  <div class="title-lockup" aria-label="OpenGaz Deluxe">
    <h1>Open<span>Gaz</span></h1>
    <div class="deluxe">DELUXE</div>
    <p class="sub">an open-source space-trading game</p>
  </div>
  <div class="menu">
    <Btn onclick={() => game.go('setup')}>New Game</Btn>
    <Btn disabled={!hasAuto} onclick={() => game.loadAutosave()}>Continue last game</Btn>
    <Btn onclick={() => game.go('lobby')}>Play online</Btn>
    <Btn
      onclick={() => {
        game.state = game.state;
        game.go('file');
      }}
      disabled={!game.state}>File Options</Btn
    >
    {#if import.meta.env.DEV}
      <Btn onclick={() => game.go('soundtest')}>Sound test</Btn>
    {/if}
  </div>
  <div class="pack"><SoundToggle /> OpenGaz {BUILD} · asset pack: {pack}</div>
</div>

<style>
  .title {
    position: absolute;
    inset: 0;
    background: #000 center / cover no-repeat;
    color: #fff;
    text-align: center;
  }
  .stars {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(1px 1px at 20% 30%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 70% 60%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 40% 80%, #ddd 50%, transparent 51%),
      radial-gradient(1px 1px at 85% 15%, #ddd 50%, transparent 51%),
      radial-gradient(1px 1px at 55% 40%, #aaa 50%, transparent 51%),
      radial-gradient(1px 1px at 10% 70%, #aaa 50%, transparent 51%);
    background-size: 160px 120px;
  }
  .title-lockup {
    position: relative;
    z-index: 1;
    margin: 28px auto 0;
    width: max-content;
    min-width: 360px;
    padding: 4px 22px 8px;
    border-radius: 8px;
    background: linear-gradient(90deg, transparent, #02040dbb 18%, #02040dbb 82%, transparent);
  }
  h1 {
    margin: 0;
    font:
      900 62px/0.85 Impact,
      Haettenschweiler,
      'Arial Narrow Bold',
      sans-serif;
    font-style: italic;
    letter-spacing: 3px;
    color: #f5fbff;
    text-shadow:
      3px 3px 0 #152251,
      -1px -1px 0 #9cecff,
      0 0 12px #4da6ff;
  }
  h1 span {
    color: #ffd45c;
    text-shadow:
      3px 3px 0 #6b3514,
      -1px -1px 0 #fff1a6,
      0 0 12px #ff9d31;
  }
  .deluxe {
    margin-top: 3px;
    font:
      700 19px/1 Arial,
      sans-serif;
    letter-spacing: 10px;
    color: #94e9ff;
    text-indent: 10px;
    text-shadow: 0 0 8px #409dff;
  }
  .sub {
    position: relative;
    margin: 5px 0 0;
    font-size: 12px;
    letter-spacing: 1px;
    color: #c6dbff;
  }
  .menu {
    position: absolute;
    left: 50%;
    bottom: 40px;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 240px;
  }
  .menu :global(.btn) {
    font-size: 15px;
    padding: 7px;
  }
  .pack {
    position: absolute;
    right: 6px;
    bottom: 4px;
    font-size: 10px;
    color: #888;
  }
</style>
