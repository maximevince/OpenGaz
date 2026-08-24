#!/usr/bin/env python3
"""
Cut a game cue out of a freely-licensed recording, and carry its credit with it.

The cue spec names the source, the excerpt, and the attribution the licence obliges us to ship;
this writes the OGG and prints the SOURCES.md row, so a cue can never be built without its credit.

    python3 scripts/music/cut_recording.py assets/src/music/cues/op6-corelli.json \
        --cache .cache/music --out build/music
"""
import argparse, json, os, subprocess, sys, urllib.parse

REQUIRED_CREDIT = ("work", "composer", "performer", "license", "sourceUrl")


def run(cmd):
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode:
        sys.exit(f"{cmd[0]} failed:\n{proc.stderr[-1500:]}")


def fetch(url, cache):
    os.makedirs(cache, exist_ok=True)
    name = os.path.basename(urllib.parse.urlparse(url).path)
    path = os.path.join(cache, urllib.parse.unquote(name))
    if not os.path.exists(path):
        run(["curl", "-sL", "--max-time", "600", "-A", "opengaz", url, "-o", path])
    return path


def sources_row(spec):
    c = spec["credit"]
    changes = spec.get("changes", "excerpted, level-matched, re-encoded")
    return (f"| `music/{spec['id']}.ogg` | {c['work']} — {c['composer']} | "
            f"{c['performer']}{', ' + c['concert'] if c.get('concert') else ''} | "
            f"{c['license']} | {c['sourceUrl']} | {changes} |")


def cut(spec_path, cache, out_dir):
    spec = json.load(open(spec_path))
    if "credit" not in spec:
        return None          # a written cue: render_music.py owns it
    if spec.get("build") is False:
        return None
    missing = [k for k in REQUIRED_CREDIT if not spec.get("credit", {}).get(k)]
    if missing:
        sys.exit(f"{spec_path}: credit is missing {', '.join(missing)}")

    src = spec.get("file") or fetch(spec["credit"]["fileUrl"], cache)
    os.makedirs(out_dir, exist_ok=True)
    dest = os.path.join(out_dir, f"{spec['id']}.ogg")

    seconds = spec["seconds"]
    fade_in = spec.get("fadeIn", 0.35)
    fade_out = spec.get("fadeOut", 2.0)
    chain = [
        f"afade=t=in:st=0:d={fade_in}",
        f"afade=t=out:st={max(0.1, seconds - fade_out)}:d={fade_out}",
        f"loudnorm=I={spec.get('loudness', -16)}:TP=-1.5:LRA=11",
    ]
    if spec.get("highpass"):  # live recordings carry a lot of room rumble
        chain.insert(0, f"highpass=f={spec['highpass']}")
    if spec.get("lowpass"):  # 78s carry shellac hiss well above the band the music occupies
        chain.insert(1, f"lowpass=f={spec['lowpass']}")
    if spec.get("denoise"):
        chain.insert(2, f"afftdn=nf={spec['denoise']}")
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(spec["start"]), "-i", src,
         "-t", str(seconds), "-af", ",".join(chain),
         "-ar", "44100", "-ac", "2", "-c:a", "libvorbis", "-q:a", str(spec.get("quality", 4)), dest])

    print(f"{spec['id']}: {os.path.basename(src)} @ {spec['start']}s +{seconds}s "
          f"-> {os.path.getsize(dest) // 1024} kB")
    return sources_row(spec)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cues", nargs="+")
    ap.add_argument("--cache", default=".cache/music")
    ap.add_argument("--out", default="build/music")
    ap.add_argument("--sources", help="write the SOURCES.md rows here as well")
    args = ap.parse_args()
    rows = [row for row in (cut(cue, args.cache, args.out) for cue in args.cues) if row]
    print("\n" + "\n".join(rows))
    if args.sources:
        with open(args.sources, "w") as fh:
            fh.write("\n".join(rows) + "\n")


if __name__ == "__main__":
    main()
