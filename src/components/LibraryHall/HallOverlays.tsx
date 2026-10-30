"use client";

import type { CSSProperties } from "react";
import { mapPosition, relativeSide, frameFor, type HallLayout } from "@/lib/halls";
import type { HallNavigation } from "./useHallNavigation";
import styles from "./HallNav.module.css";

/*
 * Frosted-glass controls on top of the 3D stage. Every root carries
 * data-hall-overlay so presses on them are never treated as a drag of the hall.
 */

type Props = { layout: HallLayout; nav: HallNavigation; onEnd?: () => void };

/* ── Top row: facing badge + hall map (one flex row — they can't overlap) ── */
export function HallTopBar({ layout, nav, onEnd }: Props) {
  const { pose } = nav;
  const pct = (z: number) => `${(mapPosition(layout, z) * 100).toFixed(2)}%`;
  const lookLabel =
    pose.look === 0 ? "Looking straight ahead" : `Looking ${pose.look < 0 ? "left" : "right"} ${Math.abs(pose.look)}°`;
  const progress =
    pose.z <= 0 ? "At the entrance" : pose.z >= layout.maxZ ? "End of the hall" : `${Math.round(mapPosition(layout, pose.z) * 100)}% down the hall`;
  const endName = layout.end.kind === "vault" ? "Digital Vault" : layout.end.label;

  return (
    <div className={styles.top}>
      <div className={`${styles.glass} ${styles.face}`} data-hall-overlay>
        <span className={styles.compass}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ transform: `rotate(${pose.look}deg)` }} aria-hidden="true">
            <path d="M12 2l6 18-6-4-6 4z" />
          </svg>
        </span>
        <div className={styles.faceText}>
          <div className={styles.faceTitle}>{pose.rev ? "Facing the entrance" : `Facing the ${endName}`}</div>
          <div className={styles.faceSub}>{lookLabel}</div>
        </div>
      </div>

      <div className={`${styles.glass} ${styles.rail}`} aria-label="Hall map" data-hall-overlay>
        <div className={styles.ends}>
          <button type="button" className={styles.end} onClick={nav.actions.goToEntrance}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            Entrance
          </button>
          <span className={styles.progress} aria-live="polite">{progress}</span>
          <button
            type="button"
            className={`${styles.end} ${layout.end.kind === "vault" ? styles.endVault : ""}`}
            onClick={onEnd ?? nav.actions.goToEnd}
            aria-label={layout.end.kind === "vault" ? "Digital Vault" : endName}
          >
            {endName}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: pct(pose.z) }} />
          {layout.rooms.map((r, i) => {
            const seen = !!nav.visited[i];
            const label = `${seen ? "Visited · " : ""}${r.name} (${i % 2 === 0 ? "left" : "right"} wall)`;
            return (
              <button
                type="button"
                key={r.id}
                className={`${styles.marker} ${i % 2 === 0 ? styles.markerUp : styles.markerDown} ${seen ? styles.seen : ""} ${nav.inView === i ? styles.now : ""}`}
                style={{ left: pct(frameFor(layout, i, false).z), "--a": r.accent } as CSSProperties}
                onClick={() => nav.actions.goToRoom(i)}
                aria-label={label}
                title={label}
              />
            );
          })}
          <div className={styles.puck} style={{ left: pct(pose.z) }}>
            <span className={styles.cone} style={{ transform: `rotate(${(pose.rev ? 180 : 0) + pose.look}deg)` }} />
            <span className={styles.puckDot} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Enter prompt: only while a doorway is in view ── */
export function EnterPrompt({ layout, nav }: Props) {
  if (nav.inView < 0 || nav.entered >= 0) return null;
  const room = layout.rooms[nav.inView];
  return (
    <button
      type="button"
      key={room.id}
      className={`${styles.glass} ${styles.enter}`}
      style={{ "--a": room.accent } as CSSProperties}
      onClick={() => nav.actions.enter(nav.inView)}
      data-hall-overlay
    >
      <span className={styles.enterText}>
        <span className={styles.enterName}>{room.name}</span>
        <span className={styles.enterSub}>
          {relativeSide(nav.inView, nav.pose.rev)} · {room.countLabel}
        </span>
      </span>
      <span className={styles.enterKey}>
        Enter <span className={`${styles.kbd} ${styles.kbdOnAccent}`}>↵</span>
      </span>
    </button>
  );
}

