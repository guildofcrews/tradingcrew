"use client";

import { useCallback, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";
import { HALL, frameFor, framingAfterLook, roomInView, type HallLayout, type MoveMode, type Pose } from "@/lib/halls";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function reducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface NavState {
  pose: Pose;
  mode: MoveMode;
  /** Room being entered (camera moving through its doorway), or -1. */
  entered: number;
  /** Rooms the viewer has faced at least once. */
  visited: Record<number, true>;
  /** Rooms faced, in order (for "Previous room"). */
  trail: number[];
  /** The movement pad or keyboard has been used — retires the "Use your keyboard" link. */
  usedControls: boolean;
  /** Keyboard card open. */
  keysOpen: boolean;
}

/**
 * All hall movement in one place: pose, actions, door framing, visited/trail,
 * keyboard, drag-to-look and swipe-to-walk. UI components only read the
 * returned state and call the returned actions.
 */
export function useHallNavigation(layout: HallLayout, initialRoomId?: string, initialPose?: Pose) {
  const [state, setState] = useState<NavState>(() => {
    const i = initialRoomId ? layout.rooms.findIndex((r) => r.id === initialRoomId) : -1;
    const framed = i >= 0 ? frameFor(layout, i, false) : { z: 0, look: 0, rev: false };
    const pose = initialPose
      ? {
          z: clamp(initialPose.z, 0, layout.maxZ),
          look: clamp(initialPose.look, -HALL.lookMax, HALL.lookMax),
          rev: initialPose.rev,
        }
      : framed;
    const iv = roomInView(layout, pose);
    return {
      pose,
      mode: "jump",
      entered: -1,
      visited: iv >= 0 ? { [iv]: true } : {},
      trail: iv >= 0 ? [iv] : [],
      usedControls: false,
      keysOpen: false,
    };
  });

  /** Apply a pose change and record which room (if any) is now faced. */
  const move = useCallback(
    (next: Partial<Pose>, mode: MoveMode, extra: Partial<NavState> = {}) =>
      setState((s) => {
        const pose = { ...s.pose, ...next };
        const iv = roomInView(layout, pose);
        const visited = iv >= 0 ? { ...s.visited, [iv]: true as const } : s.visited;
        const trail = iv >= 0 && s.trail[s.trail.length - 1] !== iv ? [...s.trail, iv].slice(-12) : s.trail;
        return { ...s, pose, mode, entered: -1, visited, trail, ...extra };
      }),
    [layout],
  );

  const { pose } = state;
  const inView = state.entered >= 0 ? -1 : roomInView(layout, pose);
  const used = { usedControls: true };

  /* ── Actions ─────────────────────────────────────────────── */
  const walk = (dir: 1 | -1) => move({ z: clamp(pose.z + dir * (pose.rev ? -1 : 1) * HALL.step, 0, layout.maxZ) }, "step", used);

  const lookBy = (deg: number) => {
    const look = clamp(pose.look + deg, -HALL.lookMax, HALL.lookMax);
    const framed = framingAfterLook(layout, { ...pose, look });
    if (framed) move(framed.pose, framed.moved ? "jump" : "step", used);
    else move({ look }, "step", used);
  };

  const actions = {
    forward: () => walk(1),
    back: () => walk(-1),
    lookLeft: () => lookBy(-HALL.lookStep),
    lookRight: () => lookBy(HALL.lookStep),
    lookAhead: () => move({ look: 0 }, "step", used),
    turnAround: () => move({ rev: !pose.rev, look: 0 }, "turn", used),
    goToRoom: (i: number) => move(frameFor(layout, i, false), "jump"),
    goToEntrance: () => move({ z: 0, look: 0, rev: false }, "jump"),
    goToEnd: () => move({ z: layout.maxZ, look: 0, rev: false }, "jump"),
    previousRoom: () => {
      const prev = state.trail.length > 1 ? state.trail[state.trail.length - 2] : -1;
      if (prev >= 0) move(frameFor(layout, prev, false), "jump", used);
    },
    enter: (i: number) => setState((s) => ({ ...s, entered: i, mode: "jump" })),
    leaveRoom: () => setState((s) => ({ ...s, entered: -1, mode: "jump" })),
    openKeys: () => setState((s) => ({ ...s, keysOpen: true })),
    closeKeys: () => setState((s) => ({ ...s, keysOpen: false })),
  };

  /** Tap on a doorway: first tap walks to it, a tap on the door you're facing enters. */
  const suppressUntil = useRef(0);
  const pickRoom = (i: number) => {
    if (suppressUntil.current > Date.now()) return; // the press was a drag, not a tap
    if (i === inView) actions.enter(i);
    else actions.goToRoom(i);
  };

  /* ── Keyboard (only while the hall has focus) ───────────── */
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const k = e.key;
    if (e.target !== e.currentTarget && (k === "Enter" || k === " ")) return; // let focused buttons work
    if (k === "Escape") {
      if (state.keysOpen) actions.closeKeys();
      else if (state.entered >= 0) actions.leaveRoom();
      return;
    }
    if (state.entered >= 0) return;
    if (k === "Enter" && inView >= 0) {
      e.preventDefault();
      actions.enter(inView);
      return;
    }
    const map: Record<string, () => void> = {
      ArrowUp: actions.forward, w: actions.forward, W: actions.forward,
      ArrowDown: actions.back, s: actions.back, S: actions.back,
      ArrowLeft: actions.lookLeft, a: actions.lookLeft, A: actions.lookLeft,
      ArrowRight: actions.lookRight, d: actions.lookRight, D: actions.lookRight,
      r: actions.turnAround, R: actions.turnAround,
      c: actions.lookAhead, C: actions.lookAhead,
    };
    const f = map[k];
    if (f) {
      e.preventDefault();
      f();
    }
  };

  /* ── Drag to look, swipe to walk ─────────────────────────── */
  const drag = useRef<{ x: number; y: number; look: number; moved: boolean } | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (state.entered >= 0) return;
    if ((e.target as HTMLElement).closest("[data-hall-overlay]")) return; // controls handle their own presses
    drag.current = { x: e.clientX, y: e.clientY, look: pose.look, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) > HALL.dragThresholdPx && Math.abs(dx) > Math.abs(dy)) d.moved = true;
    if (d.moved) {
      const look = clamp(Math.round(d.look - dx * HALL.dragDegPerPx), -HALL.lookMax, HALL.lookMax);
      setState((s) => ({ ...s, pose: { ...s.pose, look }, mode: "drag" }));
    }
  };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      suppressUntil.current = Date.now() + 250;
      // Settle: frame a door if the drag ended facing one.
      setState((s) => {
        const framed = framingAfterLook(layout, s.pose);
        const pose = framed ? framed.pose : s.pose;
        const iv = roomInView(layout, pose);
        return {
          ...s,
          pose,
          mode: "jump",
          visited: iv >= 0 ? { ...s.visited, [iv]: true } : s.visited,
          trail: iv >= 0 && s.trail[s.trail.length - 1] !== iv ? [...s.trail, iv].slice(-12) : s.trail,
        };
      });
      return;
    }
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > HALL.swipeThresholdPx && Math.abs(dy) > Math.abs(dx)) {
      suppressUntil.current = Date.now() + 250;
      if (dy < 0) actions.forward();
      else actions.back();
    }
  };

  /* Reduced motion: report it so callers can skip the walk-in delay. */
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, reducedMotionSnapshot, () => false);

  const previous = state.trail.length > 1 ? state.trail[state.trail.length - 2] : -1;

  return {
    ...state,
    inView,
    previous,
    reducedMotion,
    actions,
    pickRoom,
    can: {
      forward: pose.rev ? pose.z > 0 : pose.z < layout.maxZ,
      back: pose.rev ? pose.z < layout.maxZ : pose.z > 0,
      lookLeft: pose.look > -HALL.lookMax,
      lookRight: pose.look < HALL.lookMax,
      lookAhead: pose.look !== 0,
      previousRoom: previous >= 0,
    },
    stageHandlers: { onKeyDown, onPointerDown, onPointerMove, onPointerUp, onPointerLeave: onPointerUp },
  };
}

export type HallNavigation = ReturnType<typeof useHallNavigation>;
