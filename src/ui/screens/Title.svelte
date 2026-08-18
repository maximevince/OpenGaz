<script lang="ts">
  import { img, activePack } from '../assets';
  let { onstart }: { onstart: () => void } = $props();
  const bg = img('screen.title');
  const pack = activePack();
</script>

<div class="title" style:background-image={bg ? `url(${bg})` : undefined}>
  {#if !bg}
    <div class="stars"></div>
    <h1>OpenGaz</h1>
    <p class="sub">an open-source homage to Gazillionaire Deluxe</p>
  {/if}
  <button class="start" onclick={onstart}>Click to begin</button>
  <div class="pack">asset pack: {pack}</div>
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
  .start {
    position: absolute;
    left: 50%;
    bottom: 60px;
    transform: translateX(-50%);
    padding: 8px 24px;
    font: bold 16px var(--font-ui);
    background: var(--c-face);
    color: #000;
    border: 2px outset #fff;
    cursor: pointer;
  }
  .pack {
    position: absolute;
    right: 6px;
    bottom: 4px;
    font-size: 10px;
    color: #888;
  }
</style>
