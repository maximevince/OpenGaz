# OpenGaz — design reference

Working notes on how Gazillionaire Deluxe (1996) plays, written in our own words from the manual,
community wikis/guides, Let's-Play observations and playing the original. Numbers marked (?) are
uncertain and will be tuned by observation. This is the spec for `src/engine`.

## 1. Setup

- 1–6 human companies + 0–6 computer companies (max 7 total? original: 6 AI named companies).
- Difficulty/level: Tutorial · Novice · Beginner · Intermediate · Expert · Master. Higher = bigger
  starting Zinn debt (100k → 150k, +10k per level), tighter trade margins, smarter AI.
- Choose 7 of 14 planets (or randomize); the 7 are shuffled into 7 fixed map slots.
- Each company: name, ship (12 to pick from; all same price at a level, financed by Mr. Zinn).
- Start: 50,000 cash (Novice), Zinn loan = ship price, week 1 (year 139 A.B.).

## 2. Planets (14) — every planet in play has a stock exchange and a "special"

| Planet | Character                          | Special (Explore → Special)                                              |
| ------ | ---------------------------------- | ------------------------------------------------------------------------ |
| Vexx   | Capital, Imperial Magistrate       | petition tariffs/passenger tax down (rare, may backfire; may wipe owed)  |
| Zile   | Merchants, home of Mr. Zinn        | favour: -1 % rate / +credit / forgive part of debt / extra loan / refuse |
| Stye   | Trader's Union HQ                  | lobby: lower TU rate, raise bank rate (≤2 %), +credit, forgive part      |
| Frac   | Voyager's Insurance HQ             | premium review ± / refund                                                |
| Bass   | Stock analysts                     | broker: trend info for all exchanges                                     |
| Hork   | Media capital                      | publicity stunt: small cash +/-; mostly flavour                          |
| Xeen   | Junkyard, mechanics                | buy permanent +10 t cargo / +1 seat / +5 t fuel / turbo                  |
| Pyke   | Industrial, L-Tech engines         | buy engine +1 kuarp (5k–30k+); sometimes unavailable                     |
| Nosh   | Fuel depot                         | Zobrok fuel discount (10 % + roll/2 %)                                   |
| Loro   | Pleasure planet                    | crew shore leave: wages forgiven / salary cut; small chance of a fine    |
| Mira   | Religion, Quaso Mutta, Grand Sages | blessing raises luck; already blessed → risk of curse                    |
| Ooom   | Fortune tellers                    | pay to learn your luck; occasionally cash                                |
| Tilo   | Casinos                            | 50/50 wager ≤5 % cash, one double-or-nothing                             |
| Queg   | Smugglers, Lady Cornucopia         | one commodity offered ≤ market price                                     |

Map: black starfield, 7 slots + decorative galaxy. Slot coords (grid units) approx:
(20,0) (14,6) (11,13) (8,3) (3,10) (21,11) (0,1). Distance in "million kuters".
Travel time ∝ distance / engine speed (kuarps): `time = dist*5 / kuarps` (?).
**Turn order each week = arrival order** (faster/closer arrives first, buys first).

## 3. Commodities (18 in pool; a game uses ~7–11)

Price band: min = 5·n, max = 8·min. 1 unit = 1 ton.
Cantaloupe 5–40 · Jelly Beans 10–80 · Moon Ferns 15–120 · Frog Legs 20–160 · Whip Cream 25–200 ·
Babel Seeds 30–240 · Diapers 35–280 · Umbrellas 40–320 · Toasters 45–360 · Polyester 50–400 ·
Hair Tonic 55–440 · Lava Lamps 60–480 · Oxygen 65–520 · Oggle Sand 70–560 · Kryptoons 75–600 ·
X Fuels 80–640 · Gems 85–680 · Exotic 90–720. Cheap goods are more plentiful.
Each planet has a per-commodity **supply rating 0–100 %** (Supply chart) drifting weekly; low
supply → high price. Commodity advertising adds tons to the destination's stock (shared pool).
Marketplace columns: Tons on Ship | Tons on <planet> | Price You Paid (avg) | Market Price |
Price Range. Full refund if you sell back what you just bought (same visit).

## 4. Ships (12)

| Ship           | Cargo t | Pax | Fuel t | Kuarps | Crew |
| -------------- | ------- | --- | ------ | ------ | ---- |
| Stinger XII    | 100     | 8   | 20     | 7      | 4    |
| Fly Catcher    | 120     | 8   | 40     | 5      | 5    |
| Le Rock        | 80      | 8   | 65     | 5      | 3    |
| Whaler 2000    | 130     | 11  | 50     | 2      | 6    |
| Retina         | 100     | 6   | 40     | 5      | 3    |
| Cerebralis     | 100     | 8   | 40     | 5      | 4    |
| The Globulizer | 80      | 7   | 30     | 7      | 4    |
| Locomotis      | 110     | 5   | 40     | 6      | 4    |
| Mantagon       | 90      | 10  | 40     | 4      | 3    |
| Kegger         | 150     | 1   | 35     | 3      | 2    |
| Worm Shuttle   | 75      | 16  | 30     | 6      | 12   |
| Squidocity     | 110     | 8   | 40     | 6      | 6    |

