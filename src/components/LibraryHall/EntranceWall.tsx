import type { CSSProperties } from "react";
import { HALL } from "@/lib/halls";
import styles from "./LibraryHall.module.css";

interface Props {
  transform: string;
  visible: boolean;
  fog: number;
  label: string;
}

/** Wall at the start of the hall, seen only when turned around: plaque + a pair of glass doors. */
export function EntranceWall({ transform, visible, fog, label }: Props) {
  const style: CSSProperties = {
    width: HALL.halfWidth * 2,
    height: HALL.wallHeight,
    transform,
    visibility: visible ? "visible" : "hidden",
  };
  return (
    <div className={`${styles.plane} ${styles.end} ${styles.endExit} ${styles.backface}`} style={style} aria-hidden="true">
      <div className={styles.plaque}>
        <div className={styles.eyebrow}>{label}</div>
        <div className={styles.rname}>Entrance</div>
      </div>
      <div className={styles.doors}>
        <span className={styles.door} />
        <span className={styles.door} />
      </div>
      <div className={styles.fog} style={{ opacity: fog }} />
    </div>
  );
}
