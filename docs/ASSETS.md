# Recreated assets — plan & spec sheet

How OpenGaz gets its own art and sound (artwork CC BY-SA 4.0; code and sound presets
GPL-3.0-or-later; no LavaMind material).

## 1. Ground rules

- **Never** copy, trace, upscale, "img2img" or use original screens/sprites/sounds as source
  material for recreated artwork. Reference the _ideas_ (a junkyard planet, a casino planet, a bug-shaped freighter,
  a grumpy tax collector) — never the pixels or waveforms. The dev-only `original` pack exists
  only so UI work is not blocked; it is git-ignored and CI fails if it is ever tracked.
- Every shipped file has a row in `assets/SOURCES.md`: path, what, and licence. Artwork is
  released under CC BY-SA 4.0; code and sound presets retain their stated licences.
- Names (Bass, Zinn, Dred, kubars…) are homage; visuals must be **our own take**, not look-alikes.
- Style target: "1996 CD-ROM": chunky pre-rendered 3D-ish planets and ships, saturated colours,
  black space, hand-drawn cartoon aliens with big expressions. Coherent across the set (same
  base prompt / seed family / palette), slightly goofy, never gritty.

## 2. Pipeline (repo)

```
assets/
  SOURCES.md          provenance table (mandatory)
  src/gfx/<id path>.png   masters as generated (≥ target size, PNG/webp)
  src/sfx/<id>.wav        masters (mono 22 kHz is plenty)
public/assets/        BUILT output, committed (small, optimised) + manifest.json
scripts/build-assets.mjs   assets/src → public/assets (resize/crop to spec, optimise, manifest)
```

`pnpm assets:build` regenerates `public/assets/**` and `manifest.json` from `assets/src`.
The UI resolves semantic ids (`src/ui/assets.ts`) → `public/assets/gfx/<id path>.png` if the
manifest lists it, else procedural SVG (`procgen.ts`). So art can land **id by id**; nothing
blocks on completeness.

## 3. Graphics inventory (semantic id → size → what)

| id                              | size (px) | count | notes                                                       |
| ------------------------------- | --------- | ----- | ----------------------------------------------------------- |
| `planet.<slug>.icon`            | 70×60     | 14    | map / setup pick, transparent bg                            |
| `planet.<slug>.medium`          | 200×200   | 14    | dialogs, arrival, transparent bg                            |
| `planet.<slug>.large`           | 640×480   | 14    | main-menu backdrop: planet from orbit + stars               |
| `planet.<slug>.surface`         | 640×480   | 14    | Explore/planet screen: skyline / landscape, character-free  |
| `ship.<1-12>.picture`           | 320×200   | 12    | dealer / ship info, black bg                                |
| `ship.<1-12>.icon`              | 80×50     | 12    | map marker, transparent bg                                  |
| `portrait.<slug>`               | 200×320   | ~45   | service characters + event characters (list below)          |
| `portrait.op1..op6`             | 320×200   | 6     | rival company logos/CEO cards (landscape)                   |
| `screen.title` / `win` / `lose` | 640×480   | 3     | title art (no logo text — UI draws it), victory, bankruptcy |
| `bg.stars.1..3`                 | 640×480   | 3     | tileable-ish starfields for travel/map                      |
| `ui.*` (optional later)         | —         |       | bevel buttons stay CSS; icons via SVG                       |

Total ≈ 150 images. Masters generated at 1024×1024 / 1024×768 and cropped/resized by the build.

### Planets (slug — flavour to convey)

| slug | flavour                                                            |
| ---- | ------------------------------------------------------------------ |
| vexx | imperial capital, marble palace, pomp, purple/gold                 |
| zile | wealthy merchants, banks, vaults, coins, green/gold                |
| stye | financial hub, Trader's Union towers, ledgers, blue-grey           |
| frac | insurance HQ, orderly, cracked/fractured surface, teal             |
| bass | stock analysts, ticker boards, charts, orange                      |
| hork | media capital, antennas, billboards, neon magenta                  |
| xeen | junkyard planet, scrap heaps, brilliant mechanics, rust brown      |
| pyke | industrial heartland, foundries, L-Tech engines, steel/orange glow |
| nosh | fuel depot, tanks, pipelines, hazard yellow                        |
| loro | pleasure planet, beaches, resorts, palm-ish alien trees, pink/cyan |
| mira | grand sages, monasteries, misty peaks, silence, white/lavender     |
| ooom | fortune tellers, crystal balls, tents, deep violet                 |
| tilo | casinos, neon, dice, chips, red/gold                               |
| queg | smugglers' den, hidden coves, shady docks, dark green/black        |

