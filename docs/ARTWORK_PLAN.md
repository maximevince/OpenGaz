# Artwork next steps

## Current implemented set

- Title screen: complete.
- Planet orbital backgrounds: all 14 `planet.<id>.large` assets complete.
- Planet map and picker views: all 14 `planet.<id>.medium` and `planet.<id>.icon` assets complete.
- Planet Main Menu surfaces: all 14 `planet.<id>.surface` assets complete.
- Ship dealer pictures: all 12 `ship.<id>.picture` assets complete.
- Ship picker icons: all 12 `ship.<id>.icon` assets complete.
- Journey background and victory/loss screens: `bg.stars.1`, `screen.win`, and `screen.lose` complete.
- Rival cards: all six `portrait.op{1-6}` assets complete.
- Core service set: bank, loan, Union, insurance, tax, crew, broker, dealer, mechanic, and warehouse
  views complete.

## Next priority: make the artwork visible through normal play

1. [x] Create planet `medium` masters for all 14 planets. These are the Journey map markers and
       retain each planet's established colour, silhouette and landmarks.
2. [x] Create planet `icon` masters from the matching medium art. These are used in New Game's
       planet picker; checked at 70×60 px.
3. [x] Create ship `icon` masters from the matching dealer picture. These are used in New Game's
       ship picker and preserve each ship's relative size and recognisable silhouette at 80×50 px.
4. [x] Add an in-game ship-detail/dealer view that uses the existing `ship.<id>.picture` assets,
       so players can inspect a ship before choosing it.

## Planet and screen coverage

1. [x] Create the 14 `planet.<id>.surface` scenes for the Main Menu. Match each planet's orbital
       palette and flavour; keep the Journey button readable over the image.
2. [x] Add `bg.stars.1` for the Journey map, plus the `bg.stars.2` and `bg.stars.3` alternatives.
3. [x] Add `screen.win` and `screen.lose`, with their UI title and buttons tested for contrast.

## Character coverage

1. [x] Create the six rival-company cards used by the New Game opponent picker.
2. [x] Create the core service portraits: bank, Zinn, Union, insurance, tax, crew, broker, dealer,
       warehouse, and mechanic.
3. [x] Create the remaining Explore portraits: news, weather, clock, history, and the
       planet-special roles not covered by the core service set.
4. [x] Add event portraits in themed batches and check that every portrait reads clearly in the
       200×320 frame. All travel events now have an explicit portrait rather than a procedural
       fallback.
5. [x] Draw the last two referenced portraits that have no art yet: `ltech` (the L-Tech Engine
       Works rep) and `sooth` (the soothsayer of Ooom).

## Acceptance checks for every batch

- Put masters under the semantic `assets/src/gfx/` path and run `pnpm assets:build`.
- Confirm the built manifest entry matches the screen's `img(...)` lookup.
- Preview at the actual target size with `?pack=opengaz`; verify text and controls remain legible.
- Add the path and licence to `assets/SOURCES.md`.
