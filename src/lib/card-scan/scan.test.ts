import assert from "node:assert/strict";
import { test } from "node:test";
import { detectCardQuad, type Rect } from "./detect";
import { enhanceCardRgba } from "./enhance";
import {
  applyHomography,
  homographyFromTo,
  warpRgba,
  type Point,
  type Quad,
} from "./geometry";
import { guideToFrame } from "./frame-map";
import { nextArm } from "./steady";

function fillRect(width: number, height: number, rect: Rect, background: number, ink: number): Float32Array {
  const gray = new Float32Array(width * height);
  gray.fill(background);
  const x0 = Math.round(rect.x);
  const y0 = Math.round(rect.y);
  const x1 = Math.round(rect.x + rect.width);
  const y1 = Math.round(rect.y + rect.height);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) gray[y * width + x] = ink;
  }
  return gray;
}

function pointInQuad(point: Point, quad: Quad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (Math.abs(cross) < 0.01) continue;
    const next = Math.sign(cross);
    if (sign === 0) sign = next;
    else if (next !== sign) return false;
  }
  return sign !== 0;
}

function fillQuad(width: number, height: number, quad: Quad, background: number, ink: number): Float32Array {
  const gray = new Float32Array(width * height);
  gray.fill(background);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pointInQuad({ x: x + 0.5, y: y + 0.5 }, quad)) gray[y * width + x] = ink;
    }
  }
  return gray;
}

function closeTo(actual: Point, expected: Point, slack: number) {
  assert.ok(
    Math.hypot(actual.x - expected.x, actual.y - expected.y) <= slack,
    `expected ${expected.x},${expected.y} got ${actual.x.toFixed(1)},${actual.y.toFixed(1)}`,
  );
}

test("homography maps the source corners onto the destination", () => {
  const from: Quad = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 20 },
    { x: 0, y: 20 },
  ];
  const to: Quad = [
    { x: 2, y: 3 },
    { x: 12, y: 4 },
    { x: 11, y: 22 },
    { x: 1, y: 18 },
  ];
  const homography = homographyFromTo(from, to);
  assert.ok(homography);
  to.forEach((point, index) => {
    const mapped = applyHomography(homography, from[index].x, from[index].y);
    closeTo(mapped, point, 0.02);
  });
});

test("warp copies a flat color through a skewed quad", () => {
  const width = 40;
  const height = 40;
  const src = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < src.length; i += 4) {
    src[i] = 220;
    src[i + 1] = 20;
    src[i + 2] = 30;
    src[i + 3] = 255;
  }
  const corners: Quad = [
    { x: 4, y: 6 },
    { x: 30, y: 4 },
    { x: 34, y: 32 },
    { x: 6, y: 34 },
  ];
  const warped = warpRgba(src, width, height, corners, 20, 28);
  assert.ok(warped);
  assert.equal(warped[0], 220);
  assert.equal(warped[warped.length - 2], 30);
});

test("detects an axis-aligned card without a guide", () => {
  const width = 200;
  const height = 280;
  const card: Rect = { x: 30, y: 40, width: 140, height: 196 };
  const gray = fillRect(width, height, card, 30, 200);
  const quad = detectCardQuad(gray, width, height);
  assert.ok(quad, "quad should be found");
  closeTo(quad[0], { x: 30, y: 40 }, 4);
  closeTo(quad[1], { x: 170, y: 40 }, 4);
  closeTo(quad[2], { x: 170, y: 236 }, 4);
  closeTo(quad[3], { x: 30, y: 236 }, 4);
});

test("detects a card inside the camera guide", () => {
  const width = 200;
  const height = 280;
  const card: Rect = { x: 36, y: 48, width: 130, height: 182 };
  const gray = fillRect(width, height, card, 25, 210);
  const guide: Rect = { x: 24, y: 34, width: 154, height: 210 };
  const quad = detectCardQuad(gray, width, height, guide);
  assert.ok(quad);
  closeTo(quad[0], { x: 36, y: 48 }, 5);
  closeTo(quad[2], { x: 166, y: 230 }, 5);
});

test("detects a mildly skewed card", () => {
  const width = 220;
  const height = 300;
  const corners: Quad = [
    { x: 40, y: 50 },
    { x: 170, y: 36 },
    { x: 180, y: 240 },
    { x: 28, y: 250 },
  ];
  const gray = fillQuad(width, height, corners, 20, 210);
  const quad = detectCardQuad(gray, width, height);
  assert.ok(quad, "skewed quad should be found");
  closeTo(quad[0], corners[0], 8);
  closeTo(quad[1], corners[1], 8);
  closeTo(quad[2], corners[2], 8);
  closeTo(quad[3], corners[3], 8);
});

test("blank frames are not cards", () => {
  const gray = new Float32Array(180 * 240);
  gray.fill(40);
  assert.equal(detectCardQuad(gray, 180, 240), null);
});

test("enhancement stays close to the original", () => {
  const rgba = new Uint8ClampedArray(20 * 20 * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 180;
    rgba[i + 1] = 140;
    rgba[i + 2] = 90;
    rgba[i + 3] = 255;
  }
  const before = rgba[0];
  enhanceCardRgba(rgba, 20, 20);
  assert.ok(Math.abs(rgba[0] - before) < 40, `shift was ${rgba[0] - before}`);
  assert.equal(rgba[3], 255);
});

test("the camera guide maps through object-fit cover", () => {
  const rect = guideToFrame(
    1000,
    2000,
    { left: 0, top: 0, width: 100, height: 200 },
    { left: 25, top: 20, width: 50, height: 140 },
    1000,
    2000,
  );
  assert.ok(rect);
  assert.equal(rect.x, 250);
  assert.equal(rect.y, 200);
  assert.equal(rect.width, 500);
  assert.equal(rect.height, 1400);
});

test("auto-capture waits for stillness, then requires motion", () => {
  let state = nextArm("armed", 0, null, true);
  assert.equal(state.shouldSnap, false);
  state = nextArm(state.state, state.steadyFrames, 3, true);
  state = nextArm(state.state, state.steadyFrames, 3, true);
  state = nextArm(state.state, state.steadyFrames, 3, true);
  assert.equal(state.shouldSnap, false);
  state = nextArm(state.state, state.steadyFrames, 3, true);
  assert.equal(state.shouldSnap, true);
  assert.equal(state.state, "wait-for-motion");
  const held = nextArm(state.state, state.steadyFrames, 2, true);
  assert.equal(held.shouldSnap, false);
  const moved = nextArm(held.state, held.steadyFrames, 20, false);
  assert.equal(moved.state, "armed");
});
