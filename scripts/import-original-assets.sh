#!/usr/bin/env bash
# Import the ORIGINAL Gazillionaire Deluxe artwork/sounds from the CD image into a
# LOCAL, GITIGNORED dev-only asset pack at public/original/.
#
#   These files are (c) LavaMind. They must NEVER be committed, bundled or distributed.
#   public/original/ is in .gitignore and CI runs scripts/guard-no-original-assets.sh.
#
# Usage:  GAZ_ISO=/path/to/GAZILLIONAIRE.iso pnpm assets:original
#         (default ISO path: $HOME/Games/GAZILLIONAIRE.iso)
# Needs:  7z, ImageMagick (magick)
set -euo pipefail

ISO="${GAZ_ISO:-$HOME/Games/GAZILLIONAIRE.iso}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/original"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

[[ -f "$ISO" ]] || { echo "ISO not found: $ISO (set GAZ_ISO)"; exit 1; }
command -v 7z >/dev/null || { echo "7z missing"; exit 1; }
command -v magick >/dev/null || { echo "ImageMagick 'magick' missing"; exit 1; }

echo "Extracting from $ISO ..."
7z x -o"$TMP" "$ISO" 'LAVAMIND/GAZ2/GRAPHICS' 'LAVAMIND/GAZ2/SOUND' -y >/dev/null

mkdir -p "$OUT/gfx" "$OUT/sfx"
echo "Converting BMP -> PNG ..."
n=0
for f in "$TMP"/LAVAMIND/GAZ2/GRAPHICS/*.BMP; do
  b="$(basename "${f%.*}" | tr 'A-Z' 'a-z')"
  magick "$f" "$OUT/gfx/$b.png" 2>/dev/null && n=$((n+1)) || echo "  skip $f"
done
echo "  $n images"
echo "Copying WAV ..."
m=0
for f in "$TMP"/LAVAMIND/GAZ2/SOUND/*.WAV; do
  b="$(basename "${f%.*}" | tr 'A-Z' 'a-z')"
  cp "$f" "$OUT/sfx/$b.wav" && m=$((m+1))
done
echo "  $m sounds"

# manifest: {"gfx":["agent1",...],"sfx":["advert",...]}
{
  printf '{\n  "pack": "original",\n  "note": "(c) LavaMind. Local dev use only. Never commit or distribute.",\n  "gfx": ['
  ls "$OUT/gfx" | sed 's/\.png$//' | sort | awk 'NR>1{printf ","} {printf "\"%s\"", $0}'
  printf '],\n  "sfx": ['
  ls "$OUT/sfx" | sed 's/\.wav$//' | sort | awk 'NR>1{printf ","} {printf "\"%s\"", $0}'
  printf ']\n}\n'
} > "$OUT/manifest.json"

cat > "$OUT/DO-NOT-COMMIT.txt" <<'TXT'
This directory holds ORIGINAL Gazillionaire Deluxe assets (c) LavaMind, imported for
local development only. It is gitignored. Never commit, bundle, or distribute it.
TXT
echo "Done -> $OUT (gitignored)."
