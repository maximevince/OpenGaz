<script lang="ts">
  import { activePack, img } from '../assets';
  import { BUILD } from '../build';
  import Btn from '../components/Btn.svelte';
  import { game } from '../game.svelte';
  const bg = img('screen.title');
  const pack = activePack();
  const hasAuto = $derived(game.hasAutosave());
</script>

<div class="title" style:background-image={bg ? `url(${bg})` : undefined}>
  {#if !bg}
    <div class="stars"></div>
    <h1>OpenGaz</h1>
    <p class="sub">an open-source homage to Gazillionaire Deluxe</p>
  {/if}
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
  </div>
  <div class="pack">OpenGaz {BUILD} · asset pack: {pack}</div>
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
  h1 {
    position: relative;
    margin: 90px 0 0;
    font:
      bold 64px/1 Georgia,
      'Times New Roman',
      serif;
    letter-spacing: 2px;
    text-shadow: 0 0 12px #8080ff;
  }
  .sub {
    position: relative;
    margin: 8px 0 0;
    font-size: 16px;
    color: #c0c0ff;
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
