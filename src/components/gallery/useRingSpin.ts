"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  dragOffset,
  integrateSpin,
  nearestIndex,
  ringDelta,
  spinSettled,
  type SpinSample,
} from "@/lib/ring-spin";

const CLICK_SLOP = 8;
const VELOCITY_CAP = 8;

/**
 * Pointer drag, momentum, and snap for a circular display.
 * `onFrame` should write transforms only. React state updates when the nearest card changes.
 * Gallery Wall can reuse this with its own scene.
 */
export function useRingSpin(
  count: number,
  cardWidthRef: { readonly current: { cardWidth: number } },
  onFrame: (offset: number) => void,
) {
  const live = useRef<SpinSample>({ offset: 0, velocity: 0, target: null });
  const onFrameRef = useRef(onFrame);
  const countRef = useRef(count);
  const reduced = useRef(false);
  const dragging = useRef(false);
  const rafId = useRef(0);
  const lastFrame = useRef(0);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const pointer = useRef<{
    id: number;
    x: number;
    origin: number;
    lastX: number;
    lastT: number;
    velocity: number;
    moved: boolean;
  } | null>(null);

  useLayoutEffect(() => {
    onFrameRef.current = onFrame;
    countRef.current = count;
  });

  function publish(offset: number) {
    live.current = { ...live.current, offset };
    onFrameRef.current(offset);
    const next = nearestIndex(offset, countRef.current);
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
    const next = integrateSpin(live.current, (now - previous) / 1000, reduced.current);
    live.current = next;
    onFrameRef.current(next.offset);
    const nearest = nearestIndex(next.offset, countRef.current);
    setIndex((current) => (current === nearest ? current : nearest));
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
    live.current = { offset: sample.offset, velocity: 0, target: base + delta };
    kick();
  }

  /** Spin the short way to a card. Returns false when that card is already in front. */
  function spinTo(cardIndex: number): boolean {
    if (countRef.current < 2) return false;
    const sample = live.current;
    const delta = ringDelta(cardIndex, sample.offset, countRef.current);
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
      x: event.clientX,
      origin: live.current.offset,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (Math.abs(event.clientX - drag.x) > CLICK_SLOP) drag.moved = true;
    if (!drag.moved) return;
    const dt = (event.timeStamp - drag.lastT) / 1000;
    if (dt > 0.008) {
      const instant = -(event.clientX - drag.lastX) / cardWidthRef.current.cardWidth / dt;
      drag.velocity = Math.max(-VELOCITY_CAP, Math.min(VELOCITY_CAP, drag.velocity * 0.35 + instant * 0.65));
      drag.lastT = event.timeStamp;
      drag.lastX = event.clientX;
    }
    dragging.current = true;
    setActive(true);
    const offset = dragOffset(drag.origin, event.clientX - drag.x, cardWidthRef.current.cardWidth);
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
    live.current = {
      offset: live.current.offset,
      velocity,
      target: reduced.current ? Math.round(live.current.offset) : null,
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
    live.current = {
      offset: live.current.offset,
      velocity: 0,
      target: Math.round(live.current.offset),
    };
    kick();
  }

  return {
    index: count === 0 ? 0 : index % count,
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
