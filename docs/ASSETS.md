# Recreated assets — plan & spec sheet

How OpenGaz gets its own art and sound (GPL-3.0-or-later, no LavaMind material).

## 1. Ground rules

- **Never** copy, trace, upscale, "img2img" or use original screens/sprites/sounds as source
  material for recreated artwork. Reference the _ideas_ (a junkyard planet, a casino planet, a bug-shaped freighter,
  a grumpy tax collector) — never the pixels or waveforms. The dev-only `original` pack exists
  only so UI work is not blocked; it is git-ignored and CI fails if it is ever tracked.
- Every shipped file has a row in `assets/SOURCES.md`: path, what, how made (tool + prompt id or
  source URL + author), licence. Only GPL-compatible sources: our own generations (released
  under GPL/CC0), CC0, CC-BY 4.0 (attribution kept in SOURCES.md), GPL.
- Names (Bass, Zinn, Dred, kubars…) are homage; visuals must be **our own take**, not look-alikes.
- Style target: "1996 CD-ROM": chunky pre-rendered 3D-ish planets and ships, saturated colours,
  black space, hand-drawn cartoon aliens with big expressions. Coherent across the set (same
  base prompt / seed family / palette), slightly goofy, never gritty.

## 2. Pipeline (repo)

```
assets/
  SOURCES.md          provenance table (mandatory)
  prompts/            one .md per category: base style + per-id prompt (this doc summarises)
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
pipeline. Each piece must be original OpenGaz artwork and released under a GPL-compatible licence.
The prompt sheets in `assets/prompts/` are art-direction briefs for maintaining a coherent set:

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

Sound id taxonomy (mirrors where the game needs feedback):
`sfx.click`, `sfx.buy`, `sfx.sell`, `sfx.coins`, `sfx.cash` (big payout), `sfx.error`,
`sfx.rocket.1..3` (launch), `sfx.engine`, `sfx.arrive`, `sfx.event.good|neutral|bad`,
`sfx.stock.up|down|crash`, `sfx.auction`, `sfx.bank`, `sfx.loan`, `sfx.tax`, `sfx.crew`,
`sfx.insure`, `sfx.fuel`, `sfx.warehouse`, `sfx.news`, `sfx.weather`, `sfx.help`,
`sfx.win`, `sfx.lose`, `sfx.bankrupt`, `sfx.dred`, `sfx.zinn`; `music.title|travel|win|lose`.

Sound files: mono, 22 050 Hz, OGG (Vorbis, ~48 kbps) in `public/assets/sfx/`, WAV masters in
`assets/src/sfx/`.

## 6. Order of work

1. `scripts/build-assets.mjs` + `pnpm assets:build` (manifest from `assets/src`) — done with
   this doc.
2. `src/ui/sound.ts` (ZzFX + mute toggle + `sfx()` from packs) and hook ~15 call sites.
3. Prompt sheets `assets/prompts/{planets,ships,portraits,screens}.md`.
4. Generate: title + 14 planet larges + 12 ships first (most visible), then portraits, then
   surfaces/icons; iterate style until coherent; commit masters + built output + SOURCES rows.
5. CC0 sfx pass; optional music.
