<script lang="ts">
  import { LEVELS, SHIPS } from '../../engine';
  import { online } from '../../net/online.svelte';
  import Btn from '../components/Btn.svelte';
  import { game } from '../game.svelte';

  let name = $state(localStorage.getItem('opengaz.player') ?? '');
  let code = $state(new URLSearchParams(location.search).get('room') ?? '');
  let copied = $state(false);
  const lobby = $derived(online.lobby);
  const canStart = $derived(!!lobby && lobby.seats.some((s) => s.peer) && online.isHost);
  const unclaimed = $derived(lobby ? lobby.seats.filter((s) => !s.peer).length : 0);

  function remember() {
    localStorage.setItem('opengaz.player', name.trim());
  }
  function host() {
    remember();
    online.host(name.trim() || 'Host');
  }
  function join() {
    remember();
    online.join(code, name.trim() || 'Guest');
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(online.inviteLink());
      copied = true;
    } catch {
      copied = false;
    }
  }
  function start() {
    if (!lobby) return;
    // seats nobody took are dropped here: a company with no player would stall the turn order
    const seats = online.claimedSeats();
    if (!seats.length) return;
    game.startOnline({
      seed: lobby.seed,
      level: lobby.level,
      planets: lobby.planets ?? undefined,
      humans: seats.map((s) => ({ name: s.name || `${s.player}'s Co.`, ship: s.ship })),
      ai: lobby.ai,
    });
  }
</script>

<div class="lobby">
  <div class="title">Play Online — peer to peer, no server</div>
  {#if online.status === 'idle' || online.status === 'error'}
    <div class="box">
      <label>Your name <input bind:value={name} maxlength="20" placeholder="e.g. Maxime" /></label>
      <div class="two">
        <div class="col">
          <h3>Host a game</h3>
          <p>You get a room code to send to your friends.</p>
          <Btn color="green" onclick={host} disabled={!name.trim()}>Create room</Btn>
        </div>
        <div class="col">
          <h3>Join a game</h3>
          <label
            >Room code <input
              bind:value={code}
              maxlength="6"
              placeholder="ABC123"
              style="text-transform:uppercase"
            /></label
          >
          <Btn color="green" onclick={join} disabled={!name.trim() || code.trim().length < 4}
            >Join room</Btn
          >
        </div>
      </div>
      {#if online.error}<p class="err">{online.error}</p>{/if}
      <p class="note">
        Everyone must be online at the same time (like sitting around one PC, but remote). Browsers
        connect directly to each other; a public relay is only used to find one another. Prefer
        async turns? Use "Copy game link" in File Options instead.
      </p>
    </div>
  {:else if online.status === 'connecting'}
    <div class="box">
      <p>Connecting to room <b>{online.code}</b>… waiting for the host.</p>
      <p class="note">
        This takes a few seconds: the browsers have to find a way through to each other. If nothing
        happens, we give up after {online.joinTimeout} seconds and say why.
      </p>
      <Btn onclick={() => online.leave()}>Cancel</Btn>
    </div>
  {:else if lobby}
    <div class="box">
      <div class="head">
        <span
          >Room <b class="code">{online.code}</b> · {online.isHost
            ? 'you are the host'
            : `host: ${online.peers[lobby.host] ?? '…'}`}</span
        >
        <Btn onclick={copy}>{copied ? 'Link copied!' : 'Copy invite link'}</Btn>
      </div>
      <h3>Seats (click one to take it)</h3>
      <div class="seats">
        {#each lobby.seats as s, i (i)}
          <div class="seat" class:mine={s.peer === online.selfId}>
            {#if online.isHost}
              <input
                class="cname"
                value={s.name}
                onchange={(e) => online.renameSeat(i, (e.target as HTMLInputElement).value)}
              />
              <select
                value={s.ship}
                onchange={(e) =>
                  online.renameSeat(i, s.name, Number((e.target as HTMLSelectElement).value))}
              >
                {#each SHIPS as sh (sh.id)}<option value={sh.id}>{sh.name}</option>{/each}
              </select>
            {:else}
              <span class="cname">{s.name} · {SHIPS.find((x) => x.id === s.ship)?.name}</span>
            {/if}
            <span class="who"
              >{s.peer
                ? (online.peers[s.peer] ?? s.player)
                : s.player
                  ? `${s.player} (away)`
                  : 'free'}</span
            >
            {#if s.peer === online.selfId}
              <Btn onclick={() => online.claimSeat(null)}>Leave seat</Btn>
            {:else if !s.peer}
              <Btn color="green" onclick={() => online.claimSeat(i)}>Take seat</Btn>
            {/if}
            {#if online.isHost && lobby.seats.length > 1}<Btn onclick={() => online.removeSeat(i)}
                >−</Btn
              >{/if}
          </div>
        {/each}
        {#if online.isHost && lobby.seats.length < 6}<Btn onclick={() => online.addSeat()}
            >+ add seat</Btn
          >{/if}
      </div>
      <div class="opts">
        <label
          >Computer opponents
          <input
            type="number"
            min="0"
            max={7 - lobby.seats.length}
            value={lobby.ai}
            disabled={!online.isHost}
            onchange={(e) =>
              online.updateLobby({ ai: Number((e.target as HTMLInputElement).value) })}
          />
        </label>
        <label
          >Level
          <select
            value={lobby.level}
            disabled={!online.isHost}
            onchange={(e) =>
              online.updateLobby({
                level: (e.target as HTMLSelectElement).value as typeof lobby.level,
              })}
          >
            {#each LEVELS as l (l.id)}<option value={l.id}>{l.name}</option>{/each}
          </select>
        </label>
        <span>Players here: {Object.values(online.peers).join(', ')}</span>
      </div>
      <div class="row">
        <Btn
          onclick={() => {
            online.leave();
            game.go('title');
          }}>Leave</Btn
        >
        {#if online.isHost}
          {#if unclaimed > 0}<span class="note"
              >{unclaimed} empty seat{unclaimed > 1 ? 's' : ''} will be dropped at the start.</span
            >{/if}
          <Btn color="green" disabled={!canStart} onclick={start}>Start the game</Btn>
        {:else}<span class="note">Waiting for the host to start…</span>{/if}
      </div>
    </div>
  {/if}
  <div class="bottom">
    <Btn
      onclick={() => {
        if (online.status === 'idle' || online.status === 'error') game.go('title');
      }}>Back to title</Btn
    >
  </div>
</div>

<style>
  .lobby {
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
  .box {
    flex: 1;
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: auto;
  }
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .col {
    background: #fff;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  h3 {
    margin: 0;
    font-size: 13px;
  }
  label {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  input,
  select {
    font: 13px var(--font-ui);
    padding: 3px 4px;
    border: 2px inset #808080;
    background: #fff;
    color: #000;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .code {
    font-size: 18px;
    letter-spacing: 2px;
    background: var(--c-yellow-plate);
    padding: 0 6px;
  }
  .seats {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .seat {
    display: grid;
    grid-template-columns: 1fr auto auto auto auto;
    gap: 6px;
    align-items: center;
    background: #fff;
    padding: 4px;
  }
  .seat.mine {
    background: var(--c-yellow-plate);
  }
  .cname {
    font-weight: bold;
  }
  .who {
    color: #404040;
  }
  .opts {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }
  .row {
    display: flex;
    gap: 8px;
    justify-content: space-between;
    align-items: center;
  }
  .note {
    font-size: 11px;
    color: #202020;
    margin: 0;
  }
  .err {
    color: #800000;
    font-weight: bold;
  }
  .bottom :global(.btn) {
    width: 100%;
  }
</style>
