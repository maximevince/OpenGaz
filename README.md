# OpenGaz

**An open-source homage to _Gazillionaire Deluxe_ (LavaMind, 1996) — a turn-based space-trading
game you can play in the browser, solo, hot-seat with friends on one screen, or online.**

> Status: playable alpha. Solo vs. computer companies, hot-seat, play-by-link and peer-to-peer
> online rooms all work; balance and artwork are still rough (see roadmap in `docs/DESIGN.md`).

Buy low on one planet, fly your bug-shaped freighter across Kukubia, sell high on another. Juggle
passengers, fuel, crew wages, taxes, insurance, warehouses, the stock exchanges, the Trader's Union
and the fickle Mr. Zinn — and out-trade six rival companies (or your brother and cousin).

## Goals

- Faithful in spirit to the original: same loop, same feel, same silliness. Nostalgia first.
- KISS: static web app, no accounts, no server needed to play.
- Multiplayer like it was: hot-seat on one machine, "play-by-link" (the modern play-by-email),
  and peer-to-peer online rooms.
- 100 % free software: code **and** recreated art/sound under GPL-3.0-or-later.

## Legal / clean-room notice

OpenGaz is a fan re-implementation and is **not affiliated with or endorsed by LavaMind**.
_Gazillionaire_ is LavaMind's game and trademark; the original is still sold — go buy it.

The rules are re-implemented from the manual, public community documentation and by observing the
original play. **No original artwork, sound, text or code is included** in this repository or in
any build. Planet, character and item names are used as homage. Recreated assets live in `assets/`
with provenance in `assets/SOURCES.md`.

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
  find each other). Everyone must be online at the same time; a dropped player can rejoin with the
  same name.

## Development

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # engine unit tests (vitest)
pnpm check        # svelte-check + tsc
pnpm lint         # eslint + prettier
pnpm build        # static site in dist/
```

Stack: TypeScript, Vite, Svelte 5, Vitest. Layout:

```
src/engine/   pure, deterministic game rules (no DOM) — data tables, reducer, AI, save/load
src/ui/       Svelte screens on a 640×480 virtual stage
src/net/      transports: local hot-seat, play-by-link, P2P (Trystero) …
assets/       recreated art & sound (GPL) + SOURCES.md
docs/         design reference
```

See `docs/DESIGN.md` for the game design reference and roadmap.

## License

GPL-3.0-or-later — see `LICENSE`.
