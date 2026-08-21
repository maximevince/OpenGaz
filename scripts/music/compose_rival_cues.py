"""Author three OpenGaz cues as score masters. Our own material, GPL/CC BY-SA."""
import json, random
N = {'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11}
def p(s):  # "A#3" -> midi
    name, octv = s[:-1], int(s[-1])
    return (octv + 1) * 12 + N[name]
def part(name, notes): return {"name": name, "notes": notes}
def n(beat, length, pitch, vel=None):
    d = {"beat": round(beat, 4), "len": round(length, 4), "pitch": pitch if isinstance(pitch, int) else p(pitch)}
    if vel: d["vel"] = vel
    return d
def save(path, title, bpb, parts, note):
    span = max(x["beat"] + x["len"] for pt in parts for x in pt["notes"])
    json.dump({"title": title, "composer": "OpenGaz (original composition)", "note": note,
               "beatsPerBar": bpb, "bars": round(span / bpb, 2), "parts": parts},
              open(path, "w"), separators=(",", ":"))
    print(f"{path}: {len(parts)} parts, {sum(len(x['notes']) for x in parts)} notes, {span/bpb:.0f} bars")

KICK, SNARE, STICK, HAT, HATO, RIDE, CRASH, TOMLO, TOMHI, TAMB = 36, 38, 37, 42, 46, 51, 49, 41, 47, 54

RNG = random.Random(20260821)  # seeded: same score every build


def human(notes, timing=0.012, vel=9, seed=None):
    """Nudge timing and velocity per stroke.

    A soundfont retriggering one snare sample at one velocity is what makes a fast roll sound
    like a machine gun. Spreading the strokes over a few velocity layers and a few milliseconds
    is what a pair of hands does anyway.
    """
    rng = random.Random(seed) if seed is not None else RNG
    for x in notes:
        x["beat"] = round(max(0.0, x["beat"] + rng.uniform(-timing, timing)), 4)
        if "vel" in x:
            x["vel"] = int(min(126, max(18, x["vel"] + rng.randint(-vel, vel))))
    return sorted(notes, key=lambda x: x["beat"])
DEST = "/home/vinz/Projects/gaz-clone/assets/src/music/scores/"

# ---------------------------------------------------------------- op2: jazz
# 136 bpm, D minor, walking bass under 7th-chord comping and a muted-trumpet head.
BARS = 16
prog = ["Dm7", "Gm7", "A7", "Dm7", "Bbmaj7", "Gm7", "A7", "Dm7"]
walk = {  # one bar of quarter notes per chord, ending on a chromatic approach
    "Dm7":      ["D2", "F2", "A2", "B2"],
    "Gm7":      ["G2", "A#2", "D3", "C#3"],
    "A7":       ["A1", "C#2", "E2", "G2"],
    "Bbmaj7":   ["A#1", "D2", "F2", "F#2"],
}
voic = {  # right-hand shell voicings, 3rd and 7th plus colour
    "Dm7":    ["F3", "C4", "A4"],
    "Gm7":    ["A#3", "F4", "D5"],
    "A7":     ["C#4", "G4", "E5"],
    "Bbmaj7": ["D4", "A4", "F5"],
}
head = [  # muted trumpet: a short riff, then rest, so the cue breathes
    (0.5, 0.5, "D5"), (1.0, 0.5, "F5"), (1.5, 1.0, "E5"), (3.0, 1.0, "D5"),
    (4.5, 0.5, "A#4"), (5.0, 0.5, "D5"), (5.5, 1.5, "C5"),
    (8.5, 0.5, "E5"), (9.0, 0.5, "G5"), (9.5, 1.0, "F5"), (11.0, 1.0, "D5"),
    (12.5, 0.5, "A4"), (13.0, 0.5, "C5"), (13.5, 2.0, "D5"),
]
bass, piano, tpt, drums = [], [], [], []
for bar in range(BARS):
    ch = prog[bar % len(prog)]
    b0 = bar * 4
    for i, note in enumerate(walk[ch]):
        bass.append(n(b0 + i, 0.92, note, 124 if i == 0 else 116))
    for off in (1.5, 3.5):  # comp on the and-of-2 and and-of-4
        for note in voic[ch]:
            piano.append(n(b0 + off, 0.45, note, 52))
    for i in range(4):  # ride pattern: swung eighths on 2 and 4
        drums.append(n(b0 + i, 0.2, RIDE, 56 if i % 2 == 0 else 46))
        if i in (1, 3):
            drums.append(n(b0 + i + 0.66, 0.2, RIDE, 44))
            drums.append(n(b0 + i, 0.2, SNARE, 54))
    drums.append(n(b0, 0.2, KICK, 62))
    drums.append(n(b0 + 2.5, 0.2, KICK, 52))
    if bar % 8 == 7:
        drums.append(n(b0 + 3, 0.2, CRASH, 66))
for start, length, note in head:
    tpt.append(n(start, length, note, 78))
    tpt.append(n(start + 32, length, note, 78))  # restate an eight-bar phrase later
drums = human(drums, timing=0.014, vel=8)
bass = human(bass, timing=0.010, vel=6)
save(DEST + "opengaz-op2-jazz.json", "Rival theme — Trading Corp. IV (jazz)", 4,
     [part("bass", bass), part("piano", piano), part("trumpet", tpt), part("drums", drums)],
     "Original OpenGaz composition: walking bass in D minor under shell voicings and a muted-trumpet head.")

# ---------------------------------------------------------------- op3: drum band
# No pitched material at all. Three takes of the same idea, differing in how the rolls are built —
# a soundfont has one snare sample, so density and stroke shape are what stop it sounding synthetic.
def drum_band(style):
    drums = []

    def roll(b0, beats, step, vel, accent_every=4):
        """Double-stroke roll: every second stroke is a softer rebound, as a pair of hands gives."""
        for i in range(int(beats / step)):
            v = vel + (22 if i % accent_every == 0 else 0) - (14 if i % 2 else 0)
            drums.append(n(b0 + i * step, step * 0.9, SNARE, min(120, max(20, v))))

    def flam(b0, vel):
        """Grace note a hair before the beat — two different velocities, so two different samples."""
        drums.append(n(b0 - 0.045, 0.1, SNARE, max(20, vel - 45)))
        drums.append(n(b0, 0.2, SNARE, vel))

    for bar in range(12):
        b0 = bar * 4
        if style == "tight":                     # take A: as before, now double-stroked
            if bar % 4 in (0, 2):
                roll(b0, 2, 0.125, 62)
                for i, off in enumerate((2.0, 2.5, 3.0, 3.5)):
                    drums.append(n(b0 + off, 0.2, SNARE, 104 if i % 2 == 0 else 84))
            elif bar % 4 == 1:
                roll(b0, 4, 0.0625, 58, accent_every=8)
            else:
                for off in (0, 0.75, 1.5, 2.0, 3.0, 3.5):
                    drums.append(n(b0 + off, 0.2, SNARE, 112))
                drums.append(n(b0 + 2.5, 0.2, TOMHI, 100))
                drums.append(n(b0 + 3.75, 0.2, TOMHI, 96))
        elif style == "open":                    # take B: 16ths at most, flams, room to breathe
            if bar % 4 in (0, 2):
                roll(b0, 1.5, 0.25, 70)
                flam(b0 + 2, 112)
                drums.append(n(b0 + 2.5, 0.2, SNARE, 86))
                flam(b0 + 3, 106)
                drums.append(n(b0 + 3.5, 0.2, SNARE, 80))
            elif bar % 4 == 1:
                roll(b0, 3, 0.125, 66)
                flam(b0 + 3, 116)
            else:
                for off in (0, 0.75, 1.5, 2.5):
                    flam(b0 + off, 110)
                drums.append(n(b0 + 3, 0.25, TOMHI, 104))
                drums.append(n(b0 + 3.5, 0.25, TOMLO, 100))
        else:                                    # take C: parade — accents and toms, barely any roll
            for off in (0, 1, 2, 3):
                flam(b0 + off, 114 if off in (0, 2) else 96)
            if bar % 2:
                drums.append(n(b0 + 1.5, 0.2, SNARE, 78))
                drums.append(n(b0 + 3.5, 0.25, TOMLO, 102))
                drums.append(n(b0 + 3.75, 0.25, TOMHI, 98))
            else:
                roll(b0 + 3, 1, 0.25, 74)
        for beat in ((0,) if bar % 2 else (0, 2)):
            drums.append(n(b0 + beat, 0.3, KICK, 70))
        drums.append(n(b0 + 1, 0.3, STICK, 84))
        if bar % 4 == 0:
            drums.append(n(b0, 0.5, CRASH, 96))
    return human(drums, timing=0.013, vel=11, seed=hash(style) % 10000)


for style, suffix, label in (("tight", "", "tight rolls"), ("open", "-open", "16ths and flams"),
                             ("parade", "-parade", "accents, almost no roll")):
    save(DEST + f"opengaz-op3-drums{suffix}.json",
         f"Rival theme — Vandergriff Ltd. (drum band, {label})", 4,
         [part("drums", drum_band(style))],
         "Original OpenGaz composition: military drum band, no pitched material.")

# ---------------------------------------------------------------- op5: bass groove
# 123 bpm, E minor pentatonic. The original is 82 % bass energy, so the top stays sparse.
riff = [  # (beat within the bar, length, note) — syncopated, root-heavy
    (0.0, 0.5, "E1"), (0.75, 0.25, "E1"), (1.5, 0.5, "G1"), (2.0, 0.5, "A1"),
    (2.75, 0.25, "A1"), (3.0, 0.5, "E1"), (3.5, 0.5, "D2"),
]
riff_b = [
    (0.0, 0.5, "E1"), (0.75, 0.25, "E1"), (1.5, 0.5, "G1"), (2.0, 0.5, "B1"),
    (2.75, 0.25, "A1"), (3.25, 0.75, "G1"),
]
bass, keys, drums = [], [], []
for bar in range(14):
    b0 = bar * 4
    for off, length, note in (riff_b if bar % 4 == 3 else riff):
        bass.append(n(b0 + off, length, note, 104 if off == 0 else 92))
    drums.append(n(b0, 0.25, KICK, 106))
    drums.append(n(b0 + 2.5, 0.25, KICK, 92))
    drums.append(n(b0 + 1, 0.25, SNARE, 96))
    drums.append(n(b0 + 3, 0.25, SNARE, 96))
    for i in range(8):
        drums.append(n(b0 + i * 0.5, 0.2, HAT, 58 if i % 2 else 70))
    if bar % 4 == 3:
        drums.append(n(b0 + 3.5, 0.25, TOMLO, 92))
    if bar >= 1 and bar % 2 == 0:  # clavinet from bar two, still out of the riff's way
        for off in (1.5, 3.25):
            for note in ("E4", "G4", "B4"):
                keys.append(n(b0 + off, 0.3, note, 74))
    if bar >= 3 and bar % 2 == 1:
        for note in ("D4", "G4"):
            keys.append(n(b0 + 2.5, 0.4, note, 68))
drums = human(drums, timing=0.008, vel=7)
bass = human(bass, timing=0.006, vel=5)
save(DEST + "opengaz-op5-groove.json", "Rival theme — Roke Transport (bass groove)", 4,
     [part("bass", bass), part("clav", keys), part("drums", drums)],
     "Original OpenGaz composition: E minor pentatonic bass riff, drums, sparse clavinet stabs.")
