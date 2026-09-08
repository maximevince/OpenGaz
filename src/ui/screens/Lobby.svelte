<script lang="ts">
  import { LEVELS, Rng, SHIPS, randomPlayerName } from '../../engine';
  import { MAX_SEATS, online, type Seat } from '../../net/online.svelte';
  import { colorOf } from '../charts';
  import Btn from '../components/Btn.svelte';
  import ChatPanel from '../components/ChatPanel.svelte';
  import ShipDialog from '../components/ShipDialog.svelte';
  import { game } from '../game.svelte';

  // placeholder identity only; a returning player keeps whatever they typed last time
  const nameRng = new Rng((Math.random() * 0x1_0000_0000) >>> 0);
  let name = $state(localStorage.getItem('opengaz.player') || randomPlayerName(nameRng));
  let code = $state(new URLSearchParams(location.search).get('room') ?? '');
  let copied = $state(false);
  /** seat whose company name the host is typing over */
  let renaming = $state<number | null>(null);
  /** seat whose ship the host is choosing */
  let shipFor = $state<number | null>(null);
  const lobby = $derived(online.lobby);
  const canStart = $derived(!!lobby && lobby.seats.some((s) => s.peer) && online.isHost);
  const unclaimed = $derived(lobby ? lobby.seats.filter((s) => !s.peer).length : 0);
  const seated = $derived(online.mySeats().length > 0);

  const shipName = (id: number) => SHIPS.find((x) => x.id === id)?.name ?? `ship ${id}`;
  const who = (s: Seat) =>
    s.peer ? (online.peers[s.peer] ?? s.player) : s.player ? `${s.player} (away)` : 'free';

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
  function leave() {
    online.leave();
    game.go('title');
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
  /** the host typed a new company name (or left the field alone) */
  function commitRename(i: number, value: string) {
    const v = value.trim();
    const s = lobby?.seats[i];
    if (s && v && v !== s.name) online.renameSeat(i, v);
    renaming = null;
  }
  const focus = (el: HTMLInputElement) => {
    el.focus();
    el.select();
  };
</script>

<div class="lobby">
  <div class="title">Play Online — peer to peer, no server</div>
  {#if online.status === 'idle' || online.status === 'error'}
    <div class="box">
      <div class="who-am-i">
        <!-- the dice stays outside the label, or it lands in the input's accessible name -->
        <label
          >Your name <input bind:value={name} maxlength="20" placeholder="e.g. Nova Pike" /></label
        >
        <button class="dice" title="Random name" onclick={() => (name = randomPlayerName(nameRng))}
          >&#127922;</button
        >
      </div>
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
    <div class="box room">
      <div class="main">
        <div class="head">
          <span class="roomname">Room <b class="code">{online.code}</b></span>
          <span class="hosted"
            >{online.isHost ? 'you are hosting' : `host: ${online.peers[lobby.host] ?? '…'}`}</span
          >
          <Btn onclick={copy}>{copied ? 'Link copied!' : 'Copy invite link'}</Btn>
        </div>
        <div class="seats">
          {#each lobby.seats as s, i (i)}
            <div class="seat" class:mine={s.peer === online.selfId}>
              <span class="swatch" style:background={colorOf(i)}></span>
              <div class="co">
                {#if online.isHost && renaming === i}
                  <input
                    class="rename"
                    value={s.name}
                    maxlength="24"
                    aria-label="Company name"
                    use:focus
                    onblur={(e) => commitRename(i, (e.target as HTMLInputElement).value)}
                    onkeydown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') commitRename(i, (e.target as HTMLInputElement).value);
                      else if (e.key === 'Escape') renaming = null;
                    }}
                  />
                {:else if online.isHost}
                  <button
                    class="edit name"
                    title="Rename the company"
                    onclick={() => (renaming = i)}>{s.name}</button
                  >
                {:else}
                  <b class="name">{s.name}</b>
                {/if}
                <span class="dot">·</span>
                {#if online.isHost}
                  <button class="edit ship" title="Choose a ship" onclick={() => (shipFor = i)}
                    >{shipName(s.ship)}</button
                  >
                {:else}
                  <span class="ship">{shipName(s.ship)}</span>
                {/if}
              </div>
              <span class="who" class:free={!s.peer}>{who(s)}</span>
              <span class="act">
                {#if s.peer === online.selfId}
                  <Btn onclick={() => online.claimSeat(null)}>Leave seat</Btn>
                {:else if !s.peer}
                  <Btn color="green" onclick={() => online.claimSeat(i)}>Take seat</Btn>
                {/if}
                {#if online.isHost && lobby.seats.length > 1}
                  <Btn title="Remove this seat" onclick={() => online.removeSeat(i)}>−</Btn>
                {/if}
              </span>
            </div>
          {/each}
        </div>
        {#if online.isHost && lobby.seats.length < MAX_SEATS}
          <button class="add" onclick={() => online.addSeat()}>+ add a seat</button>
        {/if}
        {#if !seated}<p class="note">Take a seat to play; without one you only watch.</p>{/if}
        <div class="opts">
          <label
            >Computer opponents
            <input
              type="number"
              min="0"
              max={online.maxAi()}
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
        </div>
        {#if online.notice}<p class="err">{online.notice}</p>{/if}
        <div class="row">
          <Btn onclick={leave}>Leave</Btn>
          {#if online.isHost}
            {#if unclaimed > 0}<span class="note"
                >{unclaimed} empty seat{unclaimed > 1 ? 's' : ''} will be dropped at the start.</span
              >{/if}
            <Btn color="green" disabled={!canStart} onclick={start}>Start the game</Btn>
          {:else}<span class="note">Waiting for the host to start…</span>{/if}
        </div>
      </div>
      <div class="side">
        <h3>Chat</h3>
        <ChatPanel />
      </div>
    </div>
    {#if shipFor !== null && lobby.seats[shipFor]}
      {@const s = lobby.seats[shipFor]!}
      {@const i = shipFor}
      <ShipDialog
        title={`Choose a ship for ${s.name}`}
        ship={s.ship}
        onpick={(id) => online.renameSeat(i, s.name, id)}
        onclose={() => (shipFor = null)}
      />
    {/if}
  {/if}
  {#if online.status !== 'lobby'}
    <div class="bottom">
      <Btn onclick={leave}>Back to title</Btn>
    </div>
  {/if}
</div>

<style>
  .who-am-i {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .who-am-i label {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dice {
    background: var(--c-face);
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    padding: 2px 6px;
  }
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
    min-height: 0;
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
  .note {
    font-size: 11px;
    color: #202020;
    margin: 0;
  }
  .err {
    color: #800000;
    font-weight: bold;
    margin: 0;
  }
  .bottom :global(.btn) {
    width: 100%;
  }

  /* --- the room: seats and settings on the left, the chat down the right ---------------- */
  .room {
    display: grid;
    grid-template-columns: 1fr 236px;
    gap: 10px;
    overflow: hidden;
  }
  .main {
    min-height: 0;
    min-width: 0;
    /* only ever scrolls down: a long name is cut short, never given a sideways scrollbar */
    overflow-x: hidden;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .side {
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .head {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .roomname {
    white-space: nowrap;
  }
  .code {
    font-size: 17px;
    letter-spacing: 2px;
    background: var(--c-yellow-plate);
    padding: 0 6px;
  }
  .hosted {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #404040;
    font-size: 12px;
  }
  .seats {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .seat {
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    column-gap: 6px;
    row-gap: 1px;
    align-items: center;
    background: #fff;
    padding: 3px 5px;
  }
  .seat.mine {
    background: var(--c-yellow-plate);
  }
  .swatch {
    grid-row: 1 / 3;
    width: 10px;
    height: 24px;
    border: 1px solid rgba(0, 0, 0, 0.5);
  }
  .co {
    grid-column: 2 / 4;
    display: flex;
    align-items: baseline;
    gap: 4px;
    min-width: 0;
    white-space: nowrap;
  }
  .name {
    font-weight: bold;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .co .ship {
    flex: none;
  }
  .dot {
    color: #808080;
  }
  .ship {
    color: #202020;
  }
  /* the host's fields look like text until you go for them */
  .edit {
    font: inherit;
    color: inherit;
    background: none;
    border: none;
    border-bottom: 1px dashed #808080;
    padding: 0;
    cursor: text;
    min-width: 0;
  }
  .edit.ship {
    cursor: pointer;
  }
  .edit:hover {
    background: var(--c-cyan-plate);
  }
  .rename {
    font: bold 13px var(--font-ui);
    padding: 0 2px;
    width: 180px;
  }
  .who {
    grid-column: 2;
    color: #404040;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .who.free {
    font-style: italic;
  }
  .act {
    grid-column: 3;
    display: flex;
    gap: 4px;
  }
  .act :global(.btn) {
    font-size: 11px;
    padding: 1px 6px;
  }
  .add {
    align-self: flex-start;
    font: 12px var(--font-ui);
    color: #000080;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
  }
  .opts {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }
  .opts input {
    width: 40px;
  }
  .row {
    flex: none;
    display: flex;
    gap: 8px;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
  }
</style>
