/** Geometry of the fixed 640×480 virtual stage every screen is drawn on. */
export const STAGE_W = 640;
export const STAGE_H = 480;

/** A quarter-turn has to buy at least this much scale before we offer it. */
const ROTATE_GAIN = 1.15;

/**
 * Uniform scale that fits the stage inside a `vw`×`vh` box without cropping it.
 * `rotated` swaps the stage's own axes (a quarter-turn, so it fills a portrait screen).
 */
export function fitScale(vw: number, vh: number, rotated = false): number {
  const w = rotated ? STAGE_H : STAGE_W;
  const h = rotated ? STAGE_W : STAGE_H;
  const s = Math.min(vw / w, vh / h);
  // before the first measurement (and on degenerate viewports) fall back to 1:1
  return Number.isFinite(s) && s > 0 ? s : 1;
}

/** True when the viewport is portrait enough that a quarter-turn makes the stage noticeably bigger. */
export function rotationHelps(vw: number, vh: number): boolean {
  if (!(vw > 0) || !(vh > 0) || vw >= vh) return false;
  return fitScale(vw, vh, true) >= fitScale(vw, vh, false) * ROTATE_GAIN;
}
