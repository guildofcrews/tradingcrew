import Image from "next/image";
import type { CSSProperties } from "react";
import type { HallRoom } from "@/lib/halls";
import styles from "./LibraryHall.module.css";

interface Props {
  room: HallRoom;
  focused: boolean;
  onPick: () => void;
}

/**
 * Doorway on a side wall: plaque (eyebrow, name, count), two light bars,
 * and an arched opening you can see into — ceiling, side walls, floor and a
 * back wall with up to three cards. First tap walks to it, second tap enters.
 */
export function RoomPortal({ room, focused, onPick }: Props) {
  const previews = (room.previewImageUrls ?? []).slice(0, 3);
  const slots = [0, 1, 2];

  return (
    <div className={`${styles.room} ${focused ? styles.focus : ""}`} style={{ "--a": room.accent } as CSSProperties}>
      <div className={styles.plaque}>
        <div className={styles.eyebrow}>{room.eyebrow}</div>
        <div className={styles.rname}>{room.name}</div>
        <div className={styles.rcount}>{room.countLabel}</div>
      </div>
      <span className={`${styles.sconce} ${styles.sconceL}`} />
      <span className={`${styles.sconce} ${styles.sconceR}`} />
      <button
        type="button"
        className={styles.arch}
        onClick={onPick}
        aria-label={focused ? `Enter the ${room.name} room` : `Walk to the ${room.name} room`}
      >
        <span className={styles.int} />
        <span className={styles.iceil} />
        <span className={styles.iwl} />
        <span className={styles.iwr} />
        <span className={styles.ifloor} />
        <span className={styles.iback}>
          {slots.map((i) => (
            <span key={i} className={`${styles.mini} ${i === 1 ? styles.miniBig : ""}`}>
              {previews[i] && (
                <Image
                  src={previews[i]}
                  alt=""
                  fill
                  sizes="48px"
                  className={styles.cover}
                  unoptimized={previews[i].startsWith("/api/")}
                />
              )}
            </span>
          ))}
        </span>
      </button>
    </div>
  );
}
