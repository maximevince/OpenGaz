# OpenGaz

**An open-source homage to _Gazillionaire Deluxe_ (LavaMind, 1996) — a turn-based space-trading
game you can play in the browser, solo, hot-seat with friends on one screen, or online.**

> Status: playable alpha. Solo vs. computer companies, hot-seat, play-by-link and peer-to-peer
> online rooms all work; balance and artwork are still being refined.

Buy low on one planet, fly your bug-shaped freighter across Kukubia, sell high on another. Juggle
passengers, fuel, crew wages, taxes, insurance, warehouses, the stock exchanges, the Trader's Union
and the fickle Mr. Zinn — and out-trade six rival companies (or your brother and cousin).

## Goals

- Faithful in spirit to the original: same loop, same feel, same silliness. Nostalgia first.
- KISS: static web app, no accounts, no server needed to play.
- Multiplayer like it was: hot-seat on one machine, "play-by-link" (the modern play-by-email),
  and peer-to-peer online rooms.
- 100 % free and open: code and runtime sound presets under GPL-3.0-or-later; recreated artwork
  under CC BY-SA 4.0.

## Legal notice

OpenGaz is a fan re-implementation and is **not affiliated with or endorsed by LavaMind**.
_Gazillionaire_ is LavaMind's game and trademark; the original is still sold — go buy it.

Game mechanics are not copyrightable; their expression is. **No original code, artwork, sound or
text is included** in this repository or in any build: every line of code, every string of
dialogue and every image and sound is our own work. Planet, character and item names are kept as
homage. Recreated assets live in `assets/` with provenance in `assets/SOURCES.md`.

Developers who own the original CD may import its media into a local, git-ignored dev-only pack
(`pnpm assets:original`) purely to speed up UI work; CI fails if such files are ever tracked.

## How to play

- **Solo** — New Game, pick a level, your ship and 7 planets, add computer opponents.
- **Hot-seat** — add several human players; the game shows a "pass the mouse" screen between turns.
- **Play by link** — File Options → _Copy game link_: the whole game is packed into a URL you send to
  the next player (the modern play-by-email). Autosave keeps your own game in the browser.
- **Online** — Title → _Play online_: one player creates a room and shares the code / invite link;
  everyone else joins, takes a seat, and the host starts. Browsers talk to each other directly
  (WebRTC via [Trystero](https://github.com/dmotz/trystero); public Nostr relays are used only to
  find each other). Seats nobody takes are dropped when the host starts. Everyone must be online at
  the same time; a dropped player can rejoin with the same name, and any browser that falls out of
  step pulls a fresh snapshot from the host.
- **On a phone or tablet** — the game is one fixed 640×480 stage scaled to fit whatever screen it
  is on, so it stays fully visible and centred in both orientations. Landscape gives the largest
  picture; in portrait a _Rotate to fill_ button turns the stage a quarter-turn for a third more
  size, and remembers the choice.

## Development

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # engine unit tests (vitest)
pnpm test:layout  # drives every screen in a headless browser, fails on clipped content
pnpm check        # svelte-check + tsc
pnpm lint         # eslint + prettier
pnpm build        # static site in dist/
pnpm assets:build # assets/src masters -> public/assets pack (see docs/ASSETS.md)
```

### The 640×480 stage

Every screen is drawn on a fixed 640×480 stage that is scaled to the window and **clips
whatever does not fit**, so a table with one row too many or a dialog that outgrows the
stage silently takes its button row off screen. Neither `pnpm check` nor a unit test can
see that — it only exists once a browser has laid the screen out.

Two things keep it from happening:

- `pnpm test:layout` (`scripts/layout-audit.mjs`, also a CI step) boots the dev server,
  drives a headless Chromium through every screen — with the worst-case data we can force
  into it, with the help dialog open, and at two window sizes — and fails on any element
  that is cut off by an ancestor that clips without scrolling. **Add a scenario there when
  you add a screen or a modal**; a scenario that cannot be set up is reported as a coverage
  gap and fails too.
- In `pnpm dev` the same check (`src/ui/overflow-guard.ts`) runs on every DOM change and
  logs the offending elements to the console as soon as a screen overflows.

The usual fix is to cap the container's height and let the long part scroll: `max-height`
on the box, `overflow: auto; min-height: 0` on the list, `flex: none` on the header and
button rows. Watch out for one trap: a percentage `max-height` on a **grid** item resolves
against its own content and is silently dropped, so centre modals with flex, not
`place-items: center`.

Stack: TypeScript, Vite, Svelte 5, Vitest. Layout:

```
src/engine/   pure, deterministic game rules (no DOM) — data tables, reducer, AI, save/load
src/ui/       Svelte screens on a 640×480 virtual stage
src/net/      transports: local hot-seat, play-by-link, P2P (Trystero) …
assets/       recreated art & sound masters, prompt sheets, SOURCES.md (see docs/ASSETS.md)
docs/         asset pipeline and artwork notes
```

## License

Code and runtime sound presets are GPL-3.0-or-later — see `LICENSE`. Recreated artwork is
[CC BY-SA 4.0](assets/ARTWORK_LICENSE.md).
