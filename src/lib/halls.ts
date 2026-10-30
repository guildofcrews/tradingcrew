/* ─────────────────────────────────────────────────────────────
 * Library Halls — data shape, geometry and camera math.
 * Pure functions, no React. Units are CSS px in a 3D space where
 * x → right, y → down, z → toward the viewer (CSS convention).
 * ───────────────────────────────────────────────────────────── */

/** One doorway in a hall. Main hall: a category. Category hall: a set. */
export interface HallRoom {
  id: string;
  name: string;
  /** Short uppercase tagline on the plaque, e.g. "TRAINERS & MONSTERS". */
  eyebrow: string;
  /** Any CSS color; use a token, e.g. "var(--tc-wing-pokemon)". */
  accent: string;
  /** Line under the name, e.g. "53 cards" or "5 cards · Approx. $2.69". */
  countLabel: string;
  /** Where stepping through the doorway navigates to. */
  href: string;
  /** Up to 3 card image URLs shown on the room's back wall (optional). */
  previewImageUrls?: string[];
  /** Card shown in the glass display case just before this room (optional). */
  featured?: { title: string; imageUrl: string };
}

/** What waits at the far end of the hall. */
export type HallEnd =
  | { kind: "vault" } // main hall: locked Digital Vault (NFTs, coming soon)
  | { kind: "exit"; label: string; href: string }; // category hall: way back up a level

export const HALL = {
  halfWidth: 450, // corridor is 900 wide
  ceilingY: -300,
  floorY: 220,
  wallHeight: 520,
  entranceDepth: 400, // plain entrance walls from z=+400 to 0
  firstStation: 700, // first pair of rooms centred at z = -700
  stationSpacing: 1000, // each further pair is 1000 deeper
  roomLength: 520, // doorway wall segment
  firstGlassLength: 440, // glass bay between entrance and first rooms
  finalGlassLength: 540, // glass bay before the end wall
  viewOffset: 380, // when focused, stop this far short of the room centre
  glanceYaw: 20, // deg the camera turns toward a focused room
  enterDolly: 560, // how far the camera moves into a doorway when entering
  endViewDistance: 900, // distance from the end wall when focused on it
  hideBehind: 620, // sections whose far edge is past this z (after the camera) are hidden
  fogStart: 900,
  fogRange: 2400,
  fogMax: 0.85,
  transitionMs: 1150, // keep in sync with --tc-hall-move
} as const;

export type Side = "L" | "R";

export type WallContent =
  | { kind: "plain"; label: string }
  | { kind: "glass"; accent: string; featured?: HallRoom["featured"] }
  | { kind: "room"; roomIndex: number };

export interface HallSection {
  index: number;
  zNear: number;
  zFar: number;
  L: WallContent;
  R: WallContent;
}

export interface HallLayout {
  rooms: HallRoom[];
  sections: HallSection[];
  endZ: number;
  end: HallEnd;
}

/** Rooms alternate left/right: 0 L, 1 R, 2 L, 3 R … Two rooms share a "station". */
export const sideOf = (roomIndex: number): Side => (roomIndex % 2 === 0 ? "L" : "R");
export const stationOf = (roomIndex: number): number => Math.floor(roomIndex / 2);
const stationCenterZ = (k: number) => -(HALL.firstStation + k * HALL.stationSpacing);
/** Section index of the doorway wall for a room (entrance = 0, then glass/room pairs). */
export const roomSectionIndex = (roomIndex: number) => 2 + 2 * stationOf(roomIndex);

export const END_ACCENT = { vault: "var(--tc-vault)", exit: "var(--tc-gold)" } as const;

/**
 * Lay the hall out along -z:
 * entrance · glass · rooms(0,1) · glass · rooms(2,3) · … · glass · end wall.
 * An odd last room gets a glass bay opposite it.
 */