Ship "mass" 400 t class; upgrade offers/auctions to a bigger class: base capacities +50 %, crew
+50 % (rounded up), ads/insurance/fuel usage scale up, +25k credit limit. Insurance risk class per
ship (Le Rock/Worm low … Kegger high).

## 5. Weekly loop (one turn = one kuku week)

On a planet, in any order: Marketplace · Supply chart · Warehouse · Pick up passengers (set ticket
price) · Advertise for next planet (passenger + commodity, one week only) · Crew wages · Taxes ·
Insurance (next trip only) · Explore (Special / Weather Bureau / News / Ministry of Time /
Histories) · Stock exchange (local only) · Money & graphs · Bank · Trader's Union loan · Zinn's loan
· Fuel · File. Then **Journey** → pick destination → flight → 0–2 travel events → arrival: reports
(facility fees, auction results, news/economic notice, stock crashes, rivals), passengers pay
(taxed), cargo sellable. Interest, wages, taxes accrue per week.

## 6. Economy numbers (Novice baseline)

- Bank 1 %/wk (Stye can raise to 2 %). Trader's Union loan 5 %/wk, credit limit 100,000.
  Zinn 4 %/wk, limit 200,000. Exceed either limit → bankrupt (lose). Shortfalls auto-borrow from TU.
- Taxes: import tariff 3 %, export tariff 2 %, passenger tax 15 % (rates change via news). Unpaid
  taxes accrue → audit + fine. Goods left in a warehouse pay no tariff.
- Crew: 1,500/person/week accrues; unpaid → strike risk (pay all + raise). Union may demand +100.
- Passengers: ticket 100–10,000 (default 1,000). Waiting ≈ (rand(0..seats) + rand(ad/4..ad)) ·
  1000/price with harsh drop-off above ~4,000; capped by seats; income taxed 15 %.
- Advertising tiers: None 0 · Fliers 1k · Newspaper 2k · Magazine 3k · Radio 4k · TV 5k ·
  Everything 10k, scaled by ship class; separate passenger/commodity budgets; commodity ads add
  ≈ spend/50 tons at destination.
- Fuel: price 200–2,000/t varies by planet/week; usage ≈ rnd(1,dist/2)+rnd(1,tons/100) per trip;
  empty tank → very expensive emergency refuel.
- Insurance: 15–15,000 per trip, covers next trip only, reimburses covered losses (not fines,
  gambling, wages, loans, taxes).
- Warehouse: 50 t free per planet; expansions offered by events (15k–50k, +25k credit).
- Facilities: from ~week 11 the Emperor auctions government facilities (secret bids); owner earns
  a landing fee from every other company visiting, collected when the owner lands there.
- Stock: one exchange per planet, trade only where you are; prices start ~1,000–1,700; 1 %
  commission; max 50 % of cash per week and one buy per week; weekly move 1–10 % with momentum
  (bull/bear streaks); below ~250 tends to slide to 0 = crash (shares lost, reopens later at 1,000).
- Luck: hidden good-event probability 15–85 %, streaky; Mira/Ooom/insurance interact.
- Weekly global roll: harvest glut/shortage, tariff/tax rate change, fuel shock, nothing.

## 7. Events (travel) — catalogue to fill in `src/engine/data/events.ts`

Neutral: ship auction, facility auction, Quaso Mutta detour warning.
Good/offers (~45): bigger ship offer, warehouse expansion, crew forgives wages, tax break, free
engine, insurance lowered, rate cuts, credit raise, inheritance, lottery, shady cargo deals
(Scooter Jay ×4 w/ 20 % caught, Hands exotic swap), loans/scams (Curtonian, Quist), art gamble
(Wobbler), sabotage rivals (Brow), rigged coin flip (Yoyo), charity blessing, engine trade, royal
visitor, monk gift, share buyers/sellers (R.J. Raffety +15 %, Nebbit −20 %), Tatilus pays per empty
seat, Lord 104 buys cargo ×3, Nectum cheap exotic, Squowk swap, Mulls advice, Teeter upgrade, Meeg
automation, Spike mutt, Nibble bully, Speevak dump fine, Hapa Jillo sabotage, hitch-hikers that
redirect (Snoz Lombardo, Lady Shimmer, Teal Tree), Stubbs water buyer, Gurttle buys fuel, Leahy
buys cargo ×2, shortcut.
Bad (~20): Dred donation, warehouse fire, insurance raised, rate hikes, lawsuit, union demand, Zinn
"pay half now", rebels/smugglers/bandits/pirates (Chichi Bobo, Darleen, Baid-Rowel, Mooglers, Fez
Fa Fa, Hungo, Cylet Mind Buggers, Lippo Jungies, Wicky Wicks, Bro Nap), meteor/solar storm,
hurricane, typhoon, gases/weeds/juice/vapour, whirlpool, Bobble Warp, rotten/defective goods,
breakdown, fuel leak, asteroid, hold overheats, wrong destination, delays.
Each has insured/uninsured variants where relevant.

