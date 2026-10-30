/* ─────────────────────────────────────────────────────────────
 * Library Halls — data shape, geometry, camera and navigation math.
 * Pure functions, no React. Units are CSS px in a 3D space where
 * x → right, y → down, z → toward the viewer (CSS convention).
 *
 * The viewer's EYE sits HALL.perspective (800px) in front of the
 * scene origin — that is what `perspective: 800px` on the stage means.
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
  | { kind: "vault"; href: string; countLabel: string } // main hall: enterable Digital Vault
  | { kind: "exit"; label: string; href: string }; // category hall: way back up a level

export const HALL = {
  /* Corridor */
  halfWidth: 450, // corridor is 900 wide
  ceilingY: -300,
  floorY: 220,
  wallHeight: 520,
  perspective: 800, // eye distance in front of the scene origin (= stage perspective)
  entranceDepth: 760, // entrance walls reach back to here, just past the eye at the start
  firstStation: 700, // first pair of rooms centred at z = -700
  stationSpacing: 1000, // each further pair is 1000 deeper
  roomLength: 520, // doorway wall segment
  finalGlassLength: 540, // glass bay before the end wall
  endViewDistance: 900, // how close you can walk to the end wall

  /* Walking & looking */
  step: 250, // one press of ▲/▼ (¼ of the room spacing)
  lookStep: 20, // degrees per press of ◀/▶
  lookMax: 60, // degrees either side
  dragDegPerPx: 0.18, // drag right → look left (grab the world)
  dragThresholdPx: 8, // below this a press is still a tap
  swipeThresholdPx: 50, // vertical swipe that counts as a step

  /* Doors */
  frameOffset: 380, // a door's viewing spot is this far short of it (eye ends up 1180 away)
  frameLook: 20, // …turned this many degrees toward its wall — the whole door fits above the controls
  inViewDeg: 15, // a door is "in view" when you face it within this angle…
  inViewMinDist: 200, // …and it is between these distances from the eye
  inViewMaxDist: 1500,
  enterDolly: 560, // how far the camera moves into a doorway when entering

  /* Rendering */
  hideBehind: 1000, // sections entirely this far behind the scene origin are hidden (≈200 behind the eye)
  fogStart: 900,
  fogRange: 2400,
  fogMax: 0.85,

  /* Motion per kind of move — applied as --tc-hall-mv on the stage (0 with reduced motion) */
  moveMs: { step: 600, jump: 1150, turn: 1150, drag: 140 },
} as const;

export type MoveMode = keyof typeof HALL.moveMs;
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
  /** Furthest the viewer can walk (z of the pose at the end wall). */
  maxZ: number;
  end: HallEnd;
}

/** Where the viewer is: z = distance walked from the entrance, look = head turn (deg, − = left), rev = turned around. */
export interface Pose {
  z: number;
  look: number;
  rev: boolean;
}

/** Rooms alternate left/right: 0 L, 1 R, 2 L, 3 R … Two rooms share a "station". */
export const sideOf = (roomIndex: number): Side => (roomIndex % 2 === 0 ? "L" : "R");
export const stationOf = (roomIndex: number): number => Math.floor(roomIndex / 2);
export const stationCenterZ = (k: number) => -(HALL.firstStation + k * HALL.stationSpacing);
/** Section index of the doorway wall for a room (entrance = 0, then glass/room pairs). */
export const roomSectionIndex = (roomIndex: number) => 2 + 2 * stationOf(roomIndex);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const END_ACCENT = { vault: "var(--tc-vault)", exit: "var(--tc-gold)" } as const;

/* ── Layout ─────────────────────────────────────────────────── */

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

    sections.push({ index: sections.length, zNear: glassNear, zFar: roomNear, L: glass(left, endAccent), R: glass(right ?? left, endAccent) });
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
  sections.push({ index: sections.length, zNear: lastFar, zFar: endZ, L: { kind: "glass", accent: endAccent }, R: { kind: "glass", accent: endAccent } });

  return { rooms, sections, endZ, maxZ: -endZ - HALL.endViewDistance, end };
}

/* ── Doors: viewing spot & "in view" ───────────────────────── */

/** The spot (and head turn) from which a whole doorway fits on screen. Facing back, it's on the far side, mirrored. */
export function frameFor(layout: HallLayout, roomIndex: number, rev: boolean): Pose {
  const zc = stationCenterZ(stationOf(roomIndex));
  const left = sideOf(roomIndex) === "L";
  if (!rev) return { z: clamp(-zc - HALL.frameOffset, 0, layout.maxZ), look: left ? -HALL.frameLook : HALL.frameLook, rev };
  return { z: clamp(-zc + HALL.frameOffset, 0, layout.maxZ), look: left ? HALL.frameLook : -HALL.frameLook, rev };
}

/**
 * The room you are FACING (or -1): its doorway is within inViewDeg of where you look
 * and within reading distance. Measured from the eye. Far doors near the vanishing
 * point also sit near screen centre, so a screen-distance test picks the wrong room.
 */
export function roomInView(layout: HallLayout, pose: Pose): number {
  let best = -1;
  let bestDeg: number = HALL.inViewDeg;
  const a = (pose.look * Math.PI) / 180;
  layout.rooms.forEach((_, i) => {
    const zRel = stationCenterZ(stationOf(i)) + pose.z;
    let x = sideOf(i) === "L" ? -HALL.halfWidth : HALL.halfWidth;
    let z = zRel;
    if (pose.rev) {
      x = -x;
      z = -zRel;
    }
    const zEye = z - HALL.perspective;
    const xr = x * Math.cos(a) + zEye * Math.sin(a);
    const zr = -x * Math.sin(a) + zEye * Math.cos(a);
    const dist = -zr;
    if (dist < HALL.inViewMinDist || dist > HALL.inViewMaxDist) return;
    const deg = Math.abs((Math.atan2(xr, dist) * 180) / Math.PI);
    if (deg < bestDeg) {
      bestDeg = deg;
      best = i;
    }
  });
  return best;
}

