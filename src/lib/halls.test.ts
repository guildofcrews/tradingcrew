import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildHallLayout,
  cameraFor,
  isSectionHidden,
  roomSectionIndex,
  sceneTransform,
  stationOf,
  type HallRoom,
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

describe("hall camera", () => {
  it("turns toward a deep doorway without putting the camera on the scene", () => {
    const rooms = Array.from({ length: 8 }, (_, i) => room(`set-${i}`));
    const layout = buildHallLayout(rooms, { kind: "exit", label: "Back to the Library", href: "/library" }, [
      "Pokémon",
      "Library Halls",
    ]);
    const stop = 6;
    assert.equal(stationOf(stop), 3);
    assert.ok(roomSectionIndex(stop) > 2);

    const cam = cameraFor(layout, stop, false);
    assert.ok(cam.z > 2000);
    assert.equal(cam.yaw, -20);
    assert.equal(cam.dolly, 0);

    const transform = sceneTransform(cam);
    assert.match(transform, /^translateZ\(0px\) rotateY\(-20deg\) translateZ\(\d+px\)$/);
    assert.equal(transform.includes("scale"), false);

    const entered = cameraFor(layout, stop, true);
    assert.equal(entered.yaw, -90);
    assert.equal(entered.dolly, 560);
    assert.match(sceneTransform(entered), /^translateZ\(560px\) rotateY\(-90deg\) translateZ\(/);
  });

  it("hides sections behind the camera and keeps the doorway's neighbours when entering", () => {
    const rooms = Array.from({ length: 6 }, (_, i) => room(`set-${i}`));
    const layout = buildHallLayout(rooms, { kind: "vault" }, ["TradingCrew", "Library Halls"]);
    const cam = cameraFor(layout, 4, false);
    const behind = layout.sections.filter((section) => isSectionHidden(section, cam, false, 4));
    assert.ok(behind.length > 0);

    const inside = cameraFor(layout, 4, true);
    const shown = layout.sections.filter((section) => !isSectionHidden(section, inside, true, 4));
    assert.ok(shown.length > 0);
    assert.ok(shown.length < layout.sections.length);
  });
});
