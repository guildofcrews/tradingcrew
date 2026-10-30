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

/** Far wall. Main hall: locked Digital Vault. Category hall: exit arch back up a level. */
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
        {vault && <div className={styles.soon}>Coming soon</div>}
      </div>
      <button
        type="button"
        className={styles.varch}
        onClick={onPick}
        aria-label={vault ? "Walk to the Digital Vault" : atEnd ? end.label : `Walk to ${end.label}`}
      >
        <span className={styles.lock}>
          {vault ? (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
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
