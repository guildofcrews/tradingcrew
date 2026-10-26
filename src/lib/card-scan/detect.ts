import { CARD_RATIO, type Point, type Quad } from "./geometry";

export type Rect = { x: number; y: number; width: number; height: number };

export function rgbaToGray(rgba: Uint8ClampedArray, pixelCount: number): Float32Array {
  const gray = new Float32Array(pixelCount);
  for (let i = 0, p = 0; i < pixelCount; i++, p += 4) {
    gray[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  }
  return gray;
}

type Side = "top" | "bottom" | "left" | "right";

type Window = {
  side: Side;
  along0: number;
  along1: number;
  across0: number;
  across1: number;
};

const SAMPLES = 18;
const MIN_POINTS = 7;
const MIN_EDGE = 12;

/**
 * Find a trading-card quadrilateral in a grayscale image (0–255, row-major).
 * `guide` limits the search to the on-screen frame. Omit it for a library photo.
 */
export function detectCardQuad(
  gray: Float32Array,
  width: number,
  height: number,
  guide?: Rect,
): Quad | null {
  if (width < 20 || height < 20 || gray.length < width * height) return null;
  const blurred = boxBlur(gray, width, height);
  const windows = guide ? guidedWindows(guide, width, height) : unguidedWindows(width, height);
  const lines: Partial<Record<Side, { slope: number; intercept: number }>> = {};

  for (const window of windows) {
    const points = edgePoints(blurred, width, height, window);
    const fit = fitEdge(points, window.side);
    if (!fit) return null;
    lines[window.side] = fit;
  }

  const top = lines.top;
  const bottom = lines.bottom;
  const left = lines.left;
  const right = lines.right;
  if (!top || !bottom || !left || !right) return null;

  const tl = intersect(top, left);
  const tr = intersect(top, right);
  const br = intersect(bottom, right);
  const bl = intersect(bottom, left);
  if (!tl || !tr || !br || !bl) return null;

  const quad: Quad = [tl, tr, br, bl];
  if (!quadLooksLikeCard(quad, width, height, guide)) return null;
  return quad;
}

export function guidedWindows(guide: Rect, width: number, height: number): Window[] {
  const margin = 0.2 * Math.min(guide.width, guide.height);
  const insetX = guide.width * 0.08;
  const insetY = guide.height * 0.08;
  return [
    clampWindow(
      {
        side: "top",
        along0: guide.x + insetX,
        along1: guide.x + guide.width - insetX,
        across0: guide.y - margin,
        across1: guide.y + margin * 1.35,
      },
      width,
      height,
    ),
    clampWindow(
      {
        side: "bottom",
        along0: guide.x + insetX,
        along1: guide.x + guide.width - insetX,
        across0: guide.y + guide.height - margin * 1.35,
        across1: guide.y + guide.height + margin,
      },
      width,
      height,
    ),
    clampWindow(
      {
        side: "left",
        along0: guide.y + insetY,
        along1: guide.y + guide.height - insetY,
        across0: guide.x - margin,
        across1: guide.x + margin * 1.35,
      },
      width,
      height,
    ),
    clampWindow(
      {
        side: "right",
        along0: guide.y + insetY,
        along1: guide.y + guide.height - insetY,
        across0: guide.x + guide.width - margin * 1.35,
        across1: guide.x + guide.width + margin,
      },
      width,
      height,
    ),
  ];
}

export function unguidedWindows(width: number, height: number): Window[] {
  return [
    {
      side: "top",
      along0: width * 0.1,
      along1: width * 0.9,
      across0: height * 0.02,
      across1: height * 0.55,
    },
    {
      side: "bottom",
      along0: width * 0.1,
      along1: width * 0.9,
      across0: height * 0.45,
      across1: height * 0.98,
    },
    {
      side: "left",
      along0: height * 0.1,
      along1: height * 0.9,
      across0: width * 0.02,
      across1: width * 0.55,
    },
    {
      side: "right",
      along0: height * 0.1,
      along1: height * 0.9,
      across0: width * 0.45,
      across1: width * 0.98,
    },
  ];
}

function edgePoints(gray: Float32Array, width: number, height: number, window: Window): Point[] {
  const horizontal = window.side === "top" || window.side === "bottom";
  const alongSpan = window.along1 - window.along0;
  const points: Point[] = [];
  if (alongSpan < 8) return points;

  for (let i = 0; i < SAMPLES; i++) {
    const along = window.along0 + (alongSpan * i) / (SAMPLES - 1);
    let bestAcross = 0;
    let bestStrength = 0;
    const start = Math.max(1, Math.ceil(Math.min(window.across0, window.across1)));
    const end = Math.min(
      (horizontal ? height : width) - 1,
      Math.floor(Math.max(window.across0, window.across1)),
    );
    for (let across = start; across < end; across++) {
      const x = horizontal ? Math.round(along) : across;
      const y = horizontal ? across : Math.round(along);
      if (x <= 0 || y <= 0 || x >= width || y >= height) continue;
      const index = y * width + x;
      const strength = horizontal
        ? Math.abs(gray[index] - gray[index - width])
        : Math.abs(gray[index] - gray[index - 1]);
      if (strength > bestStrength) {
        bestStrength = strength;
        bestAcross = across;
      }
    }
    if (bestStrength < MIN_EDGE) continue;
    points.push(horizontal ? { x: along, y: bestAcross } : { x: bestAcross, y: along });
  }
  return points;
}

function fitEdge(points: Point[], side: Side): { slope: number; intercept: number } | null {
  if (points.length < MIN_POINTS) return null;
  const horizontal = side === "top" || side === "bottom";
  let fit = leastSquares(points, horizontal);
  if (!fit) return null;
  const residuals = points.map((point) => Math.abs((horizontal ? point.y : point.x) - (fit!.slope * (horizontal ? point.x : point.y) + fit!.intercept)));
  const median = medianOf(residuals);
  const limit = Math.max(3, median * 3.2);
  const kept = points.filter((_, index) => residuals[index] <= limit);
  if (kept.length < MIN_POINTS) return null;
  if (kept.length !== points.length) {
    const refit = leastSquares(kept, horizontal);
    if (refit) fit = refit;
  }
  return fit;
}

/** Horizontal edges: y = slope * x + intercept. Vertical edges: x = slope * y + intercept. */
function leastSquares(points: Point[], horizontal: boolean): { slope: number; intercept: number } | null {
  let sumA = 0;
  let sumB = 0;
  let sumAA = 0;
  let sumAB = 0;
  for (const point of points) {
    const a = horizontal ? point.x : point.y;
    const b = horizontal ? point.y : point.x;
    sumA += a;
    sumB += b;
    sumAA += a * a;
    sumAB += a * b;
  }
  const n = points.length;
  const denom = n * sumAA - sumA * sumA;
  if (Math.abs(denom) < 1e-6) {
    return { slope: 0, intercept: sumB / n };
  }
  const slope = (n * sumAB - sumA * sumB) / denom;
  const intercept = (sumB - slope * sumA) / n;
  return { slope, intercept };
}

function intersect(
  horizontal: { slope: number; intercept: number },
  vertical: { slope: number; intercept: number },
): Point | null {
  const denom = 1 - vertical.slope * horizontal.slope;
  if (Math.abs(denom) < 1e-6) return null;
  const x = (vertical.slope * horizontal.intercept + vertical.intercept) / denom;
  const y = horizontal.slope * x + horizontal.intercept;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function quadLooksLikeCard(quad: Quad, width: number, height: number, guide?: Rect): boolean {
  const [tl, tr, br, bl] = quad;
  if (tl.y >= bl.y || tr.y >= br.y || tl.x >= tr.x || bl.x >= br.x) return false;

  const margin = 4;
  for (const point of quad) {
    if (point.x < -margin || point.y < -margin || point.x > width + margin || point.y > height + margin) {
      return false;
    }
  }
  if (!isConvex(quad)) return false;

  const top = distance(tl, tr);
  const bottom = distance(bl, br);
  const left = distance(tl, bl);
  const right = distance(tr, br);
  if (top < width * 0.12 || left < height * 0.12) return false;
  if (Math.abs(top - bottom) / Math.max(top, bottom) > 0.55) return false;
  if (Math.abs(left - right) / Math.max(left, right) > 0.55) return false;

  const ratio = ((top + bottom) / 2) / ((left + right) / 2);
  if (ratio < CARD_RATIO - 0.24 || ratio > CARD_RATIO + 0.26) return false;

  const area = polygonArea(quad);
  const minArea = guide ? guide.width * guide.height * 0.28 : width * height * 0.08;
  const maxArea = width * height * 0.98;
  if (area < minArea || area > maxArea) return false;

  if (guide) {
    const cx = (tl.x + tr.x + br.x + bl.x) / 4;
    const cy = (tl.y + tr.y + br.y + bl.y) / 4;
    const pad = 0.2 * Math.min(guide.width, guide.height);
    if (
      cx < guide.x - pad ||
      cy < guide.y - pad ||
      cx > guide.x + guide.width + pad ||
      cy > guide.y + guide.height + pad
    ) {
      return false;
    }
  }
  return true;
}

function isConvex(quad: Quad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    const c = quad[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-3) continue;
    const next = Math.sign(cross);
    if (sign === 0) sign = next;
    else if (next !== sign) return false;
  }
  return sign !== 0;
}

function polygonArea(quad: Quad): number {
  let sum = 0;
  for (let i = 0; i < 4; i++) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function boxBlur(gray: Float32Array, width: number, height: number): Float32Array {
  const temp = new Float32Array(gray.length);
  const out = new Float32Array(gray.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const left = gray[y * width + Math.max(0, x - 1)];
      const mid = gray[y * width + x];
      const right = gray[y * width + Math.min(width - 1, x + 1)];
      temp[y * width + x] = (left + mid + right) / 3;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const up = temp[Math.max(0, y - 1) * width + x];
      const mid = temp[y * width + x];
      const down = temp[Math.min(height - 1, y + 1) * width + x];
      out[y * width + x] = (up + mid + down) / 3;
    }
  }
  return out;
}

function clampWindow(window: Window, width: number, height: number): Window {
  const horizontal = window.side === "top" || window.side === "bottom";
  const alongMax = horizontal ? width - 1 : height - 1;
  const acrossMax = horizontal ? height - 1 : width - 1;
  return {
    side: window.side,
    along0: clamp(window.along0, 1, alongMax - 1),
    along1: clamp(window.along1, 1, alongMax - 1),
    across0: clamp(window.across0, 1, acrossMax - 1),
    across1: clamp(window.across1, 1, acrossMax - 1),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
