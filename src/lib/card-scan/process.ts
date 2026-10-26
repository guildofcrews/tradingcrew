import { detectCardQuad, type Rect } from "./detect";
import { enhanceCardRgba } from "./enhance";
import {
  CARD_OUTPUT_HEIGHT,
  CARD_OUTPUT_WIDTH,
  warpRgba,
  type Quad,
} from "./geometry";

export type ScanResult = {
  cleaned: Blob | null;
  original: Blob;
  scanStatus: "cleaned" | "original";
};

const MAX_EDGE = 1600;
const DETECT_EDGE = 480;

/**
 * Card cleanup runs on the phone, not the server.
 *
 * OpenCV.js is several megabytes and would delay the first snap on a cellular
 * connection. Vercel functions can sharpen with sharp, but they cannot find
 * corners without a native vision binary. The on-screen guide already tells
 * us roughly where the card is, so a few-kilobyte edge search plus a
 * homography is faster and more reliable here. The original photo is always
 * kept so a miss can be straightened by hand and reprocessed later.
 */
export async function processCardCanvas(
  source: CanvasImageSource & { width: number; height: number },
  guide: Rect | null,
): Promise<ScanResult> {
  const fitted = drawFitted(source, MAX_EDGE);
  const original = await canvasToJpeg(fitted.canvas, 0.8);
  const detected = detectOnCanvas(fitted.canvas, guide ? scaleRect(guide, fitted.scale) : undefined);
  if (!detected) {
    return { cleaned: null, original, scanStatus: "original" };
  }
  const cleaned = await warpCanvas(fitted.canvas, detected);
  if (!cleaned) {
    return { cleaned: null, original, scanStatus: "original" };
  }
  return { cleaned, original, scanStatus: "cleaned" };
}

export async function warpBlobFromCorners(
  image: CanvasImageSource & { width: number; height: number },
  corners: Quad,
): Promise<Blob | null> {
  const fitted = drawFitted(image, MAX_EDGE);
  const scale = fitted.scale;
  const quad = corners.map((point) => ({ x: point.x * scale, y: point.y * scale })) as Quad;
  return warpCanvas(fitted.canvas, quad);
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not save the photo"))),
      "image/jpeg",
      quality,
    );
  });
}

function drawFitted(
  source: CanvasImageSource & { width: number; height: number },
  maxEdge: number,
): { canvas: HTMLCanvasElement; scale: number } {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not read the photo");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { canvas, scale };
}

function detectOnCanvas(canvas: HTMLCanvasElement, guide?: Rect): Quad | null {
  const detectScale = Math.min(1, DETECT_EDGE / Math.max(canvas.width, canvas.height));
  const dw = Math.max(1, Math.round(canvas.width * detectScale));
  const dh = Math.max(1, Math.round(canvas.height * detectScale));
  const small = document.createElement("canvas");
  small.width = dw;
  small.height = dh;
  const ctx = small.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(canvas, 0, 0, dw, dh);
  const pixels = ctx.getImageData(0, 0, dw, dh).data;
  const gray = new Float32Array(dw * dh);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.299 * pixels[p] + 0.587 * pixels[p + 1] + 0.114 * pixels[p + 2];
  }
  const scaledGuide = guide
    ? {
        x: guide.x * detectScale,
        y: guide.y * detectScale,
        width: guide.width * detectScale,
        height: guide.height * detectScale,
      }
    : undefined;
  const quad = detectCardQuad(gray, dw, dh, scaledGuide);
  if (!quad) return null;
  return quad.map((point) => ({ x: point.x / detectScale, y: point.y / detectScale })) as Quad;
}

async function warpCanvas(canvas: HTMLCanvasElement, quad: Quad): Promise<Blob | null> {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const warped = warpRgba(pixels.data, canvas.width, canvas.height, quad, CARD_OUTPUT_WIDTH, CARD_OUTPUT_HEIGHT);
  if (!warped) return null;
  enhanceCardRgba(warped, CARD_OUTPUT_WIDTH, CARD_OUTPUT_HEIGHT);
  const out = document.createElement("canvas");
  out.width = CARD_OUTPUT_WIDTH;
  out.height = CARD_OUTPUT_HEIGHT;
  const outCtx = out.getContext("2d");
  if (!outCtx) return null;
  const outputPixels = new Uint8ClampedArray(new ArrayBuffer(warped.byteLength));
  outputPixels.set(warped);
  outCtx.putImageData(new ImageData(outputPixels, CARD_OUTPUT_WIDTH, CARD_OUTPUT_HEIGHT), 0, 0);
  return canvasToJpeg(out, 0.86);
}

function scaleRect(rect: Rect, scale: number): Rect {
  return {
    x: rect.x * scale,
    y: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}
