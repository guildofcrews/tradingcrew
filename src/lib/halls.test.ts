import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HALL,
  buildHallLayout,
  cameraFor,
  cameraTransform,
  frameFor,
  framingAfterLook,
  isSectionHidden,
  roomInView,
  roomSectionIndex,
  stationOf,
  type HallRoom,
  type Pose,
} from "./halls";

function room(id: string): HallRoom {
  return {
    id,
    name: id,
    eyebrow: "Set",
    accent: "var(--tc-wing-pokemon)",
    countLabel: "1 card",
    href: `/library/pokemon?set=${id}`,
  };
}

function layoutOf(count: number) {
  const rooms = Array.from({ length: count }, (_, i) => room(`set-${i}`));
  return buildHallLayout(rooms, { kind: "exit", label: "Back to the Library", href: "/library" }, [
    "Pokémon",
    "Library Halls",
  ]);
}

describe("hall camera", () => {
  it("pivots a look on the eye and prepends that camera to every plane", () => {
    const layout = layoutOf(8);
    const stop = 6;
    assert.equal(stationOf(stop), 3);
    assert.ok(roomSectionIndex(stop) > 2);

    const pose = frameFor(layout, stop, false);
    assert.ok(pose.z > 2000);
    assert.equal(pose.look, -20);
    assert.equal(pose.rev, false);

    const cam = cameraFor(layout, pose, -1);
    assert.equal(cam.dolly, 0);
    assert.equal(cam.turn, 0);
    assert.equal(cam.look, -20);

    const transform = cameraTransform(cam);
    assert.match(
      transform,
      /^translateZ\(0px\) translateZ\(800px\) rotateY\(-20deg\) translateZ\(-800px\) rotateY\(0deg\) translateZ\(\d+px\)$/,
    );
    assert.equal(transform.includes("scale"), false);

    const entered = cameraFor(layout, pose, stop);
    assert.equal(entered.turn, -90);
    assert.equal(entered.dolly, 560);
    assert.equal(entered.look, 0);
    assert.match(
      cameraTransform(entered),
      /^translateZ\(560px\) translateZ\(800px\) rotateY\(0deg\) translateZ\(-800px\) rotateY\(-90deg\) translateZ\(/,
    );
  });

  it("hides a section only once it is behind the eye, and keeps neighbours while entering", () => {
    const layout = layoutOf(6);
    const pose = frameFor(layout, 4, false);
    const cam = cameraFor(layout, pose, -1);
    const behind = layout.sections.filter((section) => isSectionHidden(section, cam, -1));
    assert.ok(behind.length > 0);
    for (const section of behind) {
      assert.ok(section.zFar + cam.z > HALL.hideBehind);
    }
    const ahead = layout.sections.find((section) => section.index === roomSectionIndex(4));
    assert.ok(ahead);
    assert.equal(isSectionHidden(ahead, cam, -1), false);

    const inside = cameraFor(layout, pose, 4);
    const shown = layout.sections.filter((section) => !isSectionHidden(section, inside, 4));
    assert.ok(shown.length > 0);
    assert.ok(shown.length < layout.sections.length);
  });

  it("treats a doorway as in view from its framed spot, and frames after a look", () => {
    const layout = layoutOf(8);
    const framed = frameFor(layout, 6, false);
    assert.equal(roomInView(layout, framed), 6);

    const glancing: Pose = { z: framed.z, look: 0, rev: false };
    const after = framingAfterLook(layout, { ...framed, look: framed.look + 8 });
    assert.ok(after);
    assert.equal(after.pose.look, framed.look);
    assert.equal(roomInView(layout, glancing) === 6 || roomInView(layout, glancing) === -1, true);
  });
});
