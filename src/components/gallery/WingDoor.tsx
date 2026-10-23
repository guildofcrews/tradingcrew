import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Card, Wing } from "@/lib/cards";
import { getImageUrl } from "@/lib/images";
import { WingIcon } from "./WingIcon";
import styles from "./WingDoor.module.css";

interface Props {
  wing: Wing;
  count: number;
  /** Up to two newest cards in this wing. Missing slots stay empty panels. */
  previews?: readonly Card[];
}

function Panel({ card }: { card?: Card }) {
  if (!card?.imageUrl) {
    return <span className={styles.panel} />;
  }

  const src = getImageUrl(card.imageUrl);
  return (
    <span className={styles.panel}>
      <Image
        src={src}
        alt=""
        fill
        unoptimized={src.startsWith("/api/images")}
        sizes="120px"
        className={styles.thumb}
      />
    </span>
  );
}

export function WingDoor({ wing, count, previews = [] }: Props) {
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
            <Panel card={previews[0]} />
            <Panel card={previews[1]} />
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
