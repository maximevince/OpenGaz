#!/usr/bin/env python3
"""
Measure a cue the way a musician would describe it: tempo, kit, bass line, top line, timbre.

Autocorrelation alone reports whichever metrical level happens to be strongest, which is how a
132 bpm cue gets called 66. This uses a comb filter across a bpm grid and then resolves the octave
explicitly, by asking which level the onsets actually land on.

    python3 scripts/music/analyse_cue.py public/original/sfx/bass.wav
"""
import argparse, subprocess, sys

import numpy as np

SR = 22050
NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def decode(path):
    proc = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR),
                           "-f", "s16le", "-"], capture_output=True)
    if proc.returncode:
        sys.exit(proc.stderr.decode()[-500:])
    return np.frombuffer(proc.stdout, "<i2").astype(np.float32) / 32768


def spectrogram(x, win=1024, hop=128):
    frames = np.lib.stride_tricks.sliding_window_view(x, win)[::hop] * np.hanning(win)
    return np.abs(np.fft.rfft(frames, axis=1)), np.fft.rfftfreq(win, 1 / SR), SR / hop


def onset_envelope(S):
    """Log-compressed spectral flux — closer to how a transient is heard than raw difference."""
    L = np.log1p(200 * S)
    flux = np.maximum(0, np.diff(L, axis=0)).sum(1)
    flux = np.append(flux, flux[-1])
    return flux - flux.mean()


def comb_score(env, fps, bpm, pulses=6):
    """How much energy lands on a grid of this tempo, summed over several beats."""
    period = 60 / bpm * fps
    total, count = 0.0, 0
    for k in range(1, pulses + 1):
        lag = int(round(period * k))
        if lag >= len(env):
            break
        total += float(np.dot(env[:-lag], env[lag:]) / (len(env) - lag))
        count += 1
    return total / max(1, count)


def tempo(env, fps):
    grid = np.arange(50, 221, 0.5)
    scores = np.array([comb_score(env, fps, b) for b in grid])
    best = float(grid[int(np.argmax(scores))])

    # Octave check. The comb reports whichever level is strongest, which for a cue whose kit plays
    # eighths is often half the tempo a musician would count. Resolve against where the onsets
    # actually fall, and prefer a level inside the range people tap at.
    peaks = [i for i in range(1, len(env) - 1)
             if env[i] > env.mean() + env.std() and env[i] >= env[i - 1] and env[i] > env[i + 1]]
    ioi = float(np.median(np.diff(peaks))) / fps if len(peaks) > 3 else 0.0

    def rank(bpm):
        if not 45 <= bpm <= 240:
            return -1e9
        score = comb_score(env, fps, bpm, pulses=8)
        if 70 <= bpm <= 180:
            score *= 1.6                              # the range a listener counts in
        if ioi:                                       # does a beat hold a whole number of onsets?
            per_beat = (60 / bpm) / ioi
            score *= 1.0 + 0.35 * max(0.0, 1 - abs(per_beat - round(per_beat)) * 3)
            if per_beat < 0.6:                        # beat shorter than the gaps: too fast
                score *= 0.4
        return score

    cands = {best, best * 2, best / 2, best * 4, best / 4, best * 1.5, best / 1.5}
    resolved = max(cands, key=rank)
    clarity = comb_score(env, fps, resolved, 8) / (comb_score(env, fps, resolved * 0.97, 8) + 1e-12)
    return resolved, best, clarity


def band_hits(S, freqs, lo, hi, fps, thresh=2.0):
    band = (freqs > lo) & (freqs < hi)
    e = S[:, band].sum(1)
    d = np.append(np.maximum(0, np.diff(e)), 0)
    cut = d.mean() + thresh * d.std()
    idx = np.where(d > cut)[0]
    keep = []
    for i in idx:
        if not keep or (i - keep[-1]) / fps > 0.05:
            keep.append(i)
    return np.array(keep) / fps


def f0_track(x, lo_hz, hi_hz, frame=2048, hop=512):
    """Autocorrelation pitch track over a band, returning (time, midi, strength) per frame."""
    lo_lag, hi_lag = int(SR / hi_hz), int(SR / lo_hz)
    out = []
    for start in range(0, len(x) - frame, hop):
        seg = x[start:start + frame] * np.hanning(frame)
        if np.sqrt((seg ** 2).mean()) < 2e-3:
            out.append((start / SR, None, 0.0))
            continue
        ac = np.correlate(seg, seg, "full")[frame - 1:]
        ac[:lo_lag] = 0
        if hi_lag < len(ac):
            ac[hi_lag:] = 0
        lag = int(np.argmax(ac))
        strength = float(ac[lag] / (ac[0] + 1e-12))
        out.append((start / SR, 69 + 12 * np.log2((SR / lag) / 440) if lag else None, strength))
    return out


