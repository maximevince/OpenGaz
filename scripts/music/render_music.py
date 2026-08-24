#!/usr/bin/env python3
"""
Render an OpenGaz music cue: score master (JSON) + cue spec (JSON) -> MIDI -> OGG.

The cue spec owns every performance decision — which bars, tempo, GM voice, dynamics, stereo
placement, loudness — so a score master can serve several cues without being touched.

    python3 scripts/music/render_music.py assets/src/music/cues/op1.json --out build/music

Needs fluidsynth, a General MIDI soundfont, and ffmpeg. FluidR3_GM.sf2 is MIT-licensed, so what
comes out of it is ours to license.
"""
import argparse, json, os, re, subprocess, sys, tempfile

import mido

SOUNDFONT = os.environ.get("OPENGAZ_SF2", "/usr/share/soundfonts/FluidR3_GM.sf2")
# GM programs, by the name a part carries in the score master.
DEFAULT_VOICES = [
    (r"violino|violin\b", 40),
    (r"viola", 41),
    (r"violoncello|cello", 42),
    (r"violone|contrabass|bass", 43),
    (r"cembalo|harpsichord|continuo", 6),
    (r"flauto|flute", 73),
    (r"oboe", 68),
    (r"tromba|trumpet", 56),
    (r"organ", 19),
]


def voice_for(name, spec_parts):
    for rule in spec_parts:
        if re.search(rule["match"], name, re.I):
            return rule
    if re.search(r"drum|kit|percussion", name, re.I):
        return {"program": 0, "drum": True}
    for pattern, program in DEFAULT_VOICES:
        if re.search(pattern, name, re.I):
            return {"program": program}
    return {"program": 48}  # string ensemble, so an unnamed part is never silent


def build_midi(score, spec, path):
    bpb = score.get("beatsPerBar", 4)
    # a cue may be cut on a bar line or, for a piece that starts on an upbeat, on a beat
    start = spec.get("fromBeat", (spec.get("fromBar", 1) - 1) * bpb)
    end = spec.get("toBeat")
    if end is None:
        end = 1e9 if spec.get("toBar") is None else (spec["toBar"] - 1) * bpb
    tpb = 480
    mid = mido.MidiFile(type=1, ticks_per_beat=tpb)

    meta = mido.MidiTrack()
    meta.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(spec["bpm"]), time=0))
    meta.append(mido.MetaMessage("time_signature", numerator=bpb, denominator=4, time=0))
    mid.tracks.append(meta)

    channel = 0
    for part in score["parts"]:
        rule = voice_for(part["name"], spec.get("parts", []))
        if rule.get("mute"):
            continue
        notes = [n for n in part["notes"] if start <= n["beat"] < end]
        if not notes:
            continue
        drum = bool(rule.get("drum"))
        if drum:
            chan = 9  # GM channel 10: note numbers are kit pieces, not pitches
        else:
            if channel == 9:
                channel = 10
            chan = channel
        if not drum and channel > 15:
            sys.exit("more parts than MIDI channels; mute some in the cue spec")
        track = mido.MidiTrack()
        track.append(mido.MetaMessage("track_name", name=part["name"], time=0))
        if not drum:
            track.append(mido.Message("program_change", channel=chan,
                                      program=rule["program"], time=0))
        track.append(mido.Message("control_change", channel=chan, control=10,
                                  value=int(rule.get("pan", 64)), time=0))
        track.append(mido.Message("control_change", channel=chan, control=91,
                                  value=int(rule.get("reverb", spec.get("reverb", 40))), time=0))
        vel = int(rule.get("velocity", spec.get("velocity", 88)))
        # a score written with its own velocities is balanced here, not rewritten
        scale = float(rule.get("level", 1.0))
        shift = 12 * int(rule.get("octave", 0))
        events = []
        for n in notes:
            on = int(round((n["beat"] - start) * tpb))
            off = on + max(12, int(round(n["len"] * tpb * spec.get("legato", 0.95))))
            pitch = min(127, max(0, n["pitch"] + shift))
            events.append((on, 1, pitch, min(127, max(1, int(n.get("vel", vel) * scale)))))
            events.append((off, 0, pitch, 0))
        events.sort(key=lambda e: (e[0], e[1]))
        clock = 0
        for at, is_on, pitch, velocity in events:
            track.append(mido.Message("note_on" if is_on else "note_off", channel=chan,
                                      note=pitch, velocity=velocity, time=at - clock))
            clock = at
        mid.tracks.append(track)
        if not drum:
            channel += 1
    mid.save(path)
    return mid.length


def run(cmd):
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode:
        sys.exit(f"{cmd[0]} failed:\n{proc.stderr[-2000:]}")
    return proc.stderr


def render(spec_path, out_dir, lofi=False):
    spec = json.load(open(spec_path))
    if "score" not in spec:
        return None          # a recording cue: cut_recording.py owns it
    if spec.get("build") is False:
        return None          # an alternate take, kept in the repo but not shipped
    score_path = os.path.join(os.path.dirname(spec_path), "..", "scores", spec["score"])
    score = json.load(open(score_path))
    os.makedirs(out_dir, exist_ok=True)
    stem = os.path.join(out_dir, spec["id"])

    with tempfile.TemporaryDirectory() as tmp:
        midi = os.path.join(tmp, "cue.mid")
        raw = os.path.join(tmp, "raw.wav")
        build_midi(score, spec, midi)
        run(["fluidsynth", "-ni", "-q", "-r", "48000", "-g", str(spec.get("gain", 0.8)),
             "-F", raw, SOUNDFONT, midi])

        chain = [f"afade=t=out:st={max(0.1, spec['seconds'] - spec.get('fadeOut', 0.8))}"
                 f":d={spec.get('fadeOut', 0.8)}",
                 f"loudnorm=I={spec.get('loudness', -16)}:TP=-1.5:LRA=11"]
        common = ["-t", str(spec["seconds"]), "-af", ",".join(chain)]
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, *common,
             "-ar", "44100", "-ac", "2", f"{stem}.wav"])
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{stem}.wav",
             "-c:a", "libvorbis", "-q:a", "4", f"{stem}.ogg"])
        if lofi:
            # what the cue would sound like sitting in the 1996 pack: 22 kHz, mono, 8-bit
            run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{stem}.wav",
                 "-ar", "22050", "-ac", "1", "-c:a", "pcm_u8", f"{stem}.lofi.wav"])
            run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{stem}.lofi.wav",
                 "-c:a", "libvorbis", "-q:a", "2", f"{stem}.lofi.ogg"])

    size = os.path.getsize(f"{stem}.ogg")
    cut = spec.get("fromBeat", spec.get("fromBar", 1))
    print(f"{spec['id']}: from {cut} @ {spec['bpm']}bpm -> {spec['seconds']}s, "
          f"{size // 1024} kB ogg")
    return f"{stem}.ogg"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cues", nargs="+")
    ap.add_argument("--out", default="build/music")
    ap.add_argument("--lofi", action="store_true")
    args = ap.parse_args()
    if not os.path.exists(SOUNDFONT):
        sys.exit(f"soundfont not found: {SOUNDFONT} (set OPENGAZ_SF2)")
    for cue in args.cues:
        render(cue, args.out, args.lofi)


if __name__ == "__main__":
    main()
