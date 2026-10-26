/**
 * Light cleanup for a flattened card: a nudge toward neutral color,
 * a gentle contrast stretch, and a small unsharp mask.
 * Strengths are intentionally modest so holos and photos stay natural.
 */
export function enhanceCardRgba(rgba: Uint8ClampedArray, width: number, height: number): void {
  const count = width * height;
  if (count === 0 || rgba.length < count * 4) return;

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  for (let i = 0; i < count; i++) {
    const p = i * 4;
    sumR += rgba[p];
    sumG += rgba[p + 1];
    sumB += rgba[p + 2];
  }
  const avgR = sumR / count || 1;
  const avgG = sumG / count || 1;
  const avgB = sumB / count || 1;
  const gray = (avgR + avgG + avgB) / 3;
  const scaleR = clamp(gray / avgR, 0.88, 1.14);
  const scaleG = clamp(gray / avgG, 0.88, 1.14);
  const scaleB = clamp(gray / avgB, 0.88, 1.14);
  const balanceMix = 0.62;

  const luma = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const p = i * 4;
    const r = rgba[p] * scaleR;
    const g = rgba[p + 1] * scaleG;
    const b = rgba[p + 2] * scaleB;
    rgba[p] = mix(rgba[p], r, balanceMix);
    rgba[p + 1] = mix(rgba[p + 1], g, balanceMix);
    rgba[p + 2] = mix(rgba[p + 2], b, balanceMix);
    luma[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  }

  const sorted = Array.from(luma).sort((a, b) => a - b);
  const low = sorted[Math.floor(count * 0.05)] ?? 0;
  const high = sorted[Math.floor(count * 0.95)] ?? 255;
  const span = high - low;
  if (span > 24 && span < 230) {
    const mid = (low + high) / 2;
    const factor = clamp(168 / span, 1, 1.28);
    const contrastMix = 0.5;
    for (let i = 0; i < count; i++) {
      const current = luma[i];
      if (current < 1) continue;
      const stretched = clamp((current - mid) * factor + mid, 0, 255);
      const gain = mix(1, stretched / current, contrastMix);
      const p = i * 4;
      rgba[p] = clamp(rgba[p] * gain, 0, 255);
      rgba[p + 1] = clamp(rgba[p + 1] * gain, 0, 255);
      rgba[p + 2] = clamp(rgba[p + 2] * gain, 0, 255);
    }
  }

  unsharp(rgba, width, height, 0.3);
}

function unsharp(rgba: Uint8ClampedArray, width: number, height: number, amount: number): void {
  const copy = new Uint8ClampedArray(rgba);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        let around = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            around += copy[((y + dy) * width + (x + dx)) * 4 + channel];
          }
        }
        const blurred = around / 9;
        const sharp = copy[index + channel] + amount * (copy[index + channel] - blurred);
        rgba[index + channel] = clamp(sharp, 0, 255);
      }
    }
  }
}

function mix(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