def note_runs(track, min_frames=3, strength=0.3):
    """Collapse a pitch track into held notes."""
    runs, cur = [], None
    for t, midi, s in track:
        pitch = int(round(midi)) if midi is not None and s > strength else None
        if cur and cur[2] == pitch:
            cur[1] = t
        else:
            if cur and cur[2] is not None and cur[3] >= min_frames:
                runs.append(tuple(cur[:3]))
            cur = [t, t, pitch, 0]
        cur[3] += 1
    if cur and cur[2] is not None and cur[3] >= min_frames:
        runs.append(tuple(cur[:3]))
    return runs


def timbre(x, S, freqs, band_lo, band_hi):
    """Attack, decay and harmonic shape — enough to tell a plucked bass from a synth pad."""
    band = (freqs > band_lo) & (freqs < band_hi)
    e = S[:, band].sum(1)
    e = e / (e.max() + 1e-12)
    peaks = [i for i in range(2, len(e) - 2)
             if e[i] > 0.35 and e[i] >= e[i - 1] and e[i] > e[i + 1]]
    attacks, decays = [], []
    for i in peaks[:40]:
        j = i
        while j > 0 and e[j] > 0.1 * e[i]:
            j -= 1
        attacks.append((i - j) / (SR / 128))
        k = i
        while k < len(e) - 1 and e[k] > 0.35 * e[i]:
            k += 1
        decays.append((k - i) / (SR / 128))
    mean_spec = S.mean(0)
    tonal = float(mean_spec[band].max() / (mean_spec[band].mean() + 1e-12))
    return (float(np.median(attacks)) if attacks else float("nan"),
            float(np.median(decays)) if decays else float("nan"), tonal, len(peaks))


def analyse(path):
    x = decode(path)
    S, freqs, fps = spectrogram(x)
    env = onset_envelope(S)
    bpm, raw, clarity = tempo(env, fps)
    dur = len(x) / SR

    print(f"\n===== {path.split('/')[-1]}   {dur:.1f}s")
    print(f"  tempo        {bpm:6.1f} bpm   (comb peak {raw:.1f}, beat every {60 / bpm:.3f}s, "
          f"{dur / (60 / bpm):.0f} beats)")

    kick = band_hits(S, freqs, 40, 110, fps)
    snare = band_hits(S, freqs, 180, 450, fps)
    hat = band_hits(S, freqs, 6000, 11000, fps)
    beat = 60 / bpm
    for label, hits in (("kick 40-110", kick), ("snare 180-450", snare), ("hats 6k-11k", hat)):
        if len(hits) > 2:
            gaps = np.diff(hits)
            sub = np.median(gaps) / beat
            print(f"  {label:14s} {len(hits):3d} hits, {len(hits) / dur:4.1f}/s, "
                  f"median gap {np.median(gaps):.3f}s = {sub:.2f} beats")
        else:
            print(f"  {label:14s} {len(hits):3d} hits")

    bass = f0_track(x, 35, 260)
    runs = note_runs(bass)
    print(f"  bass line    {len(runs)} notes: " +
          " ".join(f"{NAMES[p % 12]}{p // 12 - 1}" for _, _, p in runs[:26]))
    if runs:
        lengths = [b - a for a, b, _ in runs]
        print(f"               median note {np.median(lengths):.2f}s = "
              f"{np.median(lengths) / beat:.2f} beats, range "
              f"{NAMES[min(p for _,_,p in runs) % 12]}{min(p for _,_,p in runs)//12-1}"
              f"-{NAMES[max(p for _,_,p in runs) % 12]}{max(p for _,_,p in runs)//12-1}")

    hp = x - np.convolve(x, np.ones(64) / 64, "same")   # crude high-pass for the top line
    lead = note_runs(f0_track(hp, 200, 1600), min_frames=4, strength=0.25)
    print(f"  top line     {len(lead)} notes: " +
          " ".join(f"{NAMES[p % 12]}{p // 12 - 1}" for _, _, p in lead[:26]))

    for lo, hi, label in ((40, 250, "bass"), (250, 1200, "mid"), (1200, 5000, "top")):
        a, d, tonal, cnt = timbre(x, S, freqs, lo, hi)
        print(f"  {label:4s} timbre  attack {a * 1000:6.0f} ms  hold {d * 1000:6.0f} ms  "
              f"peakiness {tonal:5.1f}  events {cnt}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cues", nargs="+")
    args = ap.parse_args()
    for cue in args.cues:
        analyse(cue)


if __name__ == "__main__":
    main()
