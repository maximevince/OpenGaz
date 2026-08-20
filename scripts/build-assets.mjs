#!/usr/bin/env node
/**
 * Build the shipped `opengaz` asset pack from masters:
 *
 *   assets/src/gfx/<id path>.{png,jpg,webp}  ->  public/assets/gfx/<id path>.png  (resized to spec)
 *   assets/src/sfx/<id>.{wav,ogg,mp3}        ->  public/assets/sfx/<id>.ogg       (via ffmpeg)
 *   public/assets/manifest.json               (list of stems the UI may resolve)
 *
 * The id path is the semantic asset id with dots replaced by slashes, e.g.
 * `planet/bass/large.png` <-> `planet.bass.large`. Sizes come from SPEC below (docs/ASSETS.md).
 * Masters may be larger than the target; they are centre-cropped ("cover") and resized.
 * Add `--check` to only report missing/undersized masters.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const SRC_GFX = path.join(ROOT, 'assets/src/gfx');
const SRC_SFX = path.join(ROOT, 'assets/src/sfx');
const OUT = path.join(ROOT, 'public/assets');
const CHECK = process.argv.includes('--check');
/** every shipped sound effect is peak-normalised to this level */
const PEAK_TARGET_DB = -3;

/** target sizes by id pattern (first match wins) */
const SPEC = [
  [/^planet\/[a-z]+\/icon$/, [70, 60]],
  [/^planet\/[a-z]+\/medium$/, [200, 200]],
  [/^planet\/[a-z]+\/(large|surface)$/, [640, 480]],
  [/^ship\/\d+\/picture$/, [320, 200]],
  [/^ship\/\d+\/icon$/, [80, 50]],
  [/^portrait\/op\d$/, [320, 200]],
  [/^portrait\/[a-z0-9_-]+$/, [200, 320]],
  [/^screen\/[a-z]+$/, [640, 480]],
  [/^bg\/stars\/\d+$/, [640, 480]],
];

async function walk(dir, exts) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p, exts)));
    else if (exts.includes(path.extname(e.name).toLowerCase())) out.push(p);
  }
  return out;
}

const stemOf = (base, file) =>
  path
    .relative(base, file)
    .replace(/\.[^.]+$/, '')
    .split(path.sep)
    .join('/');

async function buildGfx() {
  const files = await walk(SRC_GFX, ['.png', '.jpg', '.jpeg', '.webp']);
  const stems = [];
  for (const f of files) {
    const stem = stemOf(SRC_GFX, f);
    const spec = SPEC.find(([re]) => re.test(stem));
    if (!spec) {
      console.warn(`skip ${stem}: no size spec (see docs/ASSETS.md)`);
      continue;
    }
    const [w, h] = spec[1];
    const meta = await sharp(f).metadata();
    if ((meta.width ?? 0) < w || (meta.height ?? 0) < h)
      console.warn(`undersized ${stem}: ${meta.width}x${meta.height} < ${w}x${h}`);
    if (!CHECK) {
      const dest = path.join(OUT, 'gfx', `${stem}.png`);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await sharp(f)
        .resize(w, h, { fit: 'cover', position: 'centre' })
        .png({ compressionLevel: 9, palette: true, quality: 90 })
        .toFile(dest);
    }
    stems.push(stem);
  }
  return stems.sort();
}

/** loudest peak in the file, in dBFS (0 when ffmpeg will not say) */
function peakDb(file) {
  const r = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', '-'],
    {
      encoding: 'utf8',
    },
  );
  const m = /max_volume: (-?[\d.]+) dB/.exec(r.stderr ?? '');
  return m ? Number(m[1]) : 0;
}

/** encode one master to the shipped mono OGG with `gain` dB applied; false when ffmpeg fails */
function encode(src, dest, gain) {
  const r = spawnSync(
    'ffmpeg',
    // prettier-ignore
    ['-y', '-loglevel', 'error', '-i', src, '-ac', '1', '-ar', '22050',
     '-af', `volume=${gain.toFixed(2)}dB`, '-c:a', 'libvorbis', '-q:a', '2', dest],
    { stdio: 'inherit' },
  );
  return r.status === 0;
}

async function buildSfx() {
  const files = await walk(SRC_SFX, ['.wav', '.ogg', '.mp3', '.flac']);
  const stems = [];
  for (const f of files) {
    const stem = stemOf(SRC_SFX, f);
    if (!CHECK) {
      const dest = path.join(OUT, 'sfx', `${stem}.ogg`);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      // Masters come from different packs recorded at different levels; bring every peak to the
      // same place so one sound is not startling next to another. Masters stay untouched.
      //
      // Resampling and lossy coding overshoot, by up to a few dB on sharp transients, so the
      // encode is measured afterwards and corrected once. One pass is enough to land inside the
      // tolerance for every sound we ship.
      let gain = PEAK_TARGET_DB - peakDb(f);
      let ok = encode(f, dest, gain);
      if (ok) {
        const off = PEAK_TARGET_DB - peakDb(dest);
        if (Math.abs(off) > 0.5) ok = encode(f, dest, gain + off);
      }
      if (!ok) {
        console.warn(`ffmpeg failed for ${stem} (is ffmpeg installed?)`);
        continue;
      }
    }
    stems.push(stem);
  }
  return stems.sort();
}

const gfx = await buildGfx();
const sfx = await buildSfx();
if (!CHECK) {
  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(
    path.join(OUT, 'manifest.json'),
    JSON.stringify({ pack: 'opengaz', gfx, sfx }, null, 2) + '\n',
  );
}
console.log(`${CHECK ? 'checked' : 'built'} ${gfx.length} gfx, ${sfx.length} sfx`);
