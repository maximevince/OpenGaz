#!/usr/bin/env python3
"""
Suggest where to cut a game-length excerpt out of a full-movement recording.

Live concert recordings start with hall noise and end in applause, and not every stretch of a
movement makes a loop. This ranks candidate windows by four things a cue wants: it is loud enough,
it is music rather than noise (spectral flatness), it has a steady pulse, and its harmony sits on
one key long enough to loop.

    python3 scripts/music/suggest_excerpt.py take.ogg --seconds 24 --top 5
"""
import argparse, subprocess, sys

import numpy as np

NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
SR = 22050


def decode(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
        capture_output=True,
    )
    if raw.returncode:
        sys.exit(raw.stderr.decode()[-800:])
    return np.frombuffer(raw.stdout, "<i2").astype(np.float32) / 32768


def frames(x, win=2048, hop=512):
    return np.abs(np.fft.rfft(np.lib.stride_tricks.sliding_window_view(x, win)[::hop]
                              * np.hanning(win), axis=1))


def key_of(chroma):
    best = None
    for k in range(12):
        for prof, lab in ((MAJ, "maj"), (MIN, "min")):
            c = np.corrcoef(chroma, np.roll(prof, k))[0, 1]
            if best is None or c > best[0]:
                best = (c, f"{NAMES[k]}{lab}")
    return best[1], best[0]


def analyse(path, seconds, top, hop=512):
    x = decode(path)
    S = frames(x, hop=hop)
    fps = SR / hop
    freqs = np.fft.rfftfreq(2048, 1 / SR)

    energy = S.sum(1) + 1e-9
    # applause and hall noise are broadband: high geometric/arithmetic mean ratio
    flatness = np.exp(np.log(S + 1e-9).mean(1)) / (S.mean(1) + 1e-9)
    flux = np.maximum(0, np.diff(S, axis=0)).sum(1)
    flux = np.append(flux, flux[-1])

    band = (freqs > 60) & (freqs < 2500)
    pc = np.round(69 + 12 * np.log2(np.maximum(freqs[band], 1e-9) / 440)).astype(int) % 12
    power = S[:, band] ** 2

    win = int(seconds * fps)
    step = max(1, int(2 * fps))
    rows = []
    for start in range(0, max(1, len(S) - win), step):
        seg = slice(start, start + win)
        e = float(np.log10(energy[seg].mean()))
        fl = float(flatness[seg].mean())
        f = flux[seg] - flux[seg].mean()
        ac = np.correlate(f, f, "full")[len(f) - 1:]
        lo, hi = int(fps * 60 / 200), int(fps * 60 / 55)
        peak = int(np.argmax(ac[lo:hi])) + lo
        pulse = float(ac[peak] / (ac[0] + 1e-9))
        bpm = 60 * fps / peak
        chroma = np.array([power[seg][:, pc == k].sum() for k in range(12)])
        chroma /= chroma.sum() + 1e-9
        key, keyfit = key_of(chroma)
        score = e - 6 * fl + 2 * pulse + keyfit
        rows.append((score, start / fps, bpm, key, keyfit, pulse, fl, e))

    rows.sort(reverse=True)
    chosen, taken = [], []
    for r in rows:
        if all(abs(r[1] - t) > seconds * 0.75 for t in taken):
            chosen.append(r)
            taken.append(r[1])
        if len(chosen) == top:
            break
    print(f"{path}  {len(x) / SR:.0f}s total")
    print(f"  {'at':>7} {'bpm':>6} {'key':>7} {'fit':>5} {'pulse':>6} {'noise':>6}  score")
    for score, at, bpm, key, keyfit, pulse, fl, _ in chosen:
        print(f"  {at:7.1f} {bpm:6.1f} {key:>7} {keyfit:5.2f} {pulse:6.2f} {fl:6.3f}  {score:5.2f}")
    return chosen


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("takes", nargs="+")
    ap.add_argument("--seconds", type=float, default=24)
    ap.add_argument("--top", type=int, default=4)
    args = ap.parse_args()
    for take in args.takes:
        analyse(take, args.seconds, args.top)


if __name__ == "__main__":
    main()
