# Portraits

Bust portrait of a cartoon alien, big expressive eyes, exaggerated features, facing camera, plain vertical gradient background (colour by mood: navy=good, red=bad, green=neutral, or grey), master 640×1024 → 200×320.

## Recovered contact-sheet workflow (use for new portraits)

The established OpenGaz portrait set was generated as multi-character sheets and then cropped,
not as standalone high-resolution renders. This is essential to its visual consistency.

- Tool/model: built-in image generation (`gpt-image-2`).
- Style reference: `assets/src/gfx/screen/title.png` (style only; never copy pixels or subjects).
- Generate a strict grid of tall 5:8 cells. Crop each cell, then use ImageMagick:
  `-resize '200x320^' -gravity center -extent 200x320 -strip`.
- Save the cropped master directly at `assets/src/gfx/portrait/<id>.png`, then run
  `pnpm assets:build`.

### Missing-portrait batch (`pilot`, `peelia`, `ltech`, `sooth`)

Exact prompt (with the title screen supplied as the sole reference image):

```text
Create a strict 2 columns by 2 rows contact sheet of FOUR distinct tall OpenGaz portraits, no text. Each cell is a clean tall 5:8 portrait with a simple saturated gradient background, thick clean edges, consistent polished 1990s cartoon sci-fi game render. Row-major exact roles: 1 your ship's confident alien pilot with aviator goggles, flight jacket and headset; 2 Peelia Veelia, a warm banana-yellow alien beach-resort hostess with round sunglasses, tropical flower and luminous blue drink; 3 proud L-Tech engine engineer in a clean lab coat and safety goggles, holding a small glowing thruster prototype; 4 mysterious soothsayer in a hooded shawl with big hoop earrings and a glowing crystal ball. Make each face unique, clearly readable, and separable for later cropping. No spaceships, logos, panels, labels, watermark, or copied characters.
```

Cell order is row-major: `pilot`, `peelia`, `ltech`, `sooth`.

### Original service-batch pattern

Use this wording as the template for comparable future service portraits (again with the title
screen as the sole reference):

```text
Create a strict 5 columns by 2 rows contact sheet of TEN DISTINCT original cartoon alien bust portraits for OpenGaz, no text anywhere. Every cell is a tall portrait with a simple saturated gradient background, thick clean edges, consistent polished 1990s sci-fi game render. Row-major exact roles: <roles>. Make each face unique and clearly readable for later cropping. No spaceships, logos, panels, labels, watermark, or copied characters.
```

- `portrait.union`: clerk of the Trader's Union, visor and ledger, patient.
- `portrait.bank`: banker, pin-stripe, gold monocle, smug.
- `portrait.zinn`: Mr. Zinn, silky money lender, wide grin, too many teeth, cigar.
- `portrait.insurance`: insurance agent, briefcase, umbrella, reassuring.
- `portrait.tax`: tax collector, sour face, rubber stamp, quill.
- `portrait.crew`: crew representative, greasy overalls, cap, tired but cheerful.
- `portrait.broker`: stock broker, headset, three phones, twitchy.
- `portrait.dealer`: used-spaceship dealer, loud jacket, thumbs up.
- `portrait.pilot`: your pilot, aviator goggles, confident.
- `portrait.news`: news anchor, big hair, microphone.
- `portrait.weather`: weather forecaster pointing at a map, umbrella.
- `portrait.warehouse`: warehouse foreman, clipboard, forklift keys.
- `portrait.clock`: Ministry of Time official, many wristwatches, hourglass.
- `portrait.history`: archivist, dusty robe, enormous book.
- `portrait.mechanic`: brilliant junkyard mechanic, wrench, goggles, soot.
- `portrait.sooth`: soothsayer, crystal ball, hoop earrings, mysterious.
- `portrait.ltech`: engine engineer in a lab coat, glowing thruster prototype.
- `portrait.casino`: croupier, bow tie, chips, sly.
- `portrait.dred`: Emperor Dred Nicolson, tiny crown, ermine, petulant.
- `portrait.magistrate`: Imperial Magistrate, powdered wig, gavel, bored.
- `portrait.police`: space police officer, badge, ticket book, stern.
- `portrait.repair`: repair robot with welding torch, friendly.
- `portrait.meteor`: a flaming meteor with a face, screaming.
- `portrait.storm`: an ion storm cloud with an angry face and lightning.
- `portrait.fire`: engine-room fire, panicked crew member with extinguisher.
- `portrait.bandits`: space bandit, bandana, eyepatch, blaster, grinning.
- `portrait.pirates`: space pirate captain, tricorn hat, hook, parrot-bot.
- `portrait.rebels`: rebel fighter, headband, ragtag uniform, defiant.
- `portrait.snoz`: Snoz, sniffly alien salesman with an enormous nose.
- `portrait.zobrok`: Zobrok, hulking blue debt collector, knuckles.
- `portrait.peelia`: Peelia, banana-yellow alien socialite, sunglasses.
- `portrait.cornucopia`: Lady Cornucopia, smuggler queen, feathered hat, jewels.
- `portrait.scooter`: Scooter, hyperactive delivery kid on a hover-scooter.
- `portrait.nectum`: Nectum, oozing green alien selling suspicious goods.
- `portrait.yoyo`: Yoyo, hypnotist with a spinning yoyo, spiral eyes.
- `portrait.sabotage`: shadowy saboteur with a spanner and dynamite, sneaking.
- `portrait.gurttle`: Gurttle, jolly turtle-like tavern keeper with a mug.
- `portrait.quaso`: Quaso Mutta, silent hooded sage, one finger raised.

## Rival companies (`portrait.op1..op6`, 1024×640 → 320×200)

- `portrait.op1`: company crest / logo card for "Gizzy Shipping" (name may be rendered by us later; do not generate text), chaotic, wobbly, confetti, mascot creature, badge shape.
- `portrait.op2`: company crest / logo card for "Trading Corp. IV" (name may be rendered by us later; do not generate text), by the book, square, corporate blue, mascot creature, badge shape.
- `portrait.op3`: company crest / logo card for "Vandergriff Ltd." (name may be rendered by us later; do not generate text), cautious, old-money, oak and brass, mascot creature, badge shape.
- `portrait.op4`: company crest / logo card for "Puffer Inc." (name may be rendered by us later; do not generate text), naive, puffy fish mascot, pastel, mascot creature, badge shape.
- `portrait.op5`: company crest / logo card for "Roke Transport" (name may be rendered by us later; do not generate text), risky, racing stripes, flames, mascot creature, badge shape.
- `portrait.op6`: company crest / logo card for "Hoff Meister" (name may be rendered by us later; do not generate text), ruthless, black and red, sharp angles, mascot creature, badge shape.
