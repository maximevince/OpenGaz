/**
 * Cutting a sprite out of its own starfield.
 *
 * The ship art is a lit render on a black sky, stars and all — fine on the dealer's screen,
 * wrong when the ship has to fly over ours. Keying is done on the pixels rather than by
 * blending, so a dark hull stays dark instead of turning into a hole.
 */

/** Luma, the cheap way. Dark enough to be sky, or lit enough to be ship? */
const lum = (d: Uint8ClampedArray, i: number) =>
  (d[i]! * 299 + d[i + 1]! * 587 + d[i + 2]! * 114) / 1000;

/**
 * Clear everything that is not the sprite: the sky it was rendered on, and the stars in it.
 *
 * The sky is the dark region reachable from the border, so dark paint enclosed by the hull
 * survives. What is left over is the sprite plus any baked stars, which are their own little
 * islands — keeping only the largest island drops them. The kept mask is then eroded by a
 * pixel, which takes the half-lit rim of the render with it rather than leaving a black seam.
 */
export function keyOutSky(data: Uint8ClampedArray, w: number, h: number, threshold = 48): void {
  const n = w * h;
  const sky = new Uint8Array(n);
  const stack: number[] = [];
  const pushIfSky = (p: number) => {
    if (sky[p] || lum(data, p * 4) >= threshold) return;
    sky[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < w; x++) {
    pushIfSky(x);
    pushIfSky((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    pushIfSky(y * w);
    pushIfSky(y * w + w - 1);
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w,
      y = (p / w) | 0;
    if (x > 0) pushIfSky(p - 1);
    if (x < w - 1) pushIfSky(p + 1);
    if (y > 0) pushIfSky(p - w);
    if (y < h - 1) pushIfSky(p + w);
  }

  // the largest island of not-sky is the sprite; every other island is a star
  const label = new Int32Array(n).fill(-1);
  let best = -1,
    bestSize = 0;
  for (let seed = 0; seed < n; seed++) {
    if (sky[seed] || label[seed] !== -1) continue;
    const id = seed;
    let size = 0;
    stack.push(seed);
    label[seed] = id;
    while (stack.length) {
      const p = stack.pop()!;
      size++;
      const x = p % w,
        y = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (sky[q] || label[q] !== -1) continue;
          label[q] = id;
          stack.push(q);
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = id;
    }
  }

  const keep = new Uint8Array(n);
  for (let p = 0; p < n; p++) keep[p] = label[p] === best ? 1 : 0;
  // erode by one pixel: the outermost ring of the render is half sky already
  const eroded = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!keep[p]) continue;
      const edge =
        x === 0 ||
        y === 0 ||
        x === w - 1 ||
        y === h - 1 ||
        !keep[p - 1] ||
        !keep[p + 1] ||
        !keep[p - w] ||
        !keep[p + w];
      eroded[p] = edge ? 0 : 1;
    }
  }
  for (let p = 0; p < n; p++) if (!eroded[p]) data[p * 4 + 3] = 0;
}

/** url -> keyed-out data url, so a sprite is only ever cut out once */
const cache = new Map<string, Promise<string>>();

/** The same image with its sky removed. Falls back to the original if a canvas is refused. */
export function cutout(url: string): Promise<string> {
  const hit = cache.get(url);
  if (hit) return hit;
  const job = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(url);
        ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, c.width, c.height);
        keyOutSky(px.data, c.width, c.height);
        ctx.putImageData(px, 0, 0);
        resolve(c.toDataURL('image/png'));
      } catch {
        resolve(url); // tainted canvas or no 2d context: the art is still better than nothing
      }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
  cache.set(url, job);
  return job;
}
