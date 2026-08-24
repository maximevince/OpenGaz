"""Shared note-entry helpers for OpenGaz's own cues.

A score master is note data only — pitch, onset, length, part — so everything here is about
getting notes into that shape readably. Performance lives in the cue spec, not in this file.
"""
import json, random

NAMES = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6,
         "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}

# GM percussion key numbers, by the name a drummer would use
KICK, STICK, SNARE, CLAP, HAT, HATP, HATO = 36, 37, 38, 39, 42, 44, 46
TOMLO, TOMMID, TOMHI, CRASH, RIDE, RIDEBELL = 41, 45, 47, 49, 51, 53
TAMB, COWBELL, AGOGO, CONGAHI, CONGALO, SHAKER, TRIANGLE = 54, 56, 67, 63, 64, 70, 81


def p(spec):
    """"A#3" -> MIDI note number."""
    return (int(spec[-1]) + 1) * 12 + NAMES[spec[:-1]]


def n(beat, length, pitch, vel=None):
    note = {"beat": round(beat, 4), "len": round(length, 4),
            "pitch": pitch if isinstance(pitch, int) else p(pitch)}
    if vel:
        note["vel"] = int(vel)
    return note


def part(name, notes):
    return {"name": name, "notes": sorted(notes, key=lambda x: x["beat"])}


def human(notes, timing=0.012, vel=9, seed=0):
    """Nudge timing and velocity per note, from a fixed seed.

    A soundfont retriggering one sample at one velocity on an exact grid is what reads as
    synthetic; a few milliseconds and a few velocity layers is what hands do anyway.
    """
    rng = random.Random(seed)
    for x in notes:
        x["beat"] = round(max(0.0, x["beat"] + rng.uniform(-timing, timing)), 4)
        if "vel" in x:
            x["vel"] = int(min(126, max(18, x["vel"] + rng.randint(-vel, vel))))
    return sorted(notes, key=lambda x: x["beat"])


def save(path, title, beats_per_bar, parts, note):
    span = max(x["beat"] + x["len"] for pt in parts for x in pt["notes"])
    json.dump({"title": title, "composer": "OpenGaz (original composition)", "note": note,
               "beatsPerBar": beats_per_bar, "bars": round(span / beats_per_bar, 2),
               "parts": parts},
              open(path, "w"), separators=(",", ":"))
    print(f"{path.split('/')[-1]}: {len(parts)} parts, "
          f"{sum(len(x['notes']) for x in parts)} notes, {span / beats_per_bar:.0f} bars")
