export type ArmState = "armed" | "wait-for-motion";

export function meanAbsDiff(current: Float32Array, previous: Float32Array | null): number | null {
  if (!previous || previous.length !== current.length || current.length === 0) return null;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < current.length; i += 8) {
    sum += Math.abs(current[i] - previous[i]);
    count += 1;
  }
  return count ? sum / count : null;
}

export const STEADY_DIFF = 8;
export const MOTION_DIFF = 14;
export const STEADY_FRAMES = 4;

/**
 * Auto-capture only after the picture has been still, with a card in frame,
 * for several checks. After a snap the camera must see the card move
 * before it will snap again, so one card is not saved twice.
 */
export function nextArm(
  state: ArmState,
  steadyFrames: number,
  diff: number | null,
  quadFound: boolean,
): { state: ArmState; steadyFrames: number; shouldSnap: boolean } {
  if (diff === null) {
    return { state, steadyFrames: 0, shouldSnap: false };
  }
  if (state === "wait-for-motion") {
    if (diff >= MOTION_DIFF) {
      return { state: "armed", steadyFrames: 0, shouldSnap: false };
    }
    return { state, steadyFrames: 0, shouldSnap: false };
  }
  if (diff <= STEADY_DIFF && quadFound) {
    const frames = steadyFrames + 1;
    if (frames >= STEADY_FRAMES) {
      return { state: "wait-for-motion", steadyFrames: 0, shouldSnap: true };
    }
    return { state: "armed", steadyFrames: frames, shouldSnap: false };
  }
  return { state: "armed", steadyFrames: 0, shouldSnap: false };
}
