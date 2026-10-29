import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dragOffset,
  integrateSpin,
  nearestIndex,
  ringDelta,
  ringFacingAngle,
  ringInWindow,
  ringMetrics,
  ringShowsArt,
  resistEdge,
  spinSettled,
  RING_MAX_STEP,
  RING_SLOT_CAP,
  type SpinSample,
} from "./ring-spin";

function centerDistance(radius: number, step: number): number {
  return 2 * radius * Math.sin(((step * Math.PI) / 180) / 2);
}

describe("ringMetrics", () => {
  it("keeps neighboring cards from overlapping and caps the ring", () => {
    for (let count = 2; count <= 40; count += 1) {
      const metrics = ringMetrics(count, 190, 48);
      assert.ok(centerDistance(metrics.radius, metrics.step) >= 190 - 0.05, `count ${count}`);
    }
    const capped = ringMetrics(RING_SLOT_CAP, 190, 48);
    const large = ringMetrics(40, 190, 48);
    assert.equal(large.radius, capped.radius);
    assert.equal(large.step, capped.step);
    assert.equal(large.slots, RING_SLOT_CAP);
    assert.equal(large.wraps, true);
  });

  it("keeps a small set on a tight arc instead of turning neighbors edge-on", () => {
    const five = ringMetrics(5, 190, 48);
    assert.equal(five.wraps, false);
    assert.equal(five.step, RING_MAX_STEP);
    assert.ok(five.step < 72);
    const pair = ringMetrics(2, 190, 48);
    assert.equal(pair.wraps, false);
    assert.equal(pair.step, RING_MAX_STEP);
    assert.equal(ringMetrics(RING_SLOT_CAP, 190, 48).wraps, true);
  });

  it("gives a single card a viewing distance", () => {
    const solo = ringMetrics(1, 190, 48);
    assert.equal(solo.step, 0);
    assert.ok(solo.radius >= 280);
  });

  it("stays a ring on a phone-width card", () => {
    const phone = ringMetrics(12, 117, 20);
    assert.ok(phone.radius > 117);
    assert.ok(centerDistance(phone.radius, phone.step) >= 117 - 0.05);
  });
});

describe("ringDelta", () => {
  it("picks the short way around the circle", () => {
    assert.equal(ringDelta(1, 0, 10), 1);
    assert.equal(ringDelta(9, 0, 10), -1);
    assert.equal(ringDelta(0, 9, 10), 1);
    assert.equal(nearestIndex(9, 10), 9);
    assert.equal(nearestIndex(-1, 10), 9);
    assert.equal(nearestIndex(10, 10), 0);
    assert.equal(ringFacingAngle(1, 22.5), 22.5);
    assert.equal(ringDelta(0, 9, 10, false), -9);
    assert.equal(nearestIndex(-0.4, 5, false), 0);
    assert.equal(nearestIndex(8, 5, false), 4);
  });

  it("mounts a window once the set is larger than the ring", () => {
    let mounted = 0;
    for (let index = 0; index < 40; index += 1) {
      if (ringInWindow(index, 0, 40)) mounted += 1;
    }
    assert.equal(mounted, 15);
    assert.equal(ringInWindow(0, 0, 40), true);
    assert.equal(ringInWindow(8, 0, 40), false);
    assert.equal(ringInWindow(33, 0, 40), true);
    assert.equal(ringInWindow(3, 0, 10), true);
    assert.equal(ringShowsArt(2), true);
    assert.equal(ringShowsArt(2.6), false);
  });
});

describe("integrateSpin", () => {
  it("coasts and then snaps to a card", () => {
    let sample: SpinSample = { offset: 0.1, velocity: 3, target: null };
    for (let frame = 0; frame < 300 && !spinSettled(sample); frame += 1) {
      sample = integrateSpin(sample, 0.016, false);
    }
    assert.equal(spinSettled(sample), true);
    assert.equal(sample.offset, Math.round(sample.offset));
    assert.ok(sample.offset >= 0 && sample.offset <= 3);
  });

  it("drops momentum when motion is reduced", () => {
    let coast: SpinSample = { offset: 0.2, velocity: 9, target: null };
    for (let frame = 0; frame < 80 && !spinSettled(coast); frame += 1) {
      coast = integrateSpin(coast, 0.016, true);
    }
    assert.deepEqual(coast, { offset: 0, velocity: 0, target: null });

    let aimed: SpinSample = { offset: 0.2, velocity: 9, target: 4 };
    for (let frame = 0; frame < 80 && !spinSettled(aimed); frame += 1) {
      aimed = integrateSpin(aimed, 0.016, true);
    }
    assert.deepEqual(aimed, { offset: 4, velocity: 0, target: null });
  });

  it("turns a leftward drag into a higher offset", () => {
    assert.equal(dragOffset(0, -190, 190), 1);
    assert.equal(dragOffset(2, 95, 190), 1.5);
  });

  it("stops at the ends of an arc", () => {
    let sample: SpinSample = { offset: 3.2, velocity: 6, target: null };
    for (let frame = 0; frame < 300 && !spinSettled(sample); frame += 1) {
      sample = integrateSpin(sample, 0.016, false, { min: 0, max: 4 });
    }
    assert.equal(spinSettled(sample), true);
    assert.equal(sample.offset, 4);

    let pulled: SpinSample = { offset: 0.2, velocity: -5, target: null };
    for (let frame = 0; frame < 300 && !spinSettled(pulled); frame += 1) {
      pulled = integrateSpin(pulled, 0.016, false, { min: 0, max: 4 });
    }
    assert.equal(pulled.offset, 0);
    assert.equal(resistEdge(-2, 0, 4), -0.7);
    assert.equal(resistEdge(1.5, 0, 4), 1.5);
  });
});
