# Travel-event portrait batches

Use built-in `gpt-image-2` with `assets/src/gfx/screen/title.png` as the sole style reference.
Generate each strict 2×2 sheet, take cells row-major, then crop every cell with:

```sh
magick cell.png -resize '200x320^' -gravity center -extent 200x320 -strip output.png
```

## Batch 1

```text
Create a strict 2 columns by 2 rows contact sheet of FOUR distinct tall OpenGaz random-event portraits, no text. Each cell is a clean tall 5:8 portrait with a simple saturated gradient background, thick clean edges, consistent polished 1990s cartoon sci-fi game render. Row-major exact roles: 1 Curtonian investment-cooperative agent in a suit too big, clutching abstract charts with a too-eager reassuring smile; 2 Quist, dazzling chrome-skinned salesbeing, sparkling lapel, grand sales gesture and glossy non-readable brochure; 3 The Wobbler, avant-garde performance artist with wobbly rubbery limbs, paint-splattered smock and beret, utterly serious expression; 4 Hapa Jillo, discreet saboteur-for-hire in immaculate dark suit, gloved hands and faint smirk. Make each face unique, clearly readable, and separable for later cropping. No spaceships, logos, panels, labels, watermark, or copied characters.
```

`curtonian`, `quist`, `wobbler`, `hapajillo`

## Batch 2

```text
Create a strict 2 columns by 2 rows contact sheet of FOUR distinct tall OpenGaz random-event portraits, no text. Each cell is a clean tall 5:8 portrait with a simple saturated gradient background, thick clean edges, consistent polished 1990s cartoon sci-fi game render. Row-major exact roles: 1 Limpus Relief Fleet collector in a plain volunteer tabard, holding donation tin, earnest pleading eyes; 2 Sleg, eccentric engine collector with jeweller's loupe, cradling polished antique thruster; 3 Tatilus, harried tour operator with sun visor, clipboard, whistle and three cameras, checking a watch; 4 Lord 104, robot aristocrat with brass-and-porcelain head, tiny powdered wig, monocle and ruffled cravat. Make each face unique, clearly readable, and separable for later cropping. No spaceships, logos, panels, labels, watermark, or copied characters.
```

`limpus`, `sleg`, `tatilus`, `lord104`

## Batch 3

```text
Create a strict 2 columns by 2 rows contact sheet of FOUR distinct tall OpenGaz random-event portraits, no text. Each cell is a clean tall 5:8 portrait with a simple saturated gradient background, thick clean edges, consistent polished 1990s cartoon sci-fi game render. Row-major exact roles: 1 Squowk, eccentric bird-like trader with wild plumage, mismatched goggles and arms full of unrelated merchandise, delighted; 2 Captain Leahy, weathered colony-fleet captain with peaked cap, heavy coat, kind tired eyes and manifest; 3 Mulls, retired trader with cardigan and reading glasses low on nose, one finger raised mid-lecture, comm headset; 4 Meeg Cybernetics sales android, sleek white shell, corporate posture, presenting a modular crew-station arm, fixed friendly faceplate. Make each face unique, clearly readable, and separable for later cropping. No spaceships, logos, panels, labels, watermark, or copied characters.
```

`squowk`, `leahy`, `mulls`, `meeg`

## Batch 4

```text
Create a strict 2 columns by 2 rows contact sheet of FOUR distinct tall OpenGaz random-event portraits, no text. Each cell is a clean tall 5:8 portrait with a simple saturated gradient background, thick clean edges, consistent polished 1990s cartoon sci-fi game render. Row-major exact roles: 1 Spike, a six-legged scruffy alien space mutt with enormous hopeful eyes, one bent ear and tiny cracked helmet collar; 2 space Ranger officer with peaked cap and badge, mirrored visor pushed up, ticket book and stylus, stern unimpressed frown; 3 Lady Shimmer, radiant stranded aristocrat with iridescent gown, jeweled headpiece, glittering skin and poised glamorous appeal; 4 Teal Tree, botanist on a deadline, teal-green plant-person with leafy hair, field vest full of sample tubes and potted specimen. Make each face unique, clearly readable, and separable for later cropping. No spaceships, logos, panels, labels, watermark, or copied characters.
```

`spike`, `police`, `shimmer`, `tealtree`

## Targeted corrections (2026-08-21)

These five replacements were generated individually with built-in `gpt-image-2`,
using `assets/src/gfx/screen/title.png` as the sole image/style reference. Each
prompt starts with this shared prefix:

