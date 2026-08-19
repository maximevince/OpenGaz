# Artwork next steps

## Current shipped set

- Title screen: complete.
- Planet orbital backgrounds: all 14 `planet.<id>.large` assets complete.
- Ship dealer pictures: all 12 `ship.<id>.picture` assets complete.

## Next priority: make the artwork visible through normal play

1. Create planet `medium` masters for all 14 planets. These are the Journey map markers and should
   retain each planet's established colour, silhouette and landmarks.
2. Create planet `icon` masters from the matching medium art. These are used in New Game's planet
   picker; check readability at 70×60 px.
3. Create ship `icon` masters from the matching dealer picture. These are used in New Game's ship
   picker; preserve each ship's relative size and recognisable silhouette at 80×50 px.
4. Add an in-game ship-detail/dealer view that uses the existing `ship.<id>.picture` assets, so
   players can inspect a ship before choosing it.

## Planet and screen coverage

1. Create the 14 `planet.<id>.surface` scenes for the Main Menu. Match each planet's orbital
   palette and flavour; keep the Journey button readable over the image.
2. Add `bg.stars.1` for the Journey map, then optional alternatives `bg.stars.2` and `bg.stars.3`.
3. Add `screen.win` and `screen.lose`, with their UI title and buttons tested for contrast.

## Character coverage

1. Create the six rival-company cards used by the New Game opponent picker.
2. Create service and Explore portraits before rare event portraits, because those screens are
   encountered most frequently.
3. Add event portraits in themed batches and check that every portrait reads clearly in the
   200×320 frame.

## Acceptance checks for every batch

- Put masters under the semantic `assets/src/gfx/` path and run `pnpm assets:build`.
- Confirm the generated manifest entry matches the screen's `img(...)` lookup.
- Preview at the actual target size with `?pack=opengaz`; verify text and controls remain legible.
- Add the path and licence to `assets/SOURCES.md`.