/** After a look: if a door is now in view, glide to its viewing spot so the full doorway shows. */
export function framingAfterLook(layout: HallLayout, pose: Pose): { pose: Pose; moved: boolean } | null {
  const i = roomInView(layout, pose);
  if (i < 0) return null;
  const f = frameFor(layout, i, pose.rev);
  return { pose: f, moved: Math.abs(f.z - pose.z) > 60 };
}

/* ── Camera ────────────────────────────────────────────────── */

export interface CameraState {
  /** World shift along the hall. */
  z: number;
  /** Head turn — pivots on the EYE. */
  look: number;
  /** Body turn (0 / 180) or the 90° turn into a doorway — pivots on the scene origin. */
  turn: number;
  /** Extra push after turning (entering a room). */
  dolly: number;
  /** Facing back toward the entrance (affects culling + fog). */
  rev: boolean;
}

export function cameraFor(layout: HallLayout, pose: Pose, enteredRoom: number): CameraState {
  if (enteredRoom >= 0) {
    const zc = stationCenterZ(stationOf(enteredRoom));
    return { z: -zc, look: 0, turn: sideOf(enteredRoom) === "L" ? -90 : 90, dolly: HALL.enterDolly, rev: false };
  }
  return { z: pose.z, look: pose.look, turn: pose.rev ? 180 : 0, dolly: 0, rev: pose.rev };
}

/**
 * Camera transform, prepended to EVERY plane's own transform (never put it on the
 * scene container — once the container is pushed past the viewer, browsers stop
 * hit-testing inside it). Look pivots on the eye (translateZ(P) … translateZ(-P)) so
 * turning your head never swings the viewpoint out through a wall. Same function
 * list in every state so CSS interpolates each part smoothly.
 */
export function cameraTransform(c: CameraState): string {
  const P = HALL.perspective;
  return `translateZ(${c.dolly}px) translateZ(${P}px) rotateY(${c.look}deg) translateZ(${-P}px) rotateY(${c.turn}deg) translateZ(${c.z}px)`;
}

/** Hide sections fully behind you; inside a room keep only its neighbourhood. */
export function isSectionHidden(s: HallSection, c: CameraState, enteredRoom: number): boolean {
  if (enteredRoom >= 0) return Math.abs(s.index - roomSectionIndex(enteredRoom)) > 1;
  return c.rev ? -(s.zNear + c.z) > HALL.hideBehind : s.zFar + c.z > HALL.hideBehind;
}

/** 0 → clear, up to fogMax → nearly black, by distance ahead of you. */
export function fogOpacity(zMid: number, c: CameraState, enteredRoom: number): number {
  if (enteredRoom >= 0) return 0;
  const dist = c.rev ? zMid + c.z : -(zMid + c.z);
  return clamp((dist - HALL.fogStart) / HALL.fogRange, 0, HALL.fogMax);
}

/* ── Map & labels ──────────────────────────────────────────── */

/** 0..1 along the hall map. */
export const mapPosition = (layout: HallLayout, z: number) => (layout.maxZ > 0 ? clamp(z / layout.maxZ, 0, 1) : 0);

/** Names of the next pair of rooms in the direction you face, or the end you're heading to. */
export function nextUpLabel(layout: HallLayout, pose: Pose, entranceLabel = "Entrance"): string {
  const stations = Math.ceil(layout.rooms.length / 2);
  const ks = Array.from({ length: stations }, (_, k) => k).filter((k) => {
    const fz = frameFor(layout, 2 * k, false).z;
    return pose.rev ? fz < pose.z - 10 : fz > pose.z + 10;
  });
  if (!ks.length) return pose.rev ? entranceLabel : layout.end.kind === "vault" ? "Digital Vault" : layout.end.label;
  const k = pose.rev ? ks[ks.length - 1] : ks[0];
  return layout.rooms
    .filter((_, i) => stationOf(i) === k)
    .map((r) => r.name)
    .join(" · ");
}

/** "On your left/right" for a room, accounting for being turned around. */
export const relativeSide = (roomIndex: number, rev: boolean) => ((sideOf(roomIndex) === "L") !== rev ? "On your left" : "On your right");

/* ── Plane transforms (transform-origin: 0 0 on every plane) ── */
export const planeTransforms = {
  leftWall: (s: HallSection) => `translate3d(${-HALL.halfWidth}px, ${HALL.ceilingY}px, ${s.zNear}px) rotateY(90deg)`,
  rightWall: (s: HallSection) => `translate3d(${HALL.halfWidth}px, ${HALL.ceilingY}px, ${s.zFar}px) rotateY(-90deg)`,
  floor: (s: HallSection) => `translate3d(${-HALL.halfWidth}px, ${HALL.floorY}px, ${s.zFar}px) rotateX(90deg)`,
  ceiling: (s: HallSection) => `translate3d(${-HALL.halfWidth}px, ${HALL.ceilingY}px, ${s.zNear}px) rotateX(-90deg)`,
  endWall: (endZ: number) => `translate3d(${-HALL.halfWidth}px, ${HALL.ceilingY}px, ${endZ}px)`,
  /** Faces back down the hall; only shown when turned around (backface hidden). */
  entranceWall: () => `translate3d(${HALL.halfWidth}px, ${HALL.ceilingY}px, ${HALL.entranceDepth}px) rotateY(180deg)`,
};
