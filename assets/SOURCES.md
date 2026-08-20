# Asset provenance

Every shipped recreated asset is listed here with its licence. All OpenGaz artwork is original
project artwork; no LavaMind artwork is included.

| Path                                                                                                                     | What                                          | Licence                                     |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------- |
| `src/ui/sound.ts` (synth presets)                                                                                        | Fallback sound effects synthesised at runtime | GPL-3.0-or-later (presets); ZzFX engine MIT |
| `src/gfx/screen/title.png`                                                                                               | OpenGaz title-screen background               | CC BY-SA 4.0                                |
| `src/gfx/planet/{vexx,zile,stye,frac,bass,hork,xeen,pyke,nosh,loro,mira,ooom,tilo,queg}/{large,medium,icon,surface}.png` | Planet orbital, map/picker and surface views  | CC BY-SA 4.0                                |
| `src/gfx/ship/{1-12}/{picture,icon}.png`                                                                                 | Ship dealer artwork and picker icons          | CC BY-SA 4.0                                |
| `src/gfx/bg/stars/1.png`                                                                                                 | Journey map background                        | CC BY-SA 4.0                                |
| `src/gfx/screen/{win,lose}.png`                                                                                          | Victory and loss screen backgrounds           | CC BY-SA 4.0                                |
| `src/gfx/portrait/op{1-6}.png`                                                                                           | Rival-company creature cards                  | CC BY-SA 4.0                                |
| `src/gfx/portrait/{bank,zinn,union,insurance,tax,crew,broker,dealer,warehouse,mechanic}.png`                             | Service portraits and warehouse scene         | CC BY-SA 4.0                                |

## Sound effects

Every shipped sound is **CC0 1.0** (public domain dedication) from a Kenney pack. CC0 imposes no
conditions, so nothing here is an obligation — the table exists so the provenance of each file can
be checked, and because crediting Kenney is the decent thing to do.

Masters live in `assets/src/sfx/<id>.ogg` and are the pack files themselves, renamed to the
OpenGaz sound id and otherwise untouched except where the Master column says so. `pnpm
assets:build` converts them to mono 22 050 Hz OGG in `public/assets/sfx/` and peak-normalises the
result so no sound is startling next to another; it does not alter the masters.

Ids with no entry below — the eighteen `sfx.commodity.*` trade noises — are still synthesised at
runtime. Buying and selling fall back to `sfx.buy` / `sfx.sell` until per-commodity samples exist.

