/** One corridor slice. Doors are not adjacent: decor bays sit between them. */
export const HALL_BAY = 420;

const DECOR = ["glass", "books", "nook", "pillar"] as const;

export type DecorKind = (typeof DECOR)[number];

export interface HallBay {
  index: number;
  kind: "door" | DecorKind;
  /** Set when `kind` is `door`. */
  doorIndex?: number;
  side: "left" | "right";
}

function mix(n: number): number {
  return Math.abs((Math.imul(n, 1103515245) + 12345) | 0);
}

/** 1 or 2 interludes after this door. Stable for a given door index. */
export function decorAfter(doorIndex: number): number {
  return 1 + (mix(doorIndex + 1) % 2);
}

function decorKind(doorIndex: number, slot: number): DecorKind {
  return DECOR[mix(doorIndex * 4 + slot + 2) % DECOR.length];
}

/**
 * Door, then one or two decor bays, then the next door.
 * The last door has nothing after it. Sides alternate.
 */
export function hallBays(doorCount: number): HallBay[] {
  const count = Math.max(0, Math.floor(doorCount));
  const bays: HallBay[] = [];
  for (let door = 0; door < count; door += 1) {
    bays.push({
      index: bays.length,
      kind: "door",
      doorIndex: door,
      side: door % 2 === 0 ? "left" : "right",
    });
    if (door === count - 1) break;
    const extras = decorAfter(door);
    for (let slot = 0; slot < extras; slot += 1) {
      bays.push({
        index: bays.length,
        kind: decorKind(door, slot),
        side: (door + slot) % 2 === 0 ? "right" : "left",
      });
    }
  }
  return bays;
}

export function doorSlot(bays: readonly HallBay[], doorIndex: number): number {
  for (const bay of bays) {
    if (bay.kind === "door" && bay.doorIndex === doorIndex) return bay.index;
  }
  return 0;
}

/**
 * Corridor depth for a continuous door offset.
 * 0 is the first doorway. 1 is the next doorway, with the decor bays in between.
 */
export function hallDepth(bays: readonly HallBay[], offset: number): number {
  const doors = bays.filter((bay) => bay.kind === "door");
  if (doors.length === 0) return 0;
  const last = doors.length - 1;
  if (offset <= 0) return offset * HALL_BAY;
  if (offset >= last) return (doors[last].index + (offset - last)) * HALL_BAY;
  const i0 = Math.floor(offset);
  const t = offset - i0;
  const z0 = doors[i0]?.index ?? 0;
  const z1 = doors[i0 + 1]?.index ?? z0;
  return (z0 + (z1 - z0) * t) * HALL_BAY;
}
