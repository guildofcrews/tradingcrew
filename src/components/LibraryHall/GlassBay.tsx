import Image from "next/image";
import type { CSSProperties } from "react";
import type { HallRoom } from "@/lib/halls";
import styles from "./LibraryHall.module.css";

interface Props {
  accent: string;
  featured?: HallRoom["featured"];
}

/**
 * Glass display bay between doorways: gold-framed run of three panes with
 * reflection streaks. Outer panes: lit shelf with card silhouettes.
 * Centre pane: a featured card floating in a light beam on a plinth.
 */
export function GlassBay({ accent, featured }: Props) {
  return (
    <div style={{ "--a": accent } as CSSProperties}>
      <div className={styles.gtitle}>{featured ? `Featured · ${featured.title}` : "Featured"}</div>
      <div className={styles.glass}>
        <div className={styles.pane}>
          <span className={styles.sil} />
          <span className={`${styles.sil} ${styles.sil2}`} />
          <span className={styles.shelf} />
        </div>
        <div className={styles.pane}>
          <span className={styles.beam} />
          <span className={styles.fcard}>
            {featured?.imageUrl && (
              <Image
                src={featured.imageUrl}
                alt={featured.title}
                fill
                sizes="80px"
                className={styles.cover}
                unoptimized={featured.imageUrl.startsWith("/api/")}
              />
            )}
          </span>
          <span className={styles.ftag}>Featured</span>
          <span className={styles.plinth} />
        </div>
        <div className={styles.pane}>
          <span className={styles.sil} />
          <span className={`${styles.sil} ${styles.sil2}`} />
          <span className={styles.shelf} />
        </div>
      </div>
    </div>
  );
}
