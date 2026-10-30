"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  HALL,
  buildHallLayout,
  cameraFor,
  fogOpacity,
  isSectionHidden,
  planeTransforms,
  sceneTransform,
  sideOf,
  type HallEnd,
  type HallRoom,
  type HallSection,
  type WallContent,
} from "@/lib/halls";
import { RoomPortal } from "./RoomPortal";
import { GlassBay } from "./GlassBay";
import { EndWall } from "./EndWall";
import styles from "./LibraryHall.module.css";

interface Props {
  rooms: HallRoom[];
  end: HallEnd;
  /** Engraved on the two entrance walls. */
  entranceLabels?: [string, string];
  /** Restore position when coming back from a room (e.g. from ?at=roomId). */
  initialRoomId?: string;
}

export function LibraryHall({ rooms, end, entranceLabels = ["TradingCrew", "Library Halls"], initialRoomId }: Props) {
  const router = useRouter();
  const layout = buildHallLayout(rooms, end, entranceLabels);
  const endStop = rooms.length;

  const [stop, setStop] = useState(() => {
    const i = initialRoomId ? rooms.findIndex((r) => r.id === initialRoomId) : -1;
    return i;
  });
  const [entered, setEntered] = useState(false);

  const room = stop >= 0 && stop < endStop ? rooms[stop] : undefined;
  const cam = cameraFor(layout, stop, entered && !!room);

  // Prefetch the focused room; navigate once the walk-in animation has played.
  useEffect(() => {
    if (room) router.prefetch(room.href);
  }, [room, router]);

  useEffect(() => {
    if (!entered || !room) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => router.push(room.href), reduce ? 0 : HALL.transitionMs + 150);
    return () => window.clearTimeout(t);
  }, [entered, room, router]);

  const go = (i: number) => {
    setEntered(false);
    setStop(Math.max(-1, Math.min(endStop, i)));
  };
  const pickRoom = (i: number) => (i === stop ? setEntered(true) : go(i));
  const leaveTo = end.kind === "exit" ? end.href : undefined;

  /* ── HUD text ─────────────────────────────────────────────── */
  let eyebrow = "Welcome";
  let name = "Library Halls";
  let sub = `${rooms.length} ${rooms.length === 1 ? "room" : "rooms"}`;
  let accent = "var(--tc-gold)";
  if (room) {
    eyebrow = sideOf(stop) === "L" ? "On your left" : "On your right";
    name = room.name;
    sub = room.countLabel;
    accent = room.accent;
  } else if (stop === endStop) {
    eyebrow = "End of the hall";
    name = end.kind === "vault" ? "Digital Vault" : end.label;
    sub = end.kind === "vault" ? "NFT cards will live here · coming soon" : "Head back up a level";
    accent = end.kind === "vault" ? "var(--tc-vault)" : "var(--tc-gold)";
  }

  let primaryLabel = "Start walking";
  let primary: (() => void) | undefined = () => go(0);
  if (room) {
    primaryLabel = entered ? "Opening…" : "Enter room";
    primary = entered ? undefined : () => setEntered(true);
  } else if (stop === endStop) {
    primaryLabel = end.kind === "vault" ? "Coming soon" : end.label;
    primary = leaveTo ? () => router.push(leaveTo) : undefined;
  }

  const chip = entered
    ? "Stepping inside…"
    : stop === -1
      ? "Tap a doorway to walk to it · tap again to enter"
      : "Tap the glowing doorway to step inside";

  const wallFace = (c: WallContent) => {
    switch (c.kind) {
      case "plain":
        return <div className={styles.engrave}>{c.label}</div>;
      case "glass":
        return <GlassBay accent={c.accent} featured={c.featured} />;
      case "room":
        return (
          <RoomPortal room={rooms[c.roomIndex]} focused={c.roomIndex === stop} onPick={() => pickRoom(c.roomIndex)} />
        );
    }
  };

  const pool = (c: WallContent, at: "0% 50%" | "100% 50%"): CSSProperties => {
    if (c.kind !== "room") return { opacity: 0 };
    const a = rooms[c.roomIndex].accent;
    return {
      background: `radial-gradient(ellipse 80% 45% at ${at}, color-mix(in srgb, ${a} 47%, transparent), transparent 70%)`,
      opacity: c.roomIndex === stop ? 1 : 0.4,
    };
  };

  /*
   * The camera is applied to EVERY plane (camera transform + plane transform),
   * not to the .scene container. If the container itself is pushed past the
   * viewer, browsers stop hit-testing everything inside it and doorways become
   * unclickable. Sections behind the camera stay mounted but go
   * visibility:hidden (delayed by the move duration in CSS) so walking
   * backwards never pops geometry in mid-animation.
   */
  const camT = sceneTransform(cam);
  const insideRoom = entered && !!room;

  const renderSection = (s: HallSection) => {
    const hidden = isSectionHidden(s, cam, insideRoom, stop);
    const len = s.zNear - s.zFar;
    const fog = { opacity: fogOpacity((s.zNear + s.zFar) / 2, cam, insideRoom) };
    const vis: CSSProperties = { visibility: hidden ? "hidden" : "visible" };
    const wallSize = { width: len, height: HALL.wallHeight };
    const flatSize = { width: HALL.halfWidth * 2, height: len };

    return [
      <div key={`c${s.index}`} className={`${styles.plane} ${styles.ceil}`} style={{ ...flatSize, ...vis, transform: `${camT} ${planeTransforms.ceiling(s)}` }}>
        <div className={styles.fog} style={fog} />
      </div>,
      <div key={`f${s.index}`} className={`${styles.plane} ${styles.floor}`} style={{ ...flatSize, ...vis, transform: `${camT} ${planeTransforms.floor(s)}` }}>
        <div className={`${styles.pool} ${styles.poolL}`} style={pool(s.L, "0% 50%")} />
        <div className={`${styles.pool} ${styles.poolR}`} style={pool(s.R, "100% 50%")} />
        <div className={styles.fog} style={fog} />
      </div>,
      <div key={`l${s.index}`} className={`${styles.plane} ${styles.wall}`} style={{ ...wallSize, ...vis, transform: `${camT} ${planeTransforms.leftWall(s)}` }}>
        {wallFace(s.L)}
        <div className={styles.fog} style={fog} />
      </div>,
      <div key={`r${s.index}`} className={`${styles.plane} ${styles.wall}`} style={{ ...wallSize, ...vis, transform: `${camT} ${planeTransforms.rightWall(s)}` }}>
        {wallFace(s.R)}
        <div className={styles.fog} style={fog} />
      </div>,
    ];
  };

  return (
    <div className={styles.root}>
      <div className={styles.stage} role="region" aria-label="Library hall, 3D view">
        <div className={styles.scene}>
          {layout.sections.map(renderSection)}
          <EndWall
            end={end}
            transform={`${camT} ${planeTransforms.endWall(layout.endZ)}`}
            hidden={insideRoom}
            fog={fogOpacity(layout.endZ, cam, insideRoom)}
            atEnd={stop === endStop}
            onPick={() => (stop === endStop && leaveTo ? router.push(leaveTo) : go(endStop))}
          />
        </div>
        <div className={styles.vignette} />
        <div className={styles.chip}>{chip}</div>
        <div className={`${styles.fade} ${entered && room ? styles.fadeOn : ""}`} />
      </div>

      <div className={styles.hud}>
        <div className={styles.stepper}>
          <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.round}`} onClick={() => go(stop - 1)} disabled={stop === -1} aria-label="Walk back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <div className={styles.counter} aria-live="polite">
            {stop === -1 ? "Entrance" : `${stop + 1} / ${endStop + 1}`}
          </div>
          <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.round}`} onClick={() => go(stop + 1)} disabled={stop === endStop} aria-label="Walk forward">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        <div className={styles.now} style={{ "--a": accent } as CSSProperties}>
          <div className={styles.eyebrow}>{eyebrow}</div>
          <div className={styles.nowName}>{name}</div>
          <div className={styles.nowSub}>{sub}</div>
        </div>

        <button type="button" className={`${styles.btn} ${styles.gold} ${styles.primary}`} onClick={primary} disabled={!primary}>
          {primaryLabel}
        </button>
      </div>

      <nav aria-label="Rooms in this hall" className={styles.stops}>
        {rooms.map((r, i) => (
          <button
            type="button"
            key={r.id}
            className={`${styles.stop} ${i === stop ? styles.stopOn : ""}`}
            onClick={() => go(i)}
            aria-current={i === stop ? "true" : undefined}
          >
            <span className={styles.dot} style={{ background: r.accent }} />
            {r.name}
          </button>
        ))}
        <button
          type="button"
          className={`${styles.stop} ${stop === endStop ? styles.stopOn : ""}`}
          onClick={() => go(endStop)}
          aria-current={stop === endStop ? "true" : undefined}
        >
          <span className={styles.dot} style={{ background: end.kind === "vault" ? "var(--tc-vault)" : "var(--tc-gold)" }} />
          {end.kind === "vault" ? "Digital Vault" : end.label}
        </button>
      </nav>
    </div>
  );
}
