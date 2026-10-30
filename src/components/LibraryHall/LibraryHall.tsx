"use client";

import { useEffect, useMemo, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  HALL,
  buildHallLayout,
  cameraFor,
  cameraTransform,
  fogOpacity,
  isSectionHidden,
  nextUpLabel,
  planeTransforms,
  relativeSide,
  type HallEnd,
  type HallRoom,
  type HallSection,
  type Pose,
  type WallContent,
} from "@/lib/halls";
import { useHallNavigation } from "./useHallNavigation";
import { RoomPortal } from "./RoomPortal";
import { GlassBay } from "./GlassBay";
import { EndWall } from "./EndWall";
import { EntranceWall } from "./EntranceWall";
import { EnterPrompt, HallTopBar, KeyboardHint, MovementDock } from "./HallOverlays";
import styles from "./LibraryHall.module.css";

interface Props {
  rooms: HallRoom[];
  end: HallEnd;
  /** Engraved on the two entrance walls; the first also titles the entrance wall. */
  entranceLabels?: [string, string];
  /** Restore position when coming back from a room (e.g. from ?at=roomId). */
  initialRoomId?: string;
  /** Exact pose from the URL (`?z=&look=&rev=`). Wins over `initialRoomId`. */
  initialPose?: Pose;
  /** Stand at the far door. Used when returning from the Digital Vault. */
  startAtEnd?: boolean;
}

const DEFAULT_LABELS: [string, string] = ["TradingCrew", "Library Halls"];

