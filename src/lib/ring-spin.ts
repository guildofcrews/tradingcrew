/**
 * Spin and snap for a circular card ring.
 * A future Gallery Wall can reuse these helpers (and `useRingSpin`) without three.js.
 * Offset is an unbounded card count: 0 is the first card, 1 is the next, and it may wrap.
 */

/** Cards share one circle up to this many. Larger sets keep this spacing and only mount a window. */
export const RING_SLOT_CAP = 16;
/** How many cards stay mounted on either side of the front card once the cap is passed. */
export const RING_WINDOW_SIDE = 7;

const FRICTION = 4.2;
const SNAP_SPEED = 0.35;
const STIFFNESS = 14;
const REDUCED_RATE = 14;
const MAX_DT = 0.032;
const VELOCITY_CAP = 8;

export interface RingMetrics {
  /** Positions around the circle. Equals the card count until the cap. */
  slots: number;
  /** Degrees between neighbors. */
  step: number;
  /** Orbit radius in px. Neighbor centers are at least a card width plus the gap apart. */
  radius: number;
}

export interface SpinSample {
  offset: number;
  /** Cards per second. Positive offset brings the next card in from the right. */
  velocity: number;
  /** Unbounded card index to ease toward. Null while coasting. */
  target: number | null;
}

export function ringMetrics(count: number, cardWidth: number, gap: number): RingMetrics {
  const safeCount = Math.max(0, Math.floor(count));
  const width = Math.max(cardWidth, 1);
  if (safeCount <= 1) {
    return { slots: 1, step: 0, radius: Math.max(width * 1.6, 280) };
  }
  const slots = Math.min(safeCount, RING_SLOT_CAP);
  const step = 360 / slots;
  const chord = width + Math.max(gap, 0);
  const half = ((step * Math.PI) / 180) / 2;
  const fitted = chord / (2 * Math.sin(half));
  return { slots, step, radius: Math.max(fitted, width * 1.35) };
}

/** Shortest signed distance from a continuous offset to a card index, in cards. */
export function ringDelta(index: number, offset: number, count: number): number {
  if (count <= 0) return 0;
  const delta = index - offset;
  return delta - count * Math.round(delta / count);
}

export function nearestIndex(offset: number, count: number): number {
  if (count <= 0) return 0;
  const rounded = Math.round(offset);
  return ((rounded % count) + count) % count;
}

/** Mount every card until the cap. After that, only the nearby arc. */
export function ringInWindow(index: number, offset: number, count: number): boolean {
  if (count <= 0 || index < 0 || index >= count) return false;
  if (count <= RING_SLOT_CAP) return true;
  return Math.abs(ringDelta(index, offset, count)) <= RING_WINDOW_SIDE + 0.5;
}

/**
 * CSS rotateY degrees. 0 faces the camera.
 * Positive rotateY carries a card toward the viewer's right, so a later card (positive delta) waits on the right.
 */
export function ringFacingAngle(delta: number, step: number): number {
  return delta * step;
}

/** Full-resolution art is only worth fetching close to the camera. */
export function ringShowsArt(delta: number): boolean {
  return Math.abs(delta) <= 2.5;
}

export function ringOpacity(delta: number): number {
  const distance = Math.abs(delta);
  if (distance <= 0.35) return 1;
  return Math.max(0.18, 1 - distance * 0.22);
}

/** Dragging left (negative dx) increases the offset so the next card arrives from the right. */
export function dragOffset(offset: number, dx: number, pixelsPerCard: number): number {
  if (!(pixelsPerCard > 0)) return offset;
  return offset - dx / pixelsPerCard;
}

export function spinSettled(sample: SpinSample): boolean {
  return sample.target == null && sample.velocity === 0 && sample.offset === Math.round(sample.offset);
}

/**
 * Advance a coast, then a snap.
 * Reduced motion drops velocity and eases to the target or the nearest card.
 */
export function integrateSpin(sample: SpinSample, dt: number, reducedMotion: boolean): SpinSample {
  const step = Math.min(Math.max(dt, 0), MAX_DT);
  if (step === 0) return sample;

  if (reducedMotion) {
    const goal = sample.target ?? Math.round(sample.offset);
    const next = sample.offset + (goal - sample.offset) * Math.min(1, step * REDUCED_RATE);
    if (Math.abs(goal - next) < 0.002) return { offset: goal, velocity: 0, target: null };
    return { offset: next, velocity: 0, target: goal };
  }

  let { offset, velocity, target } = sample;
  velocity = Math.max(-VELOCITY_CAP, Math.min(VELOCITY_CAP, velocity));

  if (target == null && Math.abs(velocity) < SNAP_SPEED) {
    const goal = Math.round(offset);
    if (Math.abs(goal - offset) < 0.001) return { offset: goal, velocity: 0, target: null };
    target = goal;
  }

  if (target != null) {
    const gap = target - offset;
    offset += gap * STIFFNESS * step;
    if (Math.abs(target - offset) < 0.004) return { offset: target, velocity: 0, target: null };
    return { offset, velocity: gap * STIFFNESS, target };
  }

  velocity *= Math.exp(-FRICTION * step);
  offset += velocity * step;
  return { offset, velocity, target: null };
}
