<script lang="ts">
  /**
   * The room's chat as a pane: every line so far, newest at the bottom, and a box to type in.
   * The lobby and the waiting screen embed it; the in-game overlay opens it as a popup.
   */
  import { tick } from 'svelte';
  import { online } from '../../net/online.svelte';
  import { colorOf } from '../charts';

  let {
    theme = 'light',
    placeholder = 'Say something…',
  }: { theme?: 'light' | 'dark'; placeholder?: string } = $props();

  let text = $state('');
  let list = $state<HTMLDivElement>();
  let input = $state<HTMLInputElement>();
  /** the reader is at the bottom, so new lines may scroll the pane; scrolling up pins the view */
  let follow = true;

  // while this pane is on screen every line has been seen
  $effect(() => {
    const n = online.chat.length;
    online.chatUnread = 0;
    if (n && follow) void tick().then(() => list?.scrollTo(0, list.scrollHeight));
  });

  function onscroll() {
    if (list) follow = list.scrollTop + list.clientHeight >= list.scrollHeight - 4;
  }
  function send() {
    if (online.say(text)) text = '';
    follow = true;
  }
  function onkeydown(e: KeyboardEvent) {
    // nothing typed here is a shortcut for the screen behind
    e.stopPropagation();
    if (e.key === 'Enter') send();
    else if (e.key === 'Escape') input?.blur();
  }
  export function focus() {
    input?.focus();
  }
  const clock = (at: number) =>
    new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
</script>

<div class="chat {theme}">
  <div class="list" bind:this={list} {onscroll} role="log" aria-live="polite" aria-label="Chat">
    {#each online.chat as m (m.id)}
      <div class="line" class:sys={m.kind === 'sys'} title={clock(m.at)}>
        {#if m.kind === 'say'}
          <span class="swatch" style:background={m.seat === null ? '#808080' : colorOf(m.seat)}
          ></span><b>{m.name}:</b>
        {/if}
        {m.text}
      </div>
    {/each}
  </div>
  <input
    bind:this={input}
    bind:value={text}
    maxlength="200"
    {placeholder}
    aria-label="Chat message"
    title="Enter sends. /1 to /9 send a quick line."
    {onkeydown}
  />
</div>

<style>
  .chat {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    height: 100%;
    gap: 4px;
    font: 11px/1.35 var(--font-ui);
  }
  .list {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 4px 6px;
    text-align: left;
    overflow-wrap: anywhere;
  }
  .light .list {
    background: #fff;
    color: #000;
    border: 2px inset #808080;
  }
  .dark .list {
    background: #080818;
    color: #e0e0e0;
    border: 1px solid #404040;
  }
  .line + .line {
    margin-top: 2px;
  }
  .sys {
    font-style: italic;
  }
  .light .sys {
    color: #000080;
  }
  .dark .sys {
    color: var(--c-cyan);
  }
  .swatch {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 4px;
    border: 1px solid rgba(0, 0, 0, 0.5);
    vertical-align: baseline;
  }
  input {
    flex: none;
    font: 12px var(--font-ui);
    padding: 3px 4px;
    border: 2px inset #808080;
    background: #fff;
    color: #000;
    min-width: 0;
  }
</style>