/* ── Movement pad (bottom right) ── */
export function MovementDock({ nav }: { nav: HallNavigation }) {
  const { actions, can } = nav;
  return (
    <div className={`${styles.glass} ${styles.dock}`} role="group" aria-label="Movement controls" data-hall-overlay>
      <div className={styles.pad}>
        <button type="button" className={`${styles.key} ${styles.kFwd}`} onClick={actions.forward} disabled={!can.forward} aria-label="Walk forward" title="Walk forward (↑)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
        </button>
        <button type="button" className={`${styles.key} ${styles.kLeft}`} onClick={actions.lookLeft} disabled={!can.lookLeft} aria-label="Look left" title="Look left (←)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 15a8 8 0 0 0-14.5-4.6" /><path d="M4 5v6h6" /></svg>
        </button>
        <button type="button" className={`${styles.key} ${styles.kCenter}`} onClick={actions.lookAhead} disabled={!can.lookAhead} aria-label="Look straight ahead" title="Look ahead (C)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2" fill="currentColor" /></svg>
        </button>
        <button type="button" className={`${styles.key} ${styles.kRight}`} onClick={actions.lookRight} disabled={!can.lookRight} aria-label="Look right" title="Look right (→)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15a8 8 0 0 1 14.5-4.6" /><path d="M20 5v6h-6" /></svg>
        </button>
        <button type="button" className={`${styles.key} ${styles.kBack}`} onClick={actions.back} disabled={!can.back} aria-label="Step back" title="Step back (↓)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </div>
      <div className={styles.side}>
        <button type="button" className={`${styles.pill} ${styles.pillGold}`} onClick={actions.turnAround} aria-label="Turn around" title="Turn around (R)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 20V10a5 5 0 0 1 10 0v7" /><path d="M14 14l4 4 4-4" /></svg>
          Turn around
        </button>
        <button type="button" className={styles.pill} onClick={actions.previousRoom} disabled={!can.previousRoom} aria-label="Go back to the previous room" title="Previous room">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
          Previous room
        </button>
      </div>
    </div>
  );
}

/* ── "Use your keyboard" link → small keyboard card. The link retires once the pad or keyboard is used. ── */
export function KeyboardHint({ nav }: { nav: HallNavigation }) {
  const gone = nav.usedControls || nav.keysOpen;
  return (
    <>
      <button
        type="button"
        className={`${styles.glass} ${styles.kpill} ${gone ? styles.gone : ""}`}
        onClick={nav.actions.openKeys}
        tabIndex={gone ? -1 : 0}
        aria-hidden={gone || undefined}
        data-hall-overlay
      >
        <span className={styles.kicon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
          </svg>
        </span>
        Use your keyboard
      </button>
      {nav.keysOpen && (
        <div className={`${styles.glass} ${styles.help}`} role="dialog" aria-label="Keyboard controls" data-hall-overlay>
          <button type="button" className={styles.close} onClick={nav.actions.closeKeys} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <h3 className={styles.helpTitle}>Keyboard</h3>
          <div className={styles.row}>Walk<span className={styles.keys}><span className={styles.kbd}>↑</span><span className={styles.kbd}>↓</span></span></div>
          <div className={styles.row}>Look around<span className={styles.keys}><span className={styles.kbd}>←</span><span className={styles.kbd}>→</span></span></div>
          <div className={styles.row}>Turn around<span className={styles.keys}><span className={styles.kbd}>R</span></span></div>
          <div className={styles.row}>Go inside<span className={styles.keys}><span className={styles.kbd}>Enter</span></span></div>
        </div>
      )}
    </>
  );
}