## 8. Characters

Emperor/Supreme Commander Dred Nicolson (crowned pink pig-alien). Mr. Zinn (orange financier,
Zile; enforcer Nibble). Trader's Union official (green, three-eyed), bank manager, tax auditor
(purple octopus), insurance agent, magistrate, stock broker, mechanic (Xeen), L-Tech salesman
(Pyke), Zobrok (Nosh), Grand Sages, soothsayers, Lady Cornucopia, weather man, Kuku News anchor,
your pilot. Rival companies: Gizzy Shipping (chaotic), Trading Corp. IV (by-the-book), Vandergriff
Ltd. (cautious), Puffer Inc. (naïve, learns), Roke Transport (risk-taker), Hoff Meister (ruthless).

## 9. Win / lose

Win: first to the target net worth (e.g. 1,000,000 at Novice; per level). Net worth = cash + bank +
shares − loans. Lose: exceed TU or Zinn credit limit → bankruptcy. No week limit.

## 10. Screens (640×480, Win3.1 look)

Periwinkle background, chunky bevelled buttons, cyan/yellow value plates, green marketplace grid.
Main menu: left column planet picture + "Journey (Leave X)", Stock Market / Money / Bank / Loan /
Zinn's Loan buttons; centre company banner, Marketplace / Supply / Warehouse icons, green rows
Pickup Passengers / Advertise / Crew Wages Owed / Taxes Owed / Insurance / Explore Planet / File
Options; right: fuel cost + vertical red tank gauge + Help hand.
Service screens = portrait card left + title plate + 4–5 value plates + button row.
Galaxy map: planets on starfield, "Return to Main Menu / Help". Stock: black screen, red line
chart 16 weeks. Money: net worth plates + icon bar (Company History / Net Worth bars / Market
Strength pie / Computer Players / Ship Info). Events: coloured full-screen dialogs.

### Fitting the stage to a screen

Everything is laid out for 640×480; `src/ui/Stage.svelte` scales that stage uniformly to fit the
visible viewport and centres it, letterboxing the rest in black. The available area is _measured_
(a `ResizeObserver` on a `100dvh`, safe-area-padded box) rather than taken from
`window.innerWidth/Height`, which on mobile browsers describes the viewport behind the collapsible
toolbars and pushed part of the stage off screen. `src/ui/stage.ts` holds the pure fit maths.
Portrait screens can optionally turn the stage a quarter-turn (`Rotate to fill`, remembered in
`localStorage`) when that buys a meaningfully bigger picture.

## 11. Asset packs

The UI resolves images/sounds through an **asset pack** abstraction:

- `opengaz` (default, in `assets/` → `public/assets/`): recreated artwork, CC BY-SA 4.0; sound
  presets, GPL.
- `original` (dev-only, `public/original/`, git-ignored, imported with `pnpm assets:original`
  from the owner's CD): used only to speed up early UI work; if the folder is missing the app
  silently falls back to `opengaz`/placeholders. Never committed or deployed (CI guard).

## 12. Roadmap / status

- [x] M0 bootstrap (Vite + Svelte 5 + TS, CI, Pages workflow, asset packs)
- [x] M1 engine core (deterministic reducer, economy, AI, save/link) — `src/engine`
- [x] M2 playable UI (all main screens on the 640×480 stage)
- [x] M3 parity: 14 planet specials, ~45 travel events, auctions (facilities, ship upgrades),
      warehouse lottery, tax audits, help texts, weather, histories
- [x] M4 hot-seat + play-by-link
- [~] M5 assets: procedural SVG placeholders + ZzFX synth sounds shipped; recreated art/sound pipeline and prompt sheets in `docs/ASSETS.md`, images still to generate
  (`assets/` + `SOURCES.md`); no sound yet
- [x] M6a online P2P rooms (Trystero) — `src/net/online.svelte.ts`
- [ ] M6b optional hosted rooms (Cloudflare Worker + Durable Object) for async turns
- [ ] Balance pass against the original (run it in DOSBox-X side by side); tutorial mode; shortcuts
      (right-click); Bass broker tips are basic; AI opponents could be smarter/more distinct

Balance sim: `SIM=1 SIM_N=30 pnpm vitest run sim --reporter=verbose --silent=false`.
