import type { CSSProperties } from "react";
import { HALL, type HallEnd } from "@/lib/halls";
import styles from "./LibraryHall.module.css";

interface Props {
  end: HallEnd;
  transform: string;
  hidden: boolean;
  fog: number;
  atEnd: boolean;
  onPick: () => void;
}

/** Far wall. Main hall: the Digital Vault door. Category hall: exit arch back up a level. */
export function EndWall({ end, transform, hidden, fog, atEnd, onPick }: Props) {
  const vault = end.kind === "vault";
  const style: CSSProperties = {
    width: HALL.halfWidth * 2,
    height: HALL.wallHeight,
    transform,
    visibility: hidden ? "hidden" : "visible",
  };

  return (
    <div className={`${styles.plane} ${styles.end} ${vault ? styles.endVault : styles.endExit}`} style={style}>
      <div className={styles.plaque}>
        <div className={styles.eyebrow}>{vault ? "NFT cards" : "Leave this hall"}</div>
        <div className={styles.rname}>{vault ? "Digital Vault" : end.label}</div>
        {vault && <div className={styles.rcount}>{end.countLabel}</div>}
      </div>
      <button
        type="button"
        className={styles.varch}
        onClick={onPick}
        aria-label={vault ? (atEnd ? "Enter the Digital Vault" : "Walk to the Digital Vault") : atEnd ? end.label : `Walk to ${end.label}`}
      >
        <span className={styles.lock}>
          {vault ? (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          ) : (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          )}
        </span>
      </button>
      <div className={styles.fog} style={{ opacity: fog }} />
    </div>
  );
}
