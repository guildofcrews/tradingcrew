import Link from "next/link";
import type { CSSProperties } from "react";
import type { Wing } from "@/lib/cards";
import { WingIcon } from "./WingIcon";
import styles from "./WingDoor.module.css";

interface Props {
  wing: Wing;
  count: number;
}

export function WingDoor({ wing, count }: Props) {
  const style = { "--accent": wing.accent } as CSSProperties;

  return (
    <Link
      href={`/my-cards/${wing.slug}`}
      className={styles.door}
      style={style}
      aria-label={`Enter the ${wing.name} wing, ${count} ${count === 1 ? "card" : "cards"}`}
    >
      <span className={styles.eyebrow}>{wing.tagline}</span>

      <span className={styles.arch}>
        <span className={styles.inner}>
          <span className={styles.medallion}>
            <WingIcon slug={wing.slug} />
          </span>
          <span className={styles.name}>{wing.name}</span>
          <span className={styles.rule} />
          <span className={styles.count}>
            {count} {count === 1 ? "card" : "cards"}
          </span>
          <span className={styles.spacer} />
          <span className={styles.panels}>
            <span className={styles.panel} />
            <span className={styles.panel} />
          </span>
        </span>
        <span className={styles.handle} />
      </span>

      <span className={styles.spill} />

      <span className={styles.enter}>
        Enter wing
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}