### Ships (id — silhouette idea; all "space bug / creature" freighters, cartoony 3D)

1 Stinger XII (wasp) · 2 Fly Catcher (fly, big net-mouth) · 3 Le Rock (armoured beetle) ·
4 Whaler 2000 (whale, huge hold) · 5 Retina (eyeball) · 6 Cerebralis (brain) ·
7 The Globulizer (blob) · 8 Locomotis (caterpillar/loco) · 9 Mantagon (manta) ·
10 Kegger (barrel/keg, 1 seat) · 11 Worm Shuttle (worm, many windows) · 12 Squidocity (squid).

### Portraits (200×320, bust, plain gradient background)

Services: `union` (Trader's Union clerk), `bank` (banker), `zinn` (Mr. Zinn, smiling shark of a
lender), `insurance` (agent), `tax` (tax collector), `crew` (crew rep), `broker` (Bass broker),
`dealer` (ship dealer), `pilot`, `news` (anchor), `weather` (weather bureau), `warehouse`
(foreman), `clock` (Ministry of Time), `history` (archivist), `mechanic`, `sooth` (soothsayer),
`ltech` (engineer), `casino` (croupier), `dred` (Emperor Dred Nicolson), `magistrate`.
Events: `police`, `repair`, `meteor`, `storm`, `fire`, `bandits`, `pirates`, `rebels`, `snoz`,
`zobrok`, `peelia`, `cornucopia` (Lady Cornucopia), `scooter`, `nectum`, `yoyo`, `sabotage`,
`gurttle`, `quaso` (Quaso Mutta, silent sage).
Rivals `op1..op6`: Gizzy Shipping (chaotic), Trading Corp. IV (by the book), Vandergriff Ltd.,
Puffer Inc., Roke Transport, Hoff Meister — a mascot/CEO + logo each.

## 4. Art direction and production

Artwork masters live in `assets/src/gfx/` and are built into the shipped pack by the same asset
pipeline. Each piece must be original OpenGaz artwork and released under CC BY-SA 4.0.
The art-direction briefs maintain a coherent set:

```
[BASE]  1996 CD-ROM game art, pre-rendered 3D look, chunky shapes, saturated colours, soft
        studio lighting, clean edges, no text, no watermark, centered
[PLANET large] a whole planet seen from orbit, <flavour>, black starry space background,
        slight rim light, occupies lower-left two thirds of frame
[PLANET surface] wide establishing shot of the surface of <name>, <flavour>, cartoon
        sci-fi architecture, no characters, horizon at 60 %
[SHIP]  a spaceship freighter shaped like a <creature>, cartoon 3D, metallic paint,
        portholes, thrusters, side view, black background
[PORTRAIT] bust portrait of a cartoon alien <role>, <mood>, big expressive eyes,
        exaggerated features, plain vertical gradient background, facing camera
[OPPONENT] company crest/logo card for "<name>", <style word>, mascot creature, badge shape
[TITLE] epic-goofy: bug-shaped freighter racing past a striped gas giant toward a glowing
        coin-shaped planet, empty band at top for the logo
```

Post-processing (build script): crop to spec, transparent backgrounds for icons via an alpha matte,
and optimisation for the shipped PNGs.

Fallback while art lands: `procgen.ts` (already shipping) — deterministic SVG per id.

## 5. Sound

Three layers, cheapest first; the UI calls `sfx('<id>')` and gets whatever the pack provides.