```text
Use case: stylized-concept
Asset type: 200x320 travel-event character portrait for a retro science-fiction trading game
Input image: the provided title-screen artwork is the sole style reference. Match its polished hand-painted 1990s sci-fi game rendering, saturated jewel colors, softly modeled forms, clean silhouette, subtle airbrushed texture, and dramatic but readable lighting. Do not copy any character or composition from it.
Composition: one character only, tall 5:8 portrait, waist-up or nearly full body as appropriate, centered, generous margin, simple saturated gradient background, thick clean edges.
Constraints: entirely original OpenGaz artwork; no text, captions, logos, UI, borders, split panels, or watermark.
```

### Wobbler

```text
Primary request: Wobbler, an eccentric lime-green alien drifter wearing a loose stained short-sleeved T-shirt and a jaunty dark beret. Their anatomy is bizarre and playful: a narrow alien face, eyestalk-like details, and exactly two long flexible purple tentacle arms.
Critical anatomy: EACH tentacle arm must visibly and cleanly emerge through its own short T-shirt sleeve opening. Both sleeve cuffs must encircle the tentacles at the shoulder. Show a short segment of tentacle continuing directly from inside each sleeve. No tentacle behind the shirt, no limb piercing fabric, no empty sleeves, no human arms or hands. Expressive curled tentacle tips.
```

### Leahy

```text
Primary request: Leahy, a tired but kindly non-human alien colony-fleet captain holding a folded cargo manifest. Warm orange and ochre rubbery skin, an enormous broad bulbous head integrated into a squat torso, tiny widely spaced alien eyes, unusual folded facial anatomy, asymmetrical alien legs, one tapered prosthetic-looking foot. A small dark naval cap and heavy open captain's coat signal the occupation.
Critical identity: unmistakably an extraterrestrial creature, not a human man in makeup. No human face, human nose, human ears, moustache, beard, or realistic human skin.
```

### Police

```text
Primary request: a stern non-human alien space Ranger writing a citation. Strange orange torso with a small unusual head partly nested in a dark rounded helmet, narrow cyan side fins or ear-flaps, blue segmented flexible arms ending in spindly alien fingers, vivid yellow boots, dark blue uniform elements, badge and small ticket book.
Critical identity: unmistakably extraterrestrial anatomy and face, quirky and slightly grotesque. Not a human police officer; no human face, human skin, human ears, or realistic human proportions.
```

### Shimmer

```text
Primary request: Shimmer, a radiant mature blue alien aristocrat with stalked eyes, a tiny head, delicate alien hands, an iridescent formal garment and crystalline jewelry.
Critical silhouette: intentionally very broad and heavy through the chest and upper torso, with a prominently full, large bust beneath tasteful opaque clothing, echoing an exaggerated hourglass alien silhouette; narrow waist and slender limbs. The fuller bust is essential to the character design, but keep the portrait non-explicit, fully clothed, elegant, and non-sexualized. Do not make her slender-chested or fashion-model thin.
```

### Meeg

```text
Primary request: Meeg, a friendly alien cybernetics salesperson demonstrating a small modular mechanical crew-station arm. Clearly a living biological extraterrestrial: colorful mottled teal, violet, lime, and cobalt skin, broad soft organic head, small alien eyes, irregular fleshy neck and shoulders. Only modest cybernetic augmentation: one translucent blue visor module over an eye, a small temple implant, and a thin external cable.
Critical identity: biological alien first, augmented salesperson second. Not a robot, android, synthetic person, armored suit, metal skull, or white humanoid machine. Most of the visible body must be soft organic alien flesh.
```

### Shimmer proportion refinement

This is the final edit prompt applied to the corrected Shimmer portrait. Image 1
was `assets/src/gfx/portrait/shimmer.png` from the first correction pass; Image 2
was `assets/src/gfx/screen/title.png` as supporting style reference.

```text
Use case: precise-object-edit
Asset type: 200x320 travel-event character portrait for a retro science-fiction trading game
Input images: Image 1 is the exact edit target, the current Shimmer portrait. Image 2 is supporting style reference only.
Primary request: reduce only Shimmer's bust/chest volume to a balanced medium-full proportion, approximately one third smaller than in Image 1. She should still have a visibly fuller, heavier chest than a slender fashion-model silhouette, but it must no longer look extreme, enormous, top-heavy, or exaggerated.
Invariants: preserve the exact same blue alien character identity, stalked eyes, face, expression, mature appearance, pose, hands, narrow waist, costume design, opaque clothing, crystalline jewelry, high collar, crop, purple-blue gradient background, lighting, palette, and polished hand-painted 1990s sci-fi game rendering. Keep her fully clothed, elegant, tasteful, and non-explicit.
Composition: one centered character, tall 5:8 portrait.
Constraints: change only the chest proportion and naturally adjust the adjacent garment seams to fit; no text, logos, UI, borders, split panels, or watermark.
```
