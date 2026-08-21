#!/usr/bin/env python3
"""
Re-encode a public-domain score into an OpenGaz score master (JSON).

The output holds only note data — pitch, onset, duration, part — expressed in beats, plus the
metre and the part list. Nothing of the input file's sequencing (its tempo curve, velocities,
patches, controller ramps) survives; the render step supplies all of that from the cue spec.

    python3 scripts/music/extract_score.py in.mid out.json --from-beat 0 --to-beat 544 \
        --title "..." --composer "..." --beats-per-bar 4
"""
import argparse, json, sys
from collections import defaultdict

import mido


def extract(path, start_beat, end_beat):
    mid = mido.MidiFile(path)
    tpb = mid.ticks_per_beat
    parts = []
    for track in mid.tracks:
        name = next((m.name.strip() for m in track if m.type == "track_name"), "")
        notes, open_notes, t = [], defaultdict(list), 0
        for msg in track:
            t += msg.time
            if msg.type == "note_on" and msg.velocity > 0:
                open_notes[msg.note].append(t)
            elif msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
                if open_notes[msg.note]:
                    on = open_notes[msg.note].pop(0)
                    notes.append((on / tpb, (t - on) / tpb, msg.note))
        notes = [
            {"beat": round(b - start_beat, 4), "len": round(d, 4), "pitch": p}
            for b, d, p in sorted(notes)
            if start_beat <= b < end_beat and d > 0
        ]
        if notes:
            parts.append({"name": name or f"part{len(parts) + 1}", "notes": notes})
    return parts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dest")
    ap.add_argument("--from-beat", type=float, default=0)
    ap.add_argument("--to-beat", type=float, default=1e9)
    ap.add_argument("--beats-per-bar", type=int, default=4)
    ap.add_argument("--title", default="")
    ap.add_argument("--composer", default="")
    ap.add_argument("--note", default="")
    args = ap.parse_args()

    parts = extract(args.src, args.from_beat, args.to_beat)
    if not parts:
        sys.exit("no notes in range")
    span = max(n["beat"] + n["len"] for p in parts for n in p["notes"])
    doc = {
        "title": args.title,
        "composer": args.composer,
        "note": args.note,
        "beatsPerBar": args.beats_per_bar,
        "bars": round(span / args.beats_per_bar, 2),
        "parts": parts,
    }
    with open(args.dest, "w") as fh:
        json.dump(doc, fh, separators=(",", ":"))
    print(
        f"{args.dest}: {len(parts)} parts, "
        f"{sum(len(p['notes']) for p in parts)} notes, {doc['bars']} bars"
    )


if __name__ == "__main__":
    main()