export function LibraryHall({
  rooms,
  end,
  entranceLabels = DEFAULT_LABELS,
  initialRoomId,
  initialPose,
  startAtEnd = false,
}: Props) {
  const router = useRouter();
  const layout = useMemo(() => buildHallLayout(rooms, end, entranceLabels), [rooms, end, entranceLabels]);
  const nav = useHallNavigation(layout, initialRoomId, initialPose, startAtEnd);
  const { pose, entered, inView } = nav;

  const cam = cameraFor(layout, pose, entered);
  const camT = cameraTransform(cam);
  const moveMs = nav.reducedMotion ? 0 : HALL.moveMs[nav.mode];
  const enteredRoom = entered >= 0 ? rooms[entered] : undefined;
  const focusRoom = inView >= 0 ? rooms[inView] : undefined;

  // Prefetch the room you're facing; navigate once the walk-in has played.
  useEffect(() => {
    if (focusRoom) router.prefetch(focusRoom.href);
  }, [focusRoom, router]);
  useEffect(() => {
    if (!enteredRoom) return;
    const t = window.setTimeout(() => router.push(enteredRoom.href), nav.reducedMotion ? 0 : HALL.moveMs.jump + 150);
    return () => window.clearTimeout(t);
  }, [enteredRoom, router, nav.reducedMotion]);

  // Keep the address bar on the same spot so refresh, Back, and shared links land here.
  // `?at=` still opens a doorway on the first load; this replaces it with the pose.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const z = String(Math.round(pose.z));
    const look = String(Math.round(pose.look));
    const same =
      params.get("z") === z &&
      params.get("look") === look &&
      (params.get("rev") === "1") === pose.rev &&
      !params.has("at");
    if (same) return;
    params.delete("at");
    params.delete("end");
    params.set("z", z);
    params.set("look", look);
    if (pose.rev) params.set("rev", "1");
    else params.delete("rev");
    const qs = params.toString();
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [pose.z, pose.look, pose.rev, router]);

  /* ── 3D world ─────────────────────────────────────────────── */
  const wallFace = (c: WallContent) => {
    switch (c.kind) {
      case "plain":
        return <div className={styles.engrave}>{c.label}</div>;
      case "glass":
        return <GlassBay accent={c.accent} featured={c.featured} />;
      case "room":
        return <RoomPortal room={rooms[c.roomIndex]} focused={c.roomIndex === inView} onPick={() => nav.pickRoom(c.roomIndex)} />;
    }
  };

  const pool = (c: WallContent, at: "0% 50%" | "100% 50%"): CSSProperties => {
    if (c.kind !== "room") return { opacity: 0 };
    const a = rooms[c.roomIndex].accent;
    return {
      background: `radial-gradient(ellipse 80% 45% at ${at}, color-mix(in srgb, ${a} 47%, transparent), transparent 70%)`,
      opacity: c.roomIndex === inView ? 1 : 0.4,
    };
  };

  const renderSection = (s: HallSection) => {
    const vis: CSSProperties = { visibility: isSectionHidden(s, cam, entered) ? "hidden" : "visible" };
    const fog = { opacity: fogOpacity((s.zNear + s.zFar) / 2, cam, entered) };
    const len = s.zNear - s.zFar;
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

  /* ── HUD text ─────────────────────────────────────────────── */
  const endName = end.kind === "vault" ? "Digital Vault" : end.label;
  const atEnd = pose.z >= layout.maxZ && !pose.rev;
  const atStart = pose.z <= 0 && !pose.rev;
  const endHref = end.kind === "exit" || end.kind === "vault" ? end.href : null;
  const enterEnd = atEnd && !focusRoom && endHref != null;
  const activateEnd = () => {
    if (enterEnd && endHref) router.push(endHref);
    else nav.actions.goToEnd();
  };
  const hud = focusRoom
    ? { accent: focusRoom.accent, eyebrow: relativeSide(inView, pose.rev), name: focusRoom.name, sub: `${focusRoom.countLabel} · press Enter or tap the doorway` }
    : {
        accent: "var(--tc-gold)",
        eyebrow: pose.rev ? "Heading back" : "Walking",
        name: `Next: ${nextUpLabel(layout, pose)}`,
        sub: enterEnd ? "Press Enter or tap the door" : "Turn toward a doorway to see what’s inside",
      };

  return (
    <div className={styles.root}>
      <div
        className={styles.stage}
        style={{ "--tc-hall-mv": `${moveMs}ms` } as CSSProperties}
        tabIndex={0}
        aria-label="Library hall. Arrow keys or W A S D to walk and look, R to turn around, Enter to step into a room."
        {...nav.stageHandlers}
        onKeyDown={(event) => {
          nav.stageHandlers.onKeyDown(event);
          if (
            event.key === "Enter" &&
            event.target === event.currentTarget &&
            !event.defaultPrevented &&
            enterEnd &&
            endHref
          ) {
            event.preventDefault();
            router.push(endHref);
          }
        }}
      >
        <div className={styles.scene}>
          {layout.sections.map(renderSection)}
          <EndWall
            end={end}
            transform={`${camT} ${planeTransforms.endWall(layout.endZ)}`}
            hidden={entered >= 0 || cam.rev}
            fog={fogOpacity(layout.endZ, cam, entered)}
            atEnd={atEnd}
            onPick={activateEnd}
          />
          <EntranceWall
            transform={`${camT} ${planeTransforms.entranceWall()}`}
            visible={entered < 0 && cam.rev}
            fog={fogOpacity(HALL.entranceDepth, cam, entered)}
            label={entranceLabels[0]}
          />
        </div>
        <div className={styles.vignette} />

        {entered < 0 && (
          <>
            <HallTopBar layout={layout} nav={nav} onEnd={activateEnd} />
            <EnterPrompt layout={layout} nav={nav} />
            <MovementDock nav={nav} />
            <KeyboardHint nav={nav} />
          </>
        )}
        <div className={`${styles.fade} ${enteredRoom ? styles.fadeOn : ""}`} />
      </div>

      <div className={styles.hud}>
        <div className={styles.now} style={{ "--a": hud.accent } as CSSProperties}>
          <div className={styles.eyebrow}>{hud.eyebrow}</div>
          <div className={styles.nowName}>{hud.name}</div>
          <div className={styles.nowSub}>{hud.sub}</div>
        </div>
        {enterEnd && endHref ? (
          <button type="button" className={`${styles.btn} ${styles.gold} ${styles.primary}`} onClick={() => router.push(endHref)}>
            {end.kind === "vault" ? "Enter the Digital Vault" : end.label}
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.btn} ${styles.gold} ${styles.primary}`}
            onClick={() => focusRoom && nav.actions.enter(inView)}
            disabled={!focusRoom || entered >= 0}
          >
            {entered >= 0 ? "Opening…" : focusRoom ? `Enter ${focusRoom.name}` : "Face a doorway to enter"}
          </button>
        )}
      </div>

      <nav aria-label="Jump to a room" className={styles.stops}>
        <span className={styles.jumpLabel}>Jump to</span>
        <button type="button" className={`${styles.stop} ${atStart ? styles.stopOn : ""}`} onClick={nav.actions.goToEntrance} style={{ "--a": "var(--tc-gold)" } as CSSProperties}>
          <span className={`${styles.dot} ${styles.dotSeen}`} />
          Entrance
        </button>
        {rooms.map((r, i) => (
          <button
            type="button"
            key={r.id}
            className={`${styles.stop} ${i === inView ? styles.stopOn : ""}`}
            onClick={() => nav.actions.goToRoom(i)}
            aria-current={i === inView ? "true" : undefined}
            style={{ "--a": r.accent } as CSSProperties}
          >
            <span className={`${styles.dot} ${nav.visited[i] ? styles.dotSeen : ""}`} />
            {r.name}
          </button>
        ))}
        <button
          type="button"
          className={`${styles.stop} ${atEnd && !focusRoom ? styles.stopOn : ""}`}
          onClick={activateEnd}
          style={{ "--a": end.kind === "vault" ? "var(--tc-vault)" : "var(--tc-gold)" } as CSSProperties}
        >
          <span className={`${styles.dot} ${atEnd ? styles.dotSeen : ""}`} />
          {endName}
        </button>
      </nav>
    </div>
  );
}
