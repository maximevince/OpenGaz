<script lang="ts">
  import Stage from './ui/Stage.svelte';
  import Toast from './ui/components/Toast.svelte';
  import HelpDialog from './ui/components/HelpDialog.svelte';
  import { initAssets } from './ui/assets';
  import { game } from './ui/game.svelte';
  import Title from './ui/screens/Title.svelte';
  import Setup from './ui/screens/Setup.svelte';
  import Handoff from './ui/screens/Handoff.svelte';
  import Report from './ui/screens/Report.svelte';
  import MainMenu from './ui/screens/MainMenu.svelte';
  import Marketplace from './ui/screens/Marketplace.svelte';
  import Supply from './ui/screens/Supply.svelte';
  import Warehouse from './ui/screens/Warehouse.svelte';
  import Passengers from './ui/screens/Passengers.svelte';
  import Advertise from './ui/screens/Advertise.svelte';
  import Crew from './ui/screens/Crew.svelte';
  import Taxes from './ui/screens/Taxes.svelte';
  import Insurance from './ui/screens/Insurance.svelte';
  import Explore from './ui/screens/Explore.svelte';
  import Stock from './ui/screens/Stock.svelte';
  import Money from './ui/screens/Money.svelte';
  import Bank from './ui/screens/Bank.svelte';
  import Loan from './ui/screens/Loan.svelte';
  import Zinn from './ui/screens/Zinn.svelte';
  import Fuel from './ui/screens/Fuel.svelte';
  import FileOptions from './ui/screens/FileOptions.svelte';
  import Map from './ui/screens/Map.svelte';
  import Charts from './ui/screens/Charts.svelte';
  import Event from './ui/screens/Event.svelte';
  import Arrival from './ui/screens/Arrival.svelte';
  import GameOver from './ui/screens/GameOver.svelte';
  import Lobby from './ui/screens/Lobby.svelte';
  import Waiting from './ui/screens/Waiting.svelte';

  let ready = $state(false);
  // ?pack=opengaz forces the shipped pack even when the dev-only original pack is present
  const preferred = new URLSearchParams(location.search).get('pack');
  initAssets(preferred === 'opengaz' || preferred === 'original' ? preferred : undefined).then(
    () => {
      ready = true;
      // play-by-link: #g=... in the URL
      if (location.hash.startsWith('#g=')) game.importLink(location.href);
      else if (new URLSearchParams(location.search).get('room')) game.go('lobby');
    },
  );
  const screens = {
    setup: Setup,
    handoff: Handoff,
    report: Report,
    menu: MainMenu,
    market: Marketplace,
    supply: Supply,
    warehouse: Warehouse,
    passengers: Passengers,
    advertise: Advertise,
    crew: Crew,
    taxes: Taxes,
    insurance: Insurance,
    explore: Explore,
    stock: Stock,
    money: Money,
    bank: Bank,
    loan: Loan,
    zinn: Zinn,
    fuel: Fuel,
    file: FileOptions,
    map: Map,
    charts: Charts,
    travel: Arrival,
    event: Event,
    arrival: Arrival,
    gameover: GameOver,
    lobby: Lobby,
    waiting: Waiting,
  } as const;
  const Current = $derived(
    game.screen === 'title' ? null : (screens[game.screen as keyof typeof screens] ?? null),
  );
</script>

<Stage>
  {#if !ready}
    <div class="loading">Loading…</div>
  {:else if game.screen === 'title' || (!game.state && game.screen !== 'setup' && game.screen !== 'lobby')}
    <Title />
  {:else if Current}
    <Current />
  {/if}
  {#if game.state?.pending && game.state.phase !== 'event' && game.screen !== 'event' && game.screen !== 'title' && game.screen !== 'report'}
    <Event />
  {/if}
  <HelpDialog />
  <Toast />
</Stage>

<style>
  .loading {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #fff;
    font-size: 18px;
  }
</style>
