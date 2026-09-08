<script lang="ts">
  /**
   * In-game chat the Quake way: `T` (or `Enter`, when nothing has the focus) opens a say-line
   * across the top, `Enter` sends it, `Esc` drops it, and the last few lines hang in the corner
   * for a few seconds before they fade. A small button opens the whole history — that one is
   * also the way in on a touch screen. Mounted once, in App; it shows itself only inside an
   * online room, and stays out of the way on the screens that carry a full chat pane already.
   */
  import { online } from '../../net/online.svelte';
  import { colorOf } from '../charts';
  import { game } from '../game.svelte';
  import Btn from './Btn.svelte';
  import ChatPanel from './ChatPanel.svelte';

  /** how long a line hangs in the corner */
  const FADE_MS = 8000;
  /** how many lines the corner holds at most */
  const SHOW = 5;

  let open = $state(false);
  let history = $state(false);
  let text = $state('');
  let now = $state(Date.now());
  let input = $state<HTMLInputElement>();

  const inRoom = $derived(online.status === 'lobby' || online.status === 'playing');
  const hasPane = $derived(game.screen === 'lobby' || game.screen === 'waiting');
  const shown = $derived(inRoom && !hasPane);
  const recent = $derived(
    shown ? online.chat.slice(-SHOW).filter((m) => now - m.at < FADE_MS) : [],
  );

  // a clock for the fade, ticking only while the newest line could still be on screen
  $effect(() => {
    const last = online.chat.at(-1);
    if (!shown || !last) return;
    now = Date.now();
    const iv = setInterval(() => (now = Date.now()), 500);
    const stop = setTimeout(() => clearInterval(iv), FADE_MS + 600);
    return () => {
      clearInterval(iv);
      clearTimeout(stop);
    };
  });
  // a line the corner showed has been seen — unless the tab was in the background
  $effect(() => {
    void online.chat.length;
    if (shown && !document.hidden) online.chatUnread = 0;
  });
  $effect(() => {
    if (open) input?.focus();
  });
  $effect(() => {
    if (!inRoom) {
      open = false;
      history = false;
      text = '';
    }
  });

  const typing = (t: EventTarget | null) =>
    t instanceof HTMLInputElement ||
    t instanceof HTMLTextAreaElement ||
    t instanceof HTMLSelectElement ||
    (t instanceof HTMLElement && t.isContentEditable);

  function onkeydown(e: KeyboardEvent) {
    if (!shown || open || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape' && history) {
      history = false;
      return;
    }
    if (typing(e.target)) return;
    const idle = document.activeElement === null || document.activeElement === document.body;
    // `T` talks from anywhere; `Enter` only when it would not press a button instead
    if (e.key === 't' || e.key === 'T' || (e.key === 'Enter' && idle)) {
      e.preventDefault();
      open = true;
    }
  }
  function sayKey(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === 'Enter') {
      online.say(text);
      text = '';
      open = false;
    } else if (e.key === 'Escape') {
      text = '';
      open = false;
    }
  }
</script>

<svelte:window {onkeydown} />

{#if shown}
  {#if open}
    <div class="say">
      <span class="prompt">say:</span>
      <input
        bind:this={input}
        bind:value={text}
        maxlength="200"
        aria-label="Chat message"
        onkeydown={sayKey}
        onblur={() => (open = false)}
      />
    </div>
  {/if}
  {#if recent.length}
    <div class="corner" aria-hidden="true">
      {#each recent as m (m.id)}
        <div
          class="line"
          class:sys={m.kind === 'sys'}
          style:opacity={Math.min(1, (FADE_MS - (now - m.at)) / 1500)}
        >
          {#if m.kind === 'say'}
            <span class="swatch" style:background={m.seat === null ? '#808080' : colorOf(m.seat)}
            ></span><b>{m.name}:</b>
          {/if}
          {m.text}
        </div>
      {/each}
    </div>
  {/if}
  <button
    class="bubble"
    onclick={() => (history = !history)}
    title="Room chat (T)"
    aria-label="Room chat"
  >
    💬{#if online.chatUnread}<span class="badge">{online.chatUnread}</span>{/if}
  </button>
  {#if history}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="backdrop" role="presentation" onclick={() => (history = false)}>
      <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
      <div class="box" onclick={(e) => e.stopPropagation()}>
        <div class="title">Room {online.code} — chat</div>
        <div class="pane"><ChatPanel /></div>
        <div class="row"><Btn onclick={() => (history = false)}>Close</Btn></div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .say {
    position: absolute;
    left: 6px;
    top: 4px;
    width: 400px;
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 3px 6px;
    background: rgba(0, 0, 0, 0.75);
    border: 1px solid #c0c0c0;
    color: #fff;
    font: bold 12px var(--font-ui);
    z-index: 25;
  }
  .say input {
    flex: 1;
    min-width: 0;
    font: 12px var(--font-ui);
    padding: 2px 4px;
    border: 1px solid #808080;
    background: #fff;
    color: #000;
  }
  .corner {
    position: absolute;
    left: 6px;
    top: 30px;
    width: 400px;
    pointer-events: none;
    z-index: 14;
    font: bold 12px/1.3 var(--font-ui);
    color: #fff;
    text-shadow:
      1px 1px 0 #000,
      -1px -1px 0 #000,
      1px -1px 0 #000,
      -1px 1px 0 #000;
    overflow-wrap: anywhere;
  }
  .corner .line + .line {
    margin-top: 2px;
  }
  .corner .sys {
    color: var(--c-cyan-plate);
    font-style: italic;
  }
  .swatch {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 4px;
    border: 1px solid #000;
  }
  .bubble {
    position: absolute;
    left: 4px;
    bottom: 4px;
    z-index: 14;
    min-width: 28px;
    height: 28px;
    padding: 0 4px;
    border: 1px solid #606060;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 15px;
    line-height: 1;
    cursor: pointer;
    opacity: 0.75;
  }
  .bubble:hover {
    opacity: 1;
  }
  .badge {
    position: absolute;
    right: -6px;
    top: -6px;
    min-width: 14px;
    height: 14px;
    padding: 0 3px;
    border-radius: 7px;
    background: #ff0000;
    color: #fff;
    font: bold 10px/14px var(--font-ui);
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 16;
  }
  .box {
    width: 460px;
    max-height: 440px;
    display: flex;
    flex-direction: column;
    background: var(--c-face);
    color: #000;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-shadow: 3px 3px 0 #000;
    padding: 0 10px 10px;
    font: 13px var(--font-ui);
  }
  .title {
    flex: none;
    background: var(--c-navy);
    color: #fff;
    font: bold 14px var(--font-ui);
    padding: 5px 8px;
    margin: 0 -10px 8px;
  }
  .pane {
    height: 300px;
    min-height: 0;
  }
  .row {
    flex: none;
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }
</style>
