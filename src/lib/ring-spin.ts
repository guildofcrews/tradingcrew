/**
 * Spin and snap for a card ring or a straight walk.
 * A future Gallery Wall can reuse these helpers (and `useRingSpin`) without three.js.
 * Offset counts cards or doorways: 0 is the first, 1 is the next.
 * A full ring may wrap. A short arc or a hallway stops at the ends.
 */

/** Cards share one circle up to this many. Larger sets keep this spacing and only mount a window. */
export const RING_SLOT_CAP = 16;
/** How many cards stay mounted on either side of the front card once the cap is passed. */
export const RING_WINDOW_SIDE = 7;
/** Neighbors stay at least this face-on. A smaller set uses an arc instead of a full circle. */
export const RING_MAX_STEP = 28;

const FRICTION = 4.2;
const SNAP_SPEED = 0.35;
const STIFFNESS = 14;
const REDUCED_RATE = 14;
const MAX_DT = 0.032;
const VELOCITY_CAP = 8;

export interface RingMetrics {
  /** Positions around the circle. Equals the card count until the cap. */
  slots: number;
  /** Degrees between neighbors. Never wider than `RING_MAX_STEP`. */
  step: number;
  /** Orbit radius in px. Neighbor centers are at least a card width plus the gap apart. */
  radius: number;
  /** False when the cards occupy a front arc and the spin stops at the ends. */
  wraps: boolean;
}

export interface SpinBounds {
  min: number;
  max: number;
}

/** A full circle only when even spacing is already within the friendly step. */
export function ringWraps(count: number): boolean {
  if (count <= 1) return false;
  const slots = Math.min(Math.floor(count), RING_SLOT_CAP);
  return 360 / slots <= RING_MAX_STEP + 0.001;
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
    return { slots: 1, step: 0, radius: Math.max(width * 1.6, 280), wraps: false };
  }
  const wraps = ringWraps(safeCount);
  const slots = Math.min(safeCount, RING_SLOT_CAP);
  const step = wraps ? 360 / slots : RING_MAX_STEP;
  const chord = width + Math.max(gap, 0);
  const half = ((step * Math.PI) / 180) / 2;
  const fitted = chord / (2 * Math.sin(half));
  return { slots, step, radius: Math.max(fitted, width * 1.35), wraps };
}

/**
 * Signed distance from a continuous offset to an index, in cards.
 * A ring takes the short way around. An arc keeps the straight difference.
 */
export function ringDelta(index: number, offset: number, count: number, wraps = true): number {
  if (count <= 0) return 0;
  const delta = index - offset;
  if (!wraps) return delta;
  return delta - count * Math.round(delta / count);
}

export function nearestIndex(offset: number, count: number, wraps = true): number {
  if (count <= 0) return 0;
  const rounded = Math.round(offset);
  if (!wraps) return Math.max(0, Math.min(count - 1, rounded));
  return ((rounded % count) + count) % count;
}

/** Let a drag pull past the ends, but only part of the way. */
export function resistEdge(offset: number, min: number, max: number): number {
  if (offset < min) return min + (offset - min) * 0.35;
  if (offset > max) return max + (offset - max) * 0.35;
  return offset;
}

/** Mount every card until the cap. After that, only the nearby arc. */
export function ringInWindow(index: number, offset: number, count: number, wraps = true): boolean {
  if (count <= 0 || index < 0 || index >= count) return false;
  if (count <= RING_SLOT_CAP) return true;
  return Math.abs(ringDelta(index, offset, count, wraps)) <= RING_WINDOW_SIDE + 0.5;
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

function holdInside(sample: SpinSample, bounds?: SpinBounds | null): SpinSample {
  if (!bounds) return sample;
  const target = sample.target == null ? null : Math.max(bounds.min, Math.min(bounds.max, sample.target));
  if (sample.offset < bounds.min || sample.offset > bounds.max) {
    const edge = sample.offset < bounds.min ? bounds.min : bounds.max;
    if (Math.abs(sample.offset - edge) < 0.004) return { offset: edge, velocity: 0, target: null };
    return { offset: sample.offset, velocity: 0, target: edge };
  }
  return target === sample.target ? sample : { ...sample, target };
}

/**
 * Advance a coast, then a snap.
 * Reduced motion drops velocity and eases to the target or the nearest card.
 * Bounds stop a hallway or a short arc at the ends.
 */
export function integrateSpin(
  sample: SpinSample,
  dt: number,
  reducedMotion: boolean,
  bounds?: SpinBounds | null,
): SpinSample {
  const step = Math.min(Math.max(dt, 0), MAX_DT);
  if (step === 0) return holdInside(sample, bounds);

  if (reducedMotion) {
    const raw = sample.target ?? Math.round(sample.offset);
    const goal = bounds ? Math.max(bounds.min, Math.min(bounds.max, raw)) : raw;
    const next = sample.offset + (goal - sample.offset) * Math.min(1, step * REDUCED_RATE);
    const eased =
      Math.abs(goal - next) < 0.002
        ? { offset: goal, velocity: 0, target: null }
        : { offset: next, velocity: 0, target: goal };
    return holdInside(eased, bounds);
  }

  let { offset, velocity, target } = sample;
  velocity = Math.max(-VELOCITY_CAP, Math.min(VELOCITY_CAP, velocity));
  if (bounds && target != null) target = Math.max(bounds.min, Math.min(bounds.max, target));

  if (target == null && Math.abs(velocity) < SNAP_SPEED) {
    const goal = bounds ? Math.max(bounds.min, Math.min(bounds.max, Math.round(offset))) : Math.round(offset);
    if (Math.abs(goal - offset) < 0.001) return { offset: goal, velocity: 0, target: null };
    target = goal;
  }

  if (target != null) {
    const gap = target - offset;
    offset += gap * STIFFNESS * step;
    if (Math.abs(target - offset) < 0.004) return holdInside({ offset: target, velocity: 0, target: null }, bounds);
    return holdInside({ offset, velocity: gap * STIFFNESS, target }, bounds);
  }

  velocity *= Math.exp(-FRICTION * step);
  offset += velocity * step;
  return holdInside({ offset, velocity, target: null }, bounds);
}