1. **Synth in code (zero assets)** — [ZzFX](https://github.com/KilledByAPixel/ZzFX) (MIT, ~1 kB):
   UI click, coin/kubar, buy/sell, page flip, warning buzz, engine hum, event stings (good /
   neutral / bad), stock crash. Parameter arrays live in `src/ui/sound.ts` under GPL. Music
   fallback: [ZzFXM](https://github.com/keithclark/ZzFXM) tracker tunes authored by us (title
   loop, travel loop, win/lose jingles).
2. **CC0 sample packs** for richer foley, dropped into `assets/src/sfx/` and listed in
   SOURCES.md:
   - Kenney — _Interface Sounds_, _UI Audio_, _Sci-Fi Sounds_, _Digital Audio_, _Impact Sounds_
     (all CC0, kenney.nl/assets).
   - OpenGameArt.org filtered CC0 (rocket, explosion, alarm, cash register, crowd, thunder).
   - freesound.org filtered CC0 (search terms: whoosh, cash register, cartoon boing, slide
     whistle, alarm, thunder, crowd cheer, sad trombone).
3. **Music** — either our own ZzFXM/OPL-style chiptunes, or CC0/CC-BY tracks (OpenGameArt
   CC0 space/lounge loops; Kevin MacLeod tracks are CC-BY 4.0 → keep credit line).

Sound id taxonomy — the 61 ids the game actually plays, all currently synthesised. Dropping
`<id>.wav` into `assets/src/sfx/` and rebuilding makes the sample win over the synth, one id at
a time; nothing else has to change.

- interface: `click`, `help`, `ping` (a choice on a picker), `select` (a ship), `error`,
  `unlock` (a tutorial feature arrives)
- money: `buy`, `sell`, `coins`, `cash` (big payout), `gooddeal`, `baddeal`
- services, played both when the screen opens and on the action: `market`, `warehouse`,
  `pickup`, `advert`, `crew`, `tax`, `insure`, `stock`, `stock2` (selling), `money`, `bank`,
  `bank2` (withdrawing), `loan`, `zinn`, `fuel`, `map`, `special`
- explore: `news`, `weather`, `clock`, `history`
- travel and events: `rocket`, `arrive`, `event.good|neutral|bad`, `stock.crash`, `auction`
- endings: `win`, `lose`, `bankrupt`
- one per commodity: `commodity.<id>`, e.g. `commodity.gems` (18)

Which sound belongs where is `src/ui/soundmap.ts`; what it sounds like is `src/ui/sound.ts`.
Music ids (`music.*`) are not wired yet.

**Sound test screen**: run `pnpm dev` and use the _Sound test_ button on the title screen or in
File Options. Each id shows as a pair — the cyan half plays the pack sample, the `♪` half plays
the synth version of the same id — so the two can be heard one click apart. Clicking a playing
button stops it, clicking another button cuts the first off, and there is a Stop button.

With the dev-only reference pack imported (`pnpm assets:original`, gitignored, never committed or
deployed) 49 of the 61 ids resolve, so each can be A/B'd against the sound it is meant to stand
in for. `?pack=opengaz` in the URL forces the shipped pack back. The 12 with no reference —
`click`, `error`, `unlock`, `buy`, `sell`, `market`, `warehouse`, `money`, `map`, `special`,
`arrive`, `lose` — are ours to invent.

Sound files: mono, 22 050 Hz, OGG (Vorbis, ~48 kbps) in `public/assets/sfx/`, WAV masters in
`assets/src/sfx/`.

## 6. Order of work

1. `scripts/build-assets.mjs` + `pnpm assets:build` (manifest from `assets/src`) — done with
   this doc.
2. `src/ui/sound.ts` (ZzFX + mute toggle + `sfx()` from packs) and hook ~15 call sites.
3. Create art-direction briefs for planets, ships, portraits, and screens.
4. Create: title + 14 planet larges + 12 ships first (most visible), then portraits, then
   surfaces/icons; iterate style until coherent; commit masters + built output + SOURCES rows.
5. Wire every id above to where it is played, synth-only — done.
6. CC0 sfx pass: replace the synth with samples, id by id, recording each source in SOURCES.md.
7. Music: a `music/` master tree with its own encode spec (stereo, 44.1 kHz), a looping channel
   separate from the effects channel, and a three-way sound setting (off / effects / everything).
   Public-domain scores rendered by us, so the recording is ours to license.
