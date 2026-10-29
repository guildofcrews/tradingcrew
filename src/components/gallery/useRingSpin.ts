"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  dragOffset,
  integrateSpin,
  nearestIndex,
  resistEdge,
  ringDelta,
  spinSettled,
  type SpinSample,
} from "@/lib/ring-spin";

const CLICK_SLOP = 8;
const VELOCITY_CAP = 8;

interface SpinOptions {
  /** Full circle. False clamps at the first and last index. */
  wrap?: boolean;
  /** Index to stand on when the view mounts. */
  start?: number;
  /** Horizontal drag, or whichever way the pointer travels farther. */
  axis?: "x" | "any";
}

/**
 * Pointer drag, momentum, and snap for a ring or a hallway.
 * `onFrame` should write transforms only. React state updates when the nearest stop changes.
 * Gallery Wall can reuse this with its own scene.
 */
export function useRingSpin(
  count: number,
  cardWidthRef: { readonly current: { cardWidth: number } },
  onFrame: (offset: number) => void,
  options?: SpinOptions,
) {
  const wrap = options?.wrap !== false;
  const start = options?.start ?? 0;
  const live = useRef<SpinSample>({ offset: start, velocity: 0, target: null });
  const onFrameRef = useRef(onFrame);
  const countRef = useRef(count);
  const wrapRef = useRef(wrap);
  const axisRef = useRef(options?.axis ?? "x");
  const reduced = useRef(false);
  const dragging = useRef(false);
  const rafId = useRef(0);
  const lastFrame = useRef(0);
  const [index, setIndex] = useState(() => nearestIndex(start, count, wrap));
  const [active, setActive] = useState(false);
  const pointer = useRef<{
    id: number;
    origin: number;
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    lastT: number;
    velocity: number;
    moved: boolean;
    locked: "x" | "y";
  } | null>(null);

  useLayoutEffect(() => {
    onFrameRef.current = onFrame;
    countRef.current = count;
    wrapRef.current = wrap;
    axisRef.current = options?.axis ?? "x";
  });

  function nearest(offset: number) {
    return nearestIndex(offset, countRef.current, wrapRef.current);
  }

  function bounds() {
    if (wrapRef.current || countRef.current <= 1) return null;
    return { min: 0, max: countRef.current - 1 };
  }

  function publish(offset: number) {
    live.current = { ...live.current, offset };
    onFrameRef.current(offset);
    const next = nearest(offset);
    setIndex((current) => (current === next ? current : next));
  }

  function stop() {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = 0;
  }

  function tick(now: number) {
    if (dragging.current) {
      rafId.current = 0;
      return;
    }
    const previous = lastFrame.current || now;
    lastFrame.current = now;
    const next = integrateSpin(live.current, (now - previous) / 1000, reduced.current, bounds());
    live.current = next;
    onFrameRef.current(next.offset);
    const nearestStop = nearest(next.offset);
    setIndex((current) => (current === nearestStop ? current : nearestStop));
    if (spinSettled(next)) {
      rafId.current = 0;
      return;
    }
    rafId.current = requestAnimationFrame(tick);
  }

  function kick() {
    if (rafId.current || dragging.current) return;
    lastFrame.current = 0;
    rafId.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reduced.current = media.matches;
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      stop();
    };
  }, []);

  function go(delta: number) {
    if (countRef.current < 2 || delta === 0 || dragging.current) return;
    const sample = live.current;
    const base = sample.target ?? Math.round(sample.offset);
    let target = base + delta;
    const edge = bounds();
    if (edge) {
      const clampedBase = Math.max(edge.min, Math.min(edge.max, base));
      target = Math.max(edge.min, Math.min(edge.max, target));
      if (target === clampedBase) return;
    }
    live.current = { offset: sample.offset, velocity: 0, target };
    kick();
  }

  /** Move the short way to an index. Returns false when that stop is already in front. */
  function spinTo(cardIndex: number): boolean {
    if (countRef.current < 2) return false;
    const sample = live.current;
    const delta = ringDelta(cardIndex, sample.offset, countRef.current, wrapRef.current);
    if (Math.abs(delta) < 0.5) return false;
    live.current = { offset: sample.offset, velocity: 0, target: sample.offset + delta };
    kick();
    return true;
  }

  function onPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0 || countRef.current < 2) return;
    stop();
    dragging.current = false;
    pointer.current = {
      id: event.pointerId,
      origin: live.current.offset,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastT: event.timeStamp,
      velocity: 0,
      moved: false,
      locked: "x",
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    const travelX = event.clientX - drag.x;
    const travelY = event.clientY - drag.y;
    if (!drag.moved) {
      if (axisRef.current === "any") {
        if (Math.hypot(travelX, travelY) <= CLICK_SLOP) return;
        drag.locked = Math.abs(travelY) > Math.abs(travelX) ? "y" : "x";
      } else if (Math.abs(travelX) <= CLICK_SLOP) {
        return;
      }
      drag.moved = true;
    }
    const vertical = drag.locked === "y";
    const delta = vertical ? travelY : travelX;
    const dt = (event.timeStamp - drag.lastT) / 1000;
    if (dt > 0.008) {
      const moved = vertical ? event.clientY - drag.lastY : event.clientX - drag.lastX;
      const instant = -moved / cardWidthRef.current.cardWidth / dt;
      drag.velocity = Math.max(-VELOCITY_CAP, Math.min(VELOCITY_CAP, drag.velocity * 0.35 + instant * 0.65));
      drag.lastT = event.timeStamp;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
    }
    dragging.current = true;
    setActive(true);
    let offset = dragOffset(drag.origin, delta, cardWidthRef.current.cardWidth);
    const edge = bounds();
    if (edge) offset = resistEdge(offset, edge.min, edge.max);
    live.current = { offset, velocity: drag.velocity, target: null };
    publish(offset);
  }

  function endPointer(event: React.PointerEvent<HTMLElement>): boolean {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return false;
    pointer.current = null;
    const moved = drag.moved;
    dragging.current = false;
    setActive(false);
    if (!moved) {
      live.current = { offset: drag.origin, velocity: 0, target: null };
      onFrameRef.current(drag.origin);
      return true;
    }
    const velocity = reduced.current ? 0 : drag.velocity;
    const edge = bounds();
    const rounded = Math.round(live.current.offset);
    const snapped = edge ? Math.max(edge.min, Math.min(edge.max, rounded)) : rounded;
    live.current = {
      offset: live.current.offset,
      velocity,
      target: reduced.current ? snapped : null,
    };
    kick();
    return false;
  }

  function onPointerCancel() {
    const drag = pointer.current;
    pointer.current = null;
    dragging.current = false;
    setActive(false);
    if (!drag) return;
    const edge = bounds();
    const rounded = Math.round(live.current.offset);
    live.current = {
      offset: live.current.offset,
      velocity: 0,
      target: edge ? Math.max(edge.min, Math.min(edge.max, rounded)) : rounded,
    };
    kick();
  }

  return {
    index:
      count === 0
        ? 0
        : wrap
          ? ((index % count) + count) % count
          : Math.max(0, Math.min(count - 1, index)),
    dragging: active,
    offsetRef: live,
    go,
    spinTo,
    onPointerDown,
    onPointerMove,
    endPointer,
    onPointerCancel,
  };
}
