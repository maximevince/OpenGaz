# Asset provenance

Every shipped recreated asset is listed here with its licence. All OpenGaz artwork is original
project artwork; no LavaMind artwork is included.

| Path                                                                                                                                            | What                                          | Licence                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| `src/ui/sound.ts` (synth presets)                                                                                                               | UI/event sound effects synthesised at runtime | GPL-3.0-or-later (presets); ZzFX engine MIT |
| `src/gfx/screen/title.png`                                                                                                                      | OpenGaz title-screen background               | CC BY-SA 4.0                                |
| `src/gfx/planet/{vexx,zile,stye,frac,bass,hork,xeen,pyke,nosh,loro,mira,ooom,tilo,queg}/{large,medium,icon,surface}.png`                        | Planet orbital, map/picker and surface views  | CC BY-SA 4.0                                |
| `src/gfx/ship/{1-12}/{picture,icon}.png`                                                                                                        | Ship dealer artwork and picker icons          | CC BY-SA 4.0                                |
| `src/gfx/bg/stars/1.png`                                                                                                                        | Journey map background                        | CC BY-SA 4.0                                |
| `src/gfx/screen/{win,lose}.png`                                                                                                                 | Victory and loss screen backgrounds           | CC BY-SA 4.0                                |
| `src/gfx/portrait/op{1-6}.png`                                                                                                                  | Rival-company creature cards                  | CC BY-SA 4.0                                |
| `src/gfx/portrait/{bank,zinn,union,insurance,tax,crew,broker,dealer,warehouse,mechanic}.png`                                                    | Service portraits and warehouse scene         | CC BY-SA 4.0                                |
| `src/gfx/bg/stars/{2,3}.png`                                                                                                                    | Optional Journey map backgrounds              | CC BY-SA 4.0                                |
| `src/gfx/portrait/{media,engines,fuel,shoreleave,blessing,fortune,casino,smuggler,magistrate,news,weather,clock,history}.png`                   | Explore special and tab portraits             | CC BY-SA 4.0                                |
| `src/gfx/portrait/{repair,meteor,storm,fire,bandits,pirates,rebels,snoz,scooter,nectum,yoyo,sabotage,gurttle,quaso,cornucopia,dred,zobrok}.png` | Event portraits                               | CC BY-SA 4.0                                |

## Music

Cues built by `scripts/music/cut_recording.py` from freely-licensed recordings. Every recording
below comes from the Pandora Music collection at ibiblio, released under the EFF Open Audio
License; EFF retired the OAL declaring it interchangeable with CC BY-SA, and Wikimedia Commons
tags these files CC BY-SA 2.0. Our excerpts are therefore released under **CC BY-SA 4.0**, and the
performer credit below ships in the game's credits screen.

| Path            | Work                                                                                          | Performer                                                          | Licence                                                    | Source                                                            | Changes                                                                      |
| --------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `music/op1.ogg` | Brandenburg Concerto No. 3 in G major, BWV 1048 — I. Allegro (1721) — J. S. Bach (1685–1750)  | Advent Chamber Orchestra, concert of December 2006                 | EFF Open Audio License (interchangeable with CC BY-SA 2.0) | http://music.ibiblio.org/pub/multimedia/pandora/vorbis/index.html | excerpted from 2 s, faded, level-matched to −16 LUFS, re-encoded to Vorbis   |
| `music/op4.ogg` | Miroirs (1905) — III. Une barque sur l'océan — Maurice Ravel (1875–1937)                      | Thérèse Dussaut, piano, recital at Salle Pleyel, Paris, March 1975 | EFF Open Audio License (interchangeable with CC BY-SA 2.0) | http://music.ibiblio.org/pub/multimedia/pandora/vorbis/index.html | excerpted from 0.5 s, faded, level-matched to −16 LUFS, re-encoded to Vorbis |
| `music/op6.ogg` | Totentanz, S. 126, for piano and orchestra (1849) — Franz Liszt (1811–1886)                   | Neal O'Doan, piano (orchestra unidentified in the source)          | EFF Open Audio License (interchangeable with CC BY-SA 2.0) | http://music.ibiblio.org/pub/multimedia/pandora/vorbis/index.html | excerpted from 2.1 s, faded, level-matched to −16 LUFS, re-encoded to Vorbis |
| `music/op2.ogg` | Rival theme, Trading Corp. IV — original OpenGaz composition (walking bass, D minor)          | OpenGaz, rendered with FluidR3_GM (MIT)                            | CC BY-SA 4.0                                               | `assets/src/music/scores/opengaz-op2-jazz.json`                   | —                                                                            |
| `music/op5.ogg` | Rival theme, Roke Transport — original OpenGaz composition (E minor pentatonic bass riff)     | OpenGaz, rendered with FluidR3_GM (MIT)                            | CC BY-SA 4.0                                               | `assets/src/music/scores/opengaz-op5-groove.json`                 | —                                                                            |
| `music/op3.ogg` | Rival theme, Vandergriff Ltd. — original OpenGaz composition (drum band, no pitched material) | OpenGaz, rendered with FluidR3_GM (MIT)                            | CC BY-SA 4.0                                               | `assets/src/music/scores/opengaz-op3-drums-open.json`             | —                                                                            |