| OpenGaz id          | Source pack (all CC0 1.0)                                              | Original file                    | Master                     |
| ------------------- | ---------------------------------------------------------------------- | -------------------------------- | -------------------------- |
| `sfx.click`         | [Kenney — UI Audio](https://kenney.nl/assets/ui-audio)                 | `click1.ogg`                     | unmodified                 |
| `sfx.help`          | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | `question_004.ogg`               | unmodified                 |
| `sfx.ping`          | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | `select_003.ogg`                 | unmodified                 |
| `sfx.select`        | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | `confirmation_001.ogg`           | unmodified                 |
| `sfx.error`         | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | `error_006.ogg`                  | unmodified                 |
| `sfx.unlock`        | [Kenney — Music Jingles](https://kenney.nl/assets/music-jingles)       | `jingles_NES12.ogg`              | unmodified                 |
| `sfx.buy`           | [Kenney — Casino Audio](https://kenney.nl/assets/casino-audio)         | `chip-lay-1.ogg`                 | unmodified                 |
| `sfx.sell`          | [Kenney — Casino Audio](https://kenney.nl/assets/casino-audio)         | `chips-stack-3.ogg`              | unmodified                 |
| `sfx.coins`         | [Kenney — Casino Audio](https://kenney.nl/assets/casino-audio)         | `chips-collide-1.ogg`            | unmodified                 |
| `sfx.cash`          | [Kenney — Casino Audio](https://kenney.nl/assets/casino-audio)         | `chips-handle-4.ogg`             | unmodified                 |
| `sfx.gooddeal`      | [Kenney — Music Jingles](https://kenney.nl/assets/music-jingles)       | `jingles_PIZZI10.ogg`            | unmodified                 |
| `sfx.baddeal`       | [Kenney — Music Jingles](https://kenney.nl/assets/music-jingles)       | `jingles_PIZZI11.ogg`            | unmodified                 |
| `sfx.market`        | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | `open_001.ogg`                   | unmodified                 |
| `sfx.warehouse`     | [Kenney — Impact Sounds](https://kenney.nl/assets/impact-sounds)       | `impactWood_heavy_002.ogg`       | unmodified                 |
| `sfx.pickup`        | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | `confirmation_003.ogg`           | unmodified                 |
| `sfx.advert`        | [Kenney — Digital Audio](https://kenney.nl/assets/digital-audio)       | `phaserUp6.ogg`                  | unmodified                 |
| `sfx.crew`          | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | `pluck_001.ogg`                  | unmodified                 |
| `sfx.tax`           | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | `bong_001.ogg`                   | unmodified                 |
| `sfx.insure`        | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | `confirmation_002.ogg`           | unmodified                 |
| `sfx.stock`         | [Kenney — Digital Audio](https://kenney.nl/assets/digital-audio)       | `pepSound3.ogg`                  | unmodified                 |
| `sfx.stock2`        | [Kenney — Digital Audio](https://kenney.nl/assets/digital-audio)       | `pepSound1.ogg`                  | unmodified                 |
| `sfx.money`         | [Kenney — Casino Audio](https://kenney.nl/assets/casino-audio)         | `chips-stack-5.ogg`              | unmodified                 |
| `sfx.bank`          | [Kenney — Casino Audio](https://kenney.nl/assets/casino-audio)         | `chip-lay-3.ogg`                 | unmodified                 |
| `sfx.bank2`         | [Kenney — Casino Audio](https://kenney.nl/assets/casino-audio)         | `chips-handle-2.ogg`             | unmodified                 |
| `sfx.loan`          | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | `question_002.ogg`               | unmodified                 |
| `sfx.zinn`          | [Kenney — Impact Sounds](https://kenney.nl/assets/impact-sounds)       | `impactBell_heavy_002.ogg`       | unmodified                 |
| `sfx.fuel`          | [Kenney — Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds)       | `thrusterFire_001.ogg`           | trimmed to 0.9 s, fade out |
| `sfx.map`           | [Kenney — Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds)       | `doorOpen_000.ogg`               | unmodified                 |
| `sfx.special`       | [Kenney — Music Jingles](https://kenney.nl/assets/music-jingles)       | `jingles_PIZZI16.ogg`            | unmodified                 |
| `sfx.news`          | [Kenney — Music Jingles](https://kenney.nl/assets/music-jingles)       | `jingles_HIT11.ogg`              | unmodified                 |
| `sfx.weather`       | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | `maximize_006.ogg`               | unmodified                 |
| `sfx.clock`         | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | `tick_004.ogg`                   | unmodified                 |
| `sfx.history`       | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds) | `open_003.ogg`                   | unmodified                 |
| `sfx.rocket`        | [Kenney — Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds)       | `spaceEngineLarge_001.ogg`       | trimmed to 1.8 s, fade out |
| `sfx.arrive`        | [Kenney — Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds)       | `doorOpen_002.ogg`               | unmodified                 |
| `sfx.event.good`    | [Kenney — Music Jingles](https://kenney.nl/assets/music-jingles)       | `jingles_NES09.ogg`              | unmodified                 |
| `sfx.event.neutral` | [Kenney — Music Jingles](https://kenney.nl/assets/music-jingles)       | `jingles_NES06.ogg`              | unmodified                 |
| `sfx.event.bad`     | [Kenney — Music Jingles](https://kenney.nl/assets/music-jingles)       | `jingles_NES11.ogg`              | unmodified                 |
| `sfx.stock.crash`   | [Kenney — Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds)       | `lowFrequency_explosion_000.ogg` | unmodified                 |
| `sfx.auction`       | [Kenney — Impact Sounds](https://kenney.nl/assets/impact-sounds)       | `impactWood_heavy_004.ogg`       | unmodified                 |
| `sfx.win`           | [Kenney — Music Jingles](https://kenney.nl/assets/music-jingles)       | `jingles_STEEL02.ogg`            | unmodified                 |
| `sfx.lose`          | [Kenney — Music Jingles](https://kenney.nl/assets/music-jingles)       | `jingles_STEEL01.ogg`            | unmodified                 |
| `sfx.bankrupt`      | [Kenney — Music Jingles](https://kenney.nl/assets/music-jingles)       | `jingles_STEEL06.ogg`            | unmodified                 |
