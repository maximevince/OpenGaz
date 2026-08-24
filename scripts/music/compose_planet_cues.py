#!/usr/bin/env python3
"""
Write all fourteen planet themes.

None of the 1996 planet cues is repertoire music. Measured, they are 1990s library production
cues: bass-and-drums grooves, synth beds, one ambient pad and one bright toccata-ish figure. Each
cue below takes its tempo, register, density and harmonic colour from the measured original, and
its own material.

Tempo per planet comes from scripts/music/analyse_cue.py, which resolves the metrical octave
instead of reporting whichever level the autocorrelation liked.
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from notation import (AGOGO, CONGAHI, CONGALO, COWBELL, CRASH, HAT, HATO, HATP, KICK, RIDE,
                      RIDEBELL, SHAKER, SNARE, STICK, TAMB, TOMHI, TOMLO, TOMMID, TRIANGLE,
                      human, n, part, save)

DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..",
                    "assets", "src", "music", "scores")
out = lambda name: os.path.join(DEST, name)


def kit(bars, kick, snare, top_step=0.5, top_vel=70, top=HAT, extra=None, open_last=True):
    ev = []
    for bar in range(bars):
        b0 = bar * 4
        for off in kick:
            ev.append(n(b0 + off, 0.25, KICK, 108))
        for off in snare:
            ev.append(n(b0 + off, 0.25, SNARE, 100))
        i = 0
        while i * top_step < 4:
            at = i * top_step
            piece = HATO if (open_last and top is HAT and abs(at - (4 - top_step)) < 1e-6) else top
            ev.append(n(b0 + at, 0.2, piece, top_vel + (14 if at % 1 == 0 else 0)))
            i += 1
        if extra:
            ev.extend(extra(bar, b0))
    return ev


def lay(bars, pattern, per_bar=None):
    ev = []
    for bar in range(bars):
        b0 = bar * 4
        for off, length, pitch, vel in (per_bar(bar) if per_bar else pattern):
            ev.append(n(b0 + off, length, pitch, vel))
    return ev


def echo(notes, taps=((0.75, 0.5), (1.5, 0.26)), keep=lambda x: True):
    """Delay taps written into the score — a soft repeat, then a softer one."""
    ev = list(notes)
    for x in notes:
        if not keep(x):
            continue
        for delay, gain in taps:
            v = int(x.get("vel", 80) * gain)
            if v > 16:
                ev.append(n(x["beat"] + delay, x["len"] * 1.2, x["pitch"], v))
    return ev


def pad(chords, bar_len=4.0, vel=64, start=0.0):
    """One sustained chord per entry — for cues with no rhythm section at all."""
    ev = []
    for i, chord in enumerate(chords):
        at = start + i * bar_len
        for note in chord:
            ev.append(n(at, bar_len * 0.98, note, vel))
    return ev


# ══════════════════════════════════════════════════ tilo — casinos · 133 bpm · 72 % bass
BARS = 18
tilo_bass = lay(BARS, None, per_bar=lambda b: (
    [(0, .5, "E1", 112), (.75, .25, "E1", 92), (1.5, .5, "E1", 100),
     (2.0, .5, "B1", 104), (2.75, .25, "E1", 90), (3.25, .75, "D2", 98)] if b % 2 == 0 else
    [(0, .5, "B1", 110), (.75, .25, "B1", 90), (1.5, .5, "D2", 98),
     (2.0, .5, "E2", 104), (3.0, 1.0, "B1", 96)]))
tilo_keys, tilo_brass = [], []
for bar in range(BARS):
    b0 = bar * 4
    chord = ("E3", "G3", "B3") if bar % 2 == 0 else ("F#3", "A3", "C#4")
    for off in (1.5, 2.75):
        tilo_keys += [n(b0 + off, .3, x, 70) for x in chord]
    if bar % 2 == 1:                       # a punch every other bar, in eighths
        tilo_brass += [n(b0 + o, .22, x, 96) for o, x in
                       ((2.0, "E4"), (2.5, "G4"), (3.0, "B4"), (3.5, "A4"))]
    if bar % 4 == 3:                       # and a run into the turn
        tilo_brass += [n(b0 + o, .22, x, 100) for o, x in
                       ((0, "B4"), (.5, "A4"), (1.0, "G4"), (1.5, "F#4"),
                        (2.0, "E4"), (2.5, "G4"), (3.0, "B4"), (3.5, "D5"))]
save(out("opengaz-tilo-casino.json"), "Planet theme — Tilo (casino floor)", 4,
     [part("bass", human(tilo_bass, .008, 6, 11)), part("keys", human(tilo_keys, .010, 8, 12)),
      part("brass", human(tilo_brass, .012, 8, 13)),
      part("drums", human(kit(BARS, (0, 2.5), (1, 3), .5, 74,
                              extra=lambda b, b0: [n(b0, .5, CRASH, 92)] if b % 8 == 0 else []),
                          .010, 9, 14))],
     "Original OpenGaz composition: casino vamp in E minor, brass punches on the turn.")

# ══════════════════════════════════════════════════ bass — analysts · 135 bpm · 77 % bass
# Measured: a B♭ riff with G and C neighbours, 58 ms attack (plucked), notes about a sixteenth
# long, and no lead instrument. So: bass guitar and kit, nothing else out front.
BARS = 17
FIG = [(0, .45, "A#1", 118), (.5, .2, "A#1", 96), (.75, .2, "A#2", 88), (1.0, .45, "G1", 110),
       (1.5, .2, "G1", 94), (2.0, .45, "A#1", 114), (2.5, .2, "A#1", 92), (2.75, .2, "C2", 98),
       (3.0, .45, "C2", 108), (3.5, .2, "A#1", 96), (3.75, .2, "F1", 100)]
FIG_B = [(0, .45, "A#1", 118), (.5, .2, "A#1", 96), (1.0, .45, "D#2", 108), (1.5, .2, "D2", 96),
         (2.0, .45, "C2", 112), (2.5, .2, "C2", 92), (3.0, .9, "G1", 110), (3.75, .2, "A#1", 96)]
bass_bass = lay(BARS, None, per_bar=lambda b: FIG_B if b % 4 == 3 else FIG)
bass_stab = []
for bar in range(BARS):
    if bar >= 4 and bar % 4 == 1:
        b0 = bar * 4
        bass_stab += [n(b0 + 2.5, .25, x, 60) for x in ("A#3", "D#4", "F4")]
save(out("opengaz-bass-analysts.json"), "Planet theme — Bass (stock analysts)", 4,
     [part("bass", human(bass_bass, .007, 6, 21)), part("keys", human(bass_stab, .010, 7, 22)),
      part("drums", human(kit(BARS, (0, 1.5, 2.5), (1, 3), .5, 72), .008, 8, 24))],
     "Original OpenGaz composition: B flat bass-guitar riff in sixteenths, kit, no lead.")

# ══════════════════════════════════════════════════ hork — media · 158 bpm · 81 % bass
# The original counts at 79 but its kit plays sixteenths; at the level a listener taps, it is 158.
BARS = 16
hork_bass = lay(BARS, None, per_bar=lambda b: (
    [(0, .4, "G1", 116), (.5, .2, "G2", 88), (1.0, .4, "G1", 104), (1.5, .2, "G2", 86),
     (2.0, .4, "E1", 112), (2.5, .2, "E2", 88), (3.0, .4, "D1", 108), (3.5, .4, "D2", 92)]
    if b % 2 == 0 else
    [(0, .4, "G1", 116), (.5, .2, "G2", 88), (1.0, .4, "C2", 106), (1.5, .2, "C1", 86),
     (2.0, .4, "A#1", 110), (2.5, .2, "A#1", 88), (3.0, .9, "G1", 112)]))
hork_lead = []
for bar in range(BARS):
    b0 = bar * 4
    if bar % 4 == 2:
        hork_lead += [n(b0 + o, l, x, 88) for o, l, x in
                      ((0, .75, "G5"), (1.0, .5, "A#5"), (1.75, 1.25, "G5"))]
    if bar % 8 == 7:
        hork_lead += [n(b0 + o, .5, x, 84) for o, x in ((0, "D6"), (1, "C6"), (2, "A#5"), (3, "G5"))]
save(out("opengaz-hork-media.json"), "Planet theme — Hork (media capital)", 4,
     [part("bass", human(hork_bass, .007, 6, 31)), part("lead", human(hork_lead, .012, 8, 32)),
      part("drums", human(kit(BARS, (0, 2), (1, 3), .25, 62), .008, 8, 33))],
     "Original OpenGaz composition: G minor newsroom groove, octave bass, synth lead on the turn.")

# ══════════════════════════════════════════════════ xeen — junkyard · 95 bpm · perc 0.47
BARS = 8
xeen_bass = lay(BARS, None, per_bar=lambda b: (
    [(0, .5, "C2", 110), (.5, .5, "D2", 92), (1.0, .5, "D#2", 96), (1.5, .5, "F2", 92),
     (2.0, .75, "G2", 104), (3.0, .5, "F2", 92), (3.5, .5, "D#2", 90)] if b % 2 == 0 else
    [(0, .5, "C2", 110), (.75, .25, "C2", 88), (1.5, .5, "A#1", 94),
     (2.0, .5, "G1", 100), (2.5, .5, "A#1", 90), (3.0, 1.0, "C2", 98)]))
xeen_clav = []
for bar in range(BARS):
    if bar % 2:
        b0 = bar * 4
        xeen_clav += [n(b0 + o, .3, x, 76) for o, x in
                      ((.5, "C4"), (1.25, "D#4"), (2.25, "G4"), (3.5, "D#4"))]
def scrap(bar, b0):
    ev = [n(b0 + 1.5, .2, COWBELL, 88), n(b0 + 3.25, .2, TAMB, 82)]
    if bar % 2:
        ev += [n(b0 + 2.75, .2, AGOGO, 84), n(b0 + 3.75, .2, TOMHI, 90)]
    return ev
save(out("opengaz-xeen-junkyard.json"), "Planet theme — Xeen (junkyard)", 4,
     [part("bass", human(xeen_bass, .010, 7, 41)), part("clav", human(xeen_clav, .012, 8, 42)),
      part("drums", human(kit(BARS, (0, 1.75, 2.5), (1, 3), .5, 68, extra=scrap), .012, 10, 43))],
     "Original OpenGaz composition: stepwise C minor bass, cowbell and agogo for scrap metal.")

# ══════════════════════════════════════════════════ pyke — foundries · 108 bpm
BARS = 8
# Measured: kick and snare in sixteenths, no hats whatsoever, bass roaming C#1 to A3, top line
# circling A–B–C#. So: an eight-bar line that develops, and a kit with nothing above the snare.
PY_A = [(0, .5, "F#1", 116), (.5, .25, "F#1", 92), (1.0, .5, "C#2", 104), (1.75, .25, "F#1", 90),
        (2.0, .5, "E2", 108), (2.75, .25, "F#1", 92), (3.0, .5, "A1", 100), (3.5, .5, "B1", 98)]
PY_B = [(0, .5, "F#1", 116), (.5, .25, "A1", 94), (1.0, .5, "B1", 104), (1.5, .5, "C#2", 100),
        (2.25, .25, "F#1", 90), (2.5, .5, "E2", 106), (3.0, 1.0, "C#2", 102)]
PY_C = [(0, .5, "A1", 114), (.75, .25, "A1", 92), (1.5, .5, "E2", 102), (2.0, .5, "F#2", 108),
        (2.75, .25, "E2", 92), (3.0, .5, "C#2", 100), (3.5, .5, "B1", 96)]
PY_D = [(0, .75, "B1", 114), (1.0, .5, "C#2", 104), (1.75, .25, "B1", 90), (2.0, .5, "A1", 106),
        (2.5, .5, "G#1", 98), (3.0, 1.0, "F#1", 112)]
PYKE = [PY_A, PY_B, PY_A, PY_C, PY_A, PY_B, PY_C, PY_D]
pyke_bass = lay(BARS, None, per_bar=lambda b: PYKE[b % 8])
pyke_gtr = [dict(x, pitch=x["pitch"] + 12) for x in lay(BARS, None, per_bar=lambda b: PYKE[b % 8])]
def forge(bar, b0):
    ev = [n(b0 + 3.5, .25, TOMLO, 106), n(b0 + 3.75, .25, TOMMID, 102)]
    if bar % 3 == 2:
        ev.append(n(b0 + 2.5, .3, CRASH, 98))
    return ev
pyke_kit = []
for bar in range(BARS):                    # sixteenth kick, snare on the backbeat, no hats
    b0 = bar * 4
    for i in range(16):
        if i % 4 in (0, 3) or (bar % 2 and i % 8 == 6):
            pyke_kit.append(n(b0 + i * .25, .2, KICK, 108 if i % 4 == 0 else 84))
    for off in (1, 3):
        pyke_kit.append(n(b0 + off, .25, SNARE, 104))
    pyke_kit.extend(forge(bar, b0))
save(out("opengaz-pyke-industry.json"), "Planet theme — Pyke (foundries)", 4,
     [part("bass", human(pyke_bass, .008, 6, 51)), part("guitar", human(pyke_gtr, .010, 7, 52)),
      part("drums", human(pyke_kit, .010, 9, 53))],
     "Original OpenGaz composition: eight-bar F# minor foundry line, no hats, sixteenth kick.")

# ══════════════════════════════════════════════════ queg — smugglers · 112 bpm · sitar
# The measured pitch set is C D D# F G A A# — C Dorian, which is why it reads as exotic rather
# than minor. Bass roams C2–C4 in fast notes; the mid and top sustain for seconds. A sitar with a
# drone under it and hand percussion is the instrument that makes all three of those true at once.
BARS = 11
SCALE = ["C4", "D4", "D#4", "F4", "G4", "A4", "A#4", "C5"]
PHRASES = [
    [(0, .5, "C4"), (.5, .25, "D#4"), (.75, .25, "D4"), (1.0, .75, "C4"),
     (2.0, .5, "G4"), (2.5, .5, "F4"), (3.0, 1.0, "D#4")],
    [(0, .5, "G4"), (.5, .25, "A4"), (.75, .25, "A#4"), (1.0, .5, "A4"), (1.5, .5, "G4"),
     (2.0, .75, "F4"), (3.0, .5, "D#4"), (3.5, .5, "D4")],
    [(0, .75, "C5"), (1.0, .25, "A#4"), (1.25, .25, "A4"), (1.5, .5, "G4"),
     (2.0, .5, "F4"), (2.5, .5, "G4"), (3.0, 1.0, "D#4")],
    [(0, .25, "C4"), (.25, .25, "D4"), (.5, .25, "D#4"), (.75, .25, "F4"), (1.0, .25, "G4"),
     (1.25, .25, "A4"), (1.5, .5, "A#4"), (2.0, 1.0, "C5"), (3.0, 1.0, "G4")],
]
queg_sitar = []
for bar in range(BARS):
    b0 = bar * 4
    for off, length, note in PHRASES[bar % 4]:
        queg_sitar.append(n(b0 + off, length, note, 96 if off == 0 else 82))
queg_drone = pad([("C2", "G2", "C3")] * BARS, 4.0, 58)
queg_bass = lay(BARS, [(0, .5, "C2", 112), (.75, .25, "C2", 88), (1.5, .5, "A#1", 98),
                       (2.0, .5, "C2", 104), (2.75, .25, "D2", 90), (3.5, .5, "G1", 100)])
def tabla(bar, b0):
    ev = [n(b0 + o, .2, CONGAHI, 84) for o in (0, 1.0, 2.5, 3.0)]
    ev += [n(b0 + o, .2, CONGALO, 92) for o in (1.5, 3.5)]
    ev += [n(b0 + o, .18, SHAKER, 58) for o in (.5, 1.25, 2.0, 2.75, 3.75)]
    if bar % 4 == 3:
        ev += [n(b0 + o, .18, CONGAHI, 96) for o in (3.25, 3.5, 3.75)]
    return ev
save(out("opengaz-queg-smugglers.json"), "Planet theme — Queg (smugglers' den)", 4,
     [part("sitar", human(queg_sitar, .012, 8, 61)),
      part("drone", human(queg_drone, .02, 4, 62)),
      part("bass", human(queg_bass, .008, 6, 63)),
      part("drums", human(kit(BARS, (0, 2), (), 4.0, 30, extra=tabla), .012, 9, 64))],
     "Original OpenGaz composition: C Dorian sitar line over a drone, hand percussion.")

# ══════════════════════════════════════════════════ vexx — imperial · 104 bpm · perc 0.03
# Half the energy under 200 Hz, half in the midrange, nothing above 800 Hz, and no kit at all.
BARS = 9
vexx_low = lay(BARS, None, per_bar=lambda b: (
    [(0, 1.9, "A1", 104), (2.0, 1.9, "E2", 96)] if b % 2 == 0 else
    [(0, 1.9, "D2", 100), (2.0, 1.0, "C#2", 94), (3.0, .9, "B1", 92)]))
CH = [("A2", "C#3", "E3"), ("A2", "D3", "F#3"), ("G#2", "B2", "E3"), ("A2", "C#3", "E3"),
      ("D3", "F#3", "A3"), ("C#3", "E3", "A3"), ("B2", "D3", "F#3"), ("A2", "C#3", "E3"),
      ("A2", "E3", "A3")]
vexx_pad = pad(CH, 4.0, 62)
vexx_horn = []
for bar in range(BARS):
    b0 = bar * 4
    if bar % 4 == 1:
        vexx_horn += [n(b0 + o, l, x, 86) for o, l, x in
                      ((0, 1.0, "E3"), (1.0, 1.0, "F#3"), (2.0, 1.9, "A3"))]
    if bar % 4 == 3:
        vexx_horn += [n(b0 + o, l, x, 82) for o, l, x in ((0, 1.5, "D3"), (2.0, 1.9, "C#3"))]
save(out("opengaz-vexx-imperial.json"), "Planet theme — Vexx (imperial capital)", 4,
     [part("low", human(vexx_low, .014, 5, 71)), part("pad", human(vexx_pad, .016, 5, 72)),
      part("horn", human(vexx_horn, .014, 6, 73)),
      part("timpani", human([n(b * 4, .5, KICK, 84) for b in range(BARS)] +
                            [n(b * 4 + 2, .4, TOMLO, 70) for b in range(BARS) if b % 2],
                            .012, 8, 74))],
     "Original OpenGaz composition: A minor processional, low strings and horns, no kit.")

# ══════════════════════════════════════════════════ zile — banks · 160 bpm · 62 % mid
BARS = 18
ARP = ["D3", "F3", "A3", "D4", "A3", "F3"]
zile_arp = []
for bar in range(BARS):
    b0 = bar * 4
    seq = ARP if bar % 4 < 2 else ["C3", "E3", "G3", "C4", "G3", "E3"]
    for i in range(8):
        zile_arp.append(n(b0 + i * .5, .45, seq[i % len(seq)], 78 if i % 2 == 0 else 66))
zile_bass = lay(BARS, None, per_bar=lambda b: (
    [(0, .9, "D2", 100), (2.0, .9, "A1", 92)] if b % 4 < 2 else
    [(0, .9, "C2", 100), (2.0, .9, "G1", 92)]))
zile_bell = []
for bar in range(BARS):
    if bar % 4 == 3:
        b0 = bar * 4
        zile_bell += [n(b0 + o, 1.0, x, 74) for o, x in ((0, "D5"), (2, "A4"))]
save(out("opengaz-zile-banks.json"), "Planet theme — Zile (banks and vaults)", 4,
     [part("arp", human(zile_arp, .008, 7, 81)), part("bass", human(zile_bass, .010, 6, 82)),
      part("bell", human(zile_bell, .012, 7, 83)),
      part("drums", human(kit(BARS, (0, 2), (1, 3), 1.0, 54, top=RIDE), .009, 7, 84))],
     "Original OpenGaz composition: D minor arpeggio ticking like a counting machine.")

# ══════════════════════════════════════════════════ stye — financial hub · 118 bpm
BARS = 8
stye_keys = []
PROG = [("C3", "E3", "G3", "B3"), ("A2", "C3", "E3", "G3"),
        ("D3", "F3", "A3", "C4"), ("G2", "B2", "D3", "F3")]
for bar in range(BARS):
    b0 = bar * 4
    chord = PROG[bar % 4]
    for off in (0, 1.5, 2.5):
        stye_keys += [n(b0 + off, .45, x, 76 if off == 0 else 62) for x in chord]
stye_bass = lay(BARS, None, per_bar=lambda b: [
    (0, .45, PROG[b % 4][0].replace("3", "2").replace("2", "1") if False else
     ["C2", "A1", "D2", "G1"][b % 4], 108),
    (1.5, .45, ["G1", "E1", "A1", "D1"][b % 4], 92),
    (2.5, .45, ["C2", "A1", "D2", "G1"][b % 4], 98),
    (3.5, .45, ["E2", "C2", "F2", "A#1"][b % 4], 90)])
stye_lead = []
for bar in range(BARS):
    if bar % 2 == 1:
        b0 = bar * 4
        stye_lead += [n(b0 + o, l, x, 84) for o, l, x in
                      ((.5, .5, "E4"), (1.0, .5, "G4"), (1.5, 1.0, "C5"), (3.0, .9, "B4"))]
save(out("opengaz-stye-financial.json"), "Planet theme — Stye (Trader's Union towers)", 4,
     [part("keys", human(stye_keys, .010, 7, 91)), part("bass", human(stye_bass, .009, 6, 92)),
      part("lead", human(stye_lead, .012, 7, 93)),
      part("drums", human(kit(BARS, (0, 2.5), (1, 3), .5, 66), .010, 8, 94))],
     "Original OpenGaz composition: brisk C major turnaround, electric piano and a short head.")

# ══════════════════════════════════════════════════ nosh — fuel depot · 105 bpm
BARS = 10
nosh_bass = lay(BARS, [(0, .45, "F1", 112), (.75, .25, "F1", 92), (1.5, .45, "C2", 100),
                       (2.0, .45, "F1", 106), (2.75, .25, "D#2", 94), (3.25, .7, "A#1", 100)])
nosh_pump = []
for bar in range(BARS):
    b0 = bar * 4
    for off in (0.5, 1.25, 2.5, 3.25):
        nosh_pump.append(n(b0 + off, .3, "F3" if off < 2 else "D#3", 70))
    if bar % 4 == 3:
        nosh_pump += [n(b0 + o, .5, x, 78) for o, x in ((2.0, "A#3"), (3.0, "C4"))]
def rig(bar, b0):
    ev = [n(b0 + 3.5, .25, TOMMID, 92)]
    if bar % 2:
        ev.append(n(b0 + 1.75, .2, COWBELL, 76))
    return ev
save(out("opengaz-nosh-fuel.json"), "Planet theme — Nosh (fuel depot)", 4,
     [part("bass", human(nosh_bass, .009, 6, 101)), part("keys", human(nosh_pump, .011, 7, 102)),
      part("drums", human(kit(BARS, (0, 2), (1, 3), .5, 64, extra=rig), .010, 8, 103))],
     "Original OpenGaz composition: F minor pump-house groove, mid-register stabs.")

# ══════════════════════════════════════════════════ loro — pleasure planet · 117 bpm
# Measured: bass sits at G2–A3 (mid, not low), the top line leaps by fourths and fifths, the kick
# runs sixteenths and the hats sit on the half beat. A steel band, not a marimba étude.
BARS = 9
LORO = [
    [(0, .4, "D5"), (.5, .4, "A4"), (1.0, .4, "F5"), (1.5, .4, "D5"),
     (2.0, .4, "A5"), (2.75, .35, "F5"), (3.25, .65, "D5")],
    [(0, .4, "C5"), (.5, .4, "G5"), (1.25, .35, "E5"), (1.75, .35, "C5"),
     (2.5, .4, "G5"), (3.0, .9, "E5")],
    [(0, .4, "F5"), (.5, .4, "D5"), (1.0, .4, "A5"), (1.75, .35, "F5"),
     (2.25, .35, "D5"), (2.75, .35, "C5"), (3.25, .65, "A4")],
    [(0, .3, "D5"), (.35, .3, "E5"), (.7, .3, "F5"), (1.0, .5, "A5"),
     (2.0, .4, "G5"), (2.5, .4, "F5"), (3.0, 1.0, "D5")],
]
loro_steel = []
for bar in range(BARS):
    b0 = bar * 4
    for off, length, note in LORO[bar % 4]:
        loro_steel.append(n(b0 + off, length, note, 92 if off == 0 else 76))
loro_bass = lay(BARS, None, per_bar=lambda b: (
    [(0, .4, "D3", 104), (.75, .25, "D3", 84), (1.5, .4, "A2", 94), (2.0, .4, "D3", 100),
     (2.75, .25, "F3", 86), (3.5, .4, "A2", 92)] if b % 2 == 0 else
    [(0, .4, "C3", 104), (.75, .25, "C3", 84), (1.5, .4, "G2", 94), (2.0, .4, "C3", 100),
     (2.75, .25, "E3", 86), (3.5, .4, "G2", 92)]))
loro_marimba = []
for bar in range(BARS):
    b0 = bar * 4
    chord = ("D4", "F4", "A4") if bar % 2 == 0 else ("C4", "E4", "G4")
    for off in (.5, 1.5, 2.5, 3.5):
        loro_marimba += [n(b0 + off, .22, x, 58) for x in chord]
def beach(bar, b0):
    ev = [n(b0 + o, .2, TAMB, 76) for o in (1, 3)]
    for i in range(16):                       # sixteenth kick, as measured
        if i % 4 in (0, 2) or (bar % 2 and i % 8 == 5):
            ev.append(n(b0 + i * .25, .18, KICK, 104 if i % 4 == 0 else 78))
    if bar % 2:
        ev.append(n(b0 + 3.75, .2, TRIANGLE, 72))
    return ev
loro_kit = []
for bar in range(BARS):
    b0 = bar * 4
    loro_kit += [n(b0 + o, .25, SNARE, 96) for o in (1, 3)]
    loro_kit += [n(b0 + i * .5, .2, HAT, 66 + (12 if i % 2 == 0 else 0)) for i in range(8)]
    loro_kit += beach(bar, b0)
save(out("opengaz-loro-pleasure.json"), "Planet theme — Loro (pleasure planet)", 4,
     [part("steel", human(loro_steel, .012, 8, 111)),
      part("bass", human(loro_bass, .010, 6, 112)),
      part("marimba", human(loro_marimba, .012, 7, 113)),
      part("drums", human(loro_kit, .010, 9, 114))],
     "Original OpenGaz composition: steel-drum melody over a mid-register bass, sixteenth kick.")

# ══════════════════════════════════════════════════ mira — monasteries · no pulse
# Measured: 99.8 % of the energy in one octave and a half, held notes of 7 s, 700 ms attacks,
# no percussion. An ambient bed with one slow line over it.
CH = [("D#3", "A#3", "D#4"), ("C#3", "G#3", "C#4"), ("D#3", "A#3", "F4"), ("A#2", "F3", "A#3")]
mira_pad = pad(CH, 8.0, 58)
mira_flute = [n(0.0, 3.0, "A#4", 74), n(3.5, 2.5, "C5", 70), n(7.0, 3.5, "G#4", 72),
              n(11.0, 2.0, "A#4", 68), n(13.5, 4.5, "D#5", 76), n(19.0, 4.0, "A#4", 66),
              n(24.0, 6.0, "G#4", 62)]
save(out("opengaz-mira-ambient.json"), "Planet theme — Mira (monasteries)", 4,
     [part("pad", human(mira_pad, .02, 4, 121)), part("flute", human(mira_flute, .02, 5, 122))],
     "Original OpenGaz composition: ambient D# bed, one unhurried flute line, no pulse.")

# ══════════════════════════════════════════════════ frac — insurance · ~200 bpm · 5 % bass
# Two readings of the same cue: the bright fast figure the original actually is, and the slower
# horn version suggested in review.
BARS = 12
frac_fig = []
RUN = ["C5", "E5", "G5", "E5", "C5", "D5", "F5", "D5"]
RUN_B = ["B4", "D5", "G5", "D5", "B4", "C5", "E5", "C5"]
for bar in range(BARS):
    b0 = bar * 4
    seq = RUN if bar % 2 == 0 else RUN_B
    for i in range(8):
        frac_fig.append(n(b0 + i * .5, .42, seq[i], 82 if i % 4 == 0 else 66))
frac_pad = pad([("C4", "E4", "G4"), ("G3", "B3", "D4")] * (BARS // 2), 4.0, 44)
save(out("opengaz-frac-clockwork.json"), "Planet theme — Frac (insurance, clockwork)", 4,
     [part("figure", human(frac_fig, .006, 6, 131)), part("pad", human(frac_pad, .02, 4, 132))],
     "Original OpenGaz composition: bright clockwork figure in C, almost no bass, no kit.")

HORNS = [("C3", "E3", "G3"), ("A2", "C3", "F3"), ("G2", "B2", "D3"), ("C3", "E3", "G3")]
frac_horns = pad(HORNS, 6.0, 72)
frac_counter = [n(2.0, 3.0, "G4", 62), n(8.0, 3.5, "F4", 60), n(14.0, 3.0, "E4", 62),
                n(20.0, 3.5, "G4", 58)]
save(out("opengaz-frac-horns.json"), "Planet theme — Frac (insurance, slow horns)", 4,
     [part("horn", human(frac_horns, .02, 5, 141)),
      part("counter", human(frac_counter, .02, 5, 142))],
     "Original OpenGaz composition: slow horn chorale in C, an alternative reading of frac.")

# ══════════════════════════════════════════════════ ooom — fortune tellers · 120 bpm
# Measured: an F pedal underneath, and a top that sustains for eighteen seconds with a 2.7 s
# attack — pads, not bells. Tubular bells were the wrong instrument; this is soft, slow and wet,
# with the repeats written into the score as delay taps.
BARS = 11
ooom_figure = []
FIG = [(0, 1.5, "C5"), (2.0, 1.5, "G4")]
FIG_B = [(0, 1.5, "D#5"), (2.5, 1.5, "A#4")]
for bar in range(BARS):
    if bar % 2 == 0:
        b0 = bar * 4
        for off, length, note in (FIG if bar % 4 == 0 else FIG_B):
            ooom_figure.append(n(b0 + off, length, note, 62))
ooom_figure = echo(ooom_figure, taps=((0.75, 0.5), (1.5, 0.28), (2.25, 0.16)))
ooom_shimmer = []
for bar in range(BARS):
    if bar % 4 == 2:
        b0 = bar * 4
        ooom_shimmer += [n(b0 + o, 1.2, x, 48) for o, x in ((1.0, "G5"), (2.5, "D#5"))]
ooom_shimmer = echo(ooom_shimmer, taps=((1.0, 0.45), (2.0, 0.22)))
ooom_pad = pad([("C3", "D#3", "G3"), ("A#2", "D3", "F3")] * (BARS // 2 + 1), 8.0, 54)
ooom_low = lay(BARS, None, per_bar=lambda b: [(0, 3.9, "F1" if b % 2 == 0 else "D#1", 70)])
save(out("opengaz-ooom-fortune.json"), "Planet theme — Ooom (fortune tellers)", 4,
     [part("figure", human(ooom_figure, .02, 5, 151)),
      part("shimmer", human(ooom_shimmer, .02, 4, 152)),
      part("pad", human(ooom_pad, .02, 4, 153)),
      part("low", human(ooom_low, .02, 4, 154))],
     "Original OpenGaz composition: soft C minor figure with written-in delay taps over an F pedal, no kit.")