export function buildHallLayout(rooms: HallRoom[], end: HallEnd, entranceLabels: [string, string]): HallLayout {
  const sections: HallSection[] = [];
  const stations = Math.max(1, Math.ceil(rooms.length / 2));
  const glass = (r: HallRoom | undefined, fallbackAccent: string): WallContent => ({
    kind: "glass",
    accent: r?.accent ?? fallbackAccent,
    featured: r?.featured,
  });
  const endAccent = END_ACCENT[end.kind];

  sections.push({
    index: 0,
    zNear: HALL.entranceDepth,
    zFar: 0,
    L: { kind: "plain", label: entranceLabels[0] },
    R: { kind: "plain", label: entranceLabels[1] },
  });

  for (let k = 0; k < stations; k++) {
    const zc = stationCenterZ(k);
    const roomNear = zc + HALL.roomLength / 2;
    const roomFar = zc - HALL.roomLength / 2;
    const glassNear = k === 0 ? 0 : stationCenterZ(k - 1) - HALL.roomLength / 2;
    const left = rooms[2 * k];
    const right = rooms[2 * k + 1];

    sections.push({
      index: sections.length,
      zNear: glassNear,
      zFar: roomNear,
      L: glass(left, endAccent),
      R: glass(right ?? left, endAccent),
    });
    sections.push({
      index: sections.length,
      zNear: roomNear,
      zFar: roomFar,
      L: left ? { kind: "room", roomIndex: 2 * k } : glass(undefined, endAccent),
      R: right ? { kind: "room", roomIndex: 2 * k + 1 } : glass(left, endAccent),
    });
  }

  const lastFar = sections[sections.length - 1].zFar;
  const endZ = lastFar - HALL.finalGlassLength;
  sections.push({
    index: sections.length,
    zNear: lastFar,
    zFar: endZ,
    L: { kind: "glass", accent: endAccent },
    R: { kind: "glass", accent: endAccent },
  });

  return { rooms, sections, endZ, end };
}

export interface Camera {
  z: number; // world shift toward the viewer
  yaw: number; // deg, applied after the shift
  dolly: number; // extra push after turning (entering a room)
}

/**
 * stop: -1 = entrance, 0..n-1 = room, n = end wall.
 * Camera transform, prepended to EVERY plane's own transform:
 * translateZ(dolly) rotateY(yaw) translateZ(z).
 */
export function cameraFor(layout: HallLayout, stop: number, entered: boolean): Camera {
  const n = layout.rooms.length;
  if (stop >= 0 && stop < n) {
    const zc = stationCenterZ(stationOf(stop));
    const left = sideOf(stop) === "L";
    return entered
      ? { z: -zc, yaw: left ? -90 : 90, dolly: HALL.enterDolly }
      : { z: -zc - HALL.viewOffset, yaw: left ? -HALL.glanceYaw : HALL.glanceYaw, dolly: 0 };
  }
  if (stop === n) return { z: -layout.endZ - HALL.endViewDistance, yaw: 0, dolly: 0 };
  return { z: 0, yaw: 0, dolly: 0 };
}

export function sceneTransform(cam: Camera): string {
  return `translateZ(${cam.dolly}px) rotateY(${cam.yaw}deg) translateZ(${cam.z}px)`;
}

/** Hide what is behind the camera; when inside a room, keep only its neighbourhood. */
export function isSectionHidden(s: HallSection, cam: Camera, entered: boolean, stop: number): boolean {
  if (entered) return Math.abs(s.index - roomSectionIndex(stop)) > 1;
  return s.zFar + cam.z > HALL.hideBehind;
}

/** 0 → clear, up to fogMax → nearly black. */
export function fogOpacity(zMid: number, cam: Camera, entered: boolean): number {
  if (entered) return 0;
  const dist = -(zMid + cam.z);
  return Math.max(0, Math.min(HALL.fogMax, (dist - HALL.fogStart) / HALL.fogRange));
}

/* Plane transforms (transform-origin: 0 0 on every plane). */
export const planeTransforms = {
  leftWall: (s: HallSection) =>
    `translate3d(${-HALL.halfWidth}px, ${HALL.ceilingY}px, ${s.zNear}px) rotateY(90deg)`,
  rightWall: (s: HallSection) =>
    `translate3d(${HALL.halfWidth}px, ${HALL.ceilingY}px, ${s.zFar}px) rotateY(-90deg)`,
  floor: (s: HallSection) =>
    `translate3d(${-HALL.halfWidth}px, ${HALL.floorY}px, ${s.zFar}px) rotateX(90deg)`,
  ceiling: (s: HallSection) =>
    `translate3d(${-HALL.halfWidth}px, ${HALL.ceilingY}px, ${s.zNear}px) rotateX(-90deg)`,
  endWall: (endZ: number) => `translate3d(${-HALL.halfWidth}px, ${HALL.ceilingY}px, ${endZ}px)`,
};
