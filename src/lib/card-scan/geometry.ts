export type Point = { x: number; y: number };
/** Corners in order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point];

export const CARD_RATIO = 2.5 / 3.5;
export const CARD_OUTPUT_WIDTH = 625;
export const CARD_OUTPUT_HEIGHT = 875;

/**
 * 3x3 row-major homography mapping `from` points onto `to` points.
 * Returns null when the point sets are degenerate.
 */
export function homographyFromTo(from: Quad, to: Quad): number[] | null {
  const matrix: number[][] = [];
  const rhs: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i];
    const { x: u, y: v } = to[i];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    rhs.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    rhs.push(v);
  }
  const solved = solveLinear(matrix, rhs);
  if (!solved) return null;
  return [solved[0], solved[1], solved[2], solved[3], solved[4], solved[5], solved[6], solved[7], 1];
}

export function applyHomography(h: number[], x: number, y: number): Point {
  const w = h[6] * x + h[7] * y + h[8];
  if (Math.abs(w) < 1e-8) return { x: 0, y: 0 };
  return {
    x: (h[0] * x + h[1] * y + h[2]) / w,
    y: (h[3] * x + h[4] * y + h[5]) / w,
  };
}

/** Inverse-map a destination rectangle onto `sourceCorners` and bilinear-sample. */
export function warpRgba(
  src: Uint8ClampedArray,
  sw: number,
  sh: number,
  sourceCorners: Quad,
  dw: number,
  dh: number,
): Uint8ClampedArray | null {
  const dest: Quad = [
    { x: 0, y: 0 },
    { x: dw - 1, y: 0 },
    { x: dw - 1, y: dh - 1 },
    { x: 0, y: dh - 1 },
  ];
  const homography = homographyFromTo(dest, sourceCorners);
  if (!homography) return null;

  const out = new Uint8ClampedArray(dw * dh * 4);
  const maxX = sw - 1;
  const maxY = sh - 1;
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const sample = applyHomography(homography, x, y);
      const sx = clamp(sample.x, 0, maxX);
      const sy = clamp(sample.y, 0, maxY);
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(x0 + 1, maxX);
      const y1 = Math.min(y0 + 1, maxY);
      const tx = sx - x0;
      const ty = sy - y0;
      const destIndex = (y * dw + x) * 4;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = (y0 * sw + x1) * 4;
      const i01 = (y1 * sw + x0) * 4;
      const i11 = (y1 * sw + x1) * 4;
      for (let channel = 0; channel < 4; channel++) {
        const top = src[i00 + channel] * (1 - tx) + src[i10 + channel] * tx;
        const bottom = src[i01 + channel] * (1 - tx) + src[i11 + channel] * tx;
        out[destIndex + channel] = top * (1 - ty) + bottom * ty;
      }
    }
  }
  return out;
}

function solveLinear(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const rows = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    }
    if (Math.abs(rows[pivot][col]) < 1e-9) return null;
    const swap = rows[col];
    rows[col] = rows[pivot];
    rows[pivot] = swap;
    const divisor = rows[col][col];
    for (let c = col; c <= n; c++) rows[col][c] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = rows[row][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) rows[row][c] -= factor * rows[col][c];
    }
  }
  return rows.map((row) => row[n]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
