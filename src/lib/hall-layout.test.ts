import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decorAfter, doorSlot, hallBays, hallDepth, HALL_BAY } from "./hall-layout";

describe("hallBays", () => {
  it("puts one or two decor bays between doors and never stacks doors", () => {
    const bays = hallBays(6);
    const doors = bays.filter((bay) => bay.kind === "door");
    assert.equal(doors.length, 6);
    for (let i = 0; i < doors.length - 1; i += 1) {
      const gap = doors[i + 1].index - doors[i].index - 1;
      assert.ok(gap === 1 || gap === 2, `gap after door ${i} was ${gap}`);
      assert.equal(gap, decorAfter(i));
    }
    assert.equal(bays.at(-1)?.kind, "door");
    assert.deepEqual(hallBays(6), bays);
  });

  it("is empty without doors and a single door stands alone", () => {
    assert.deepEqual(hallBays(0), []);
    assert.deepEqual(hallBays(1), [{ index: 0, kind: "door", doorIndex: 0, side: "left" }]);
  });
});

describe("hallDepth", () => {
  it("lands on a doorway and walks through the bays between", () => {
    const bays = hallBays(4);
    assert.equal(hallDepth(bays, 0), 0);
    assert.equal(hallDepth(bays, 1), doorSlot(bays, 1) * HALL_BAY);
    assert.equal(hallDepth(bays, 3), doorSlot(bays, 3) * HALL_BAY);
    const mid = hallDepth(bays, 0.5);
    const end = doorSlot(bays, 1) * HALL_BAY;
    assert.ok(mid > 0 && mid < end);
    assert.equal(mid, end / 2);
    assert.ok(hallDepth(bays, 1.2) > hallDepth(bays, 1));
    assert.ok(hallDepth(bays, -0.2) < 0);
  });
});
