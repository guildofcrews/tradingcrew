import Link from "next/link";
import type { CSSProperties } from "react";
import type { Card, Wing } from "@/lib/cards";
import { displayImageSrc } from "@/lib/card-art";
import { CardPhoto } from "./CardPhoto";
import { WingIcon } from "./WingIcon";
import styles from "./WingDoor.module.css";

interface Props {
  wing: Wing;
  count: number;
  /** Short Pokémon total, such as "Approx. $73.22". Sports doors leave this off. */
  value?: string | null;
  /** Up to two newest cards in this wing. Missing slots stay empty panels. */
  previews?: readonly Card[];
  href?: string;
  /** Overrides the wing name. Set doors pass the set name. */
  title?: string;
  eyebrow?: string;
  enterLabel?: string;
  /** Set names wrap to two lines. Wing names stay one line. */
  titleLines?: 1 | 2;
  /** Word after the number. The vault uses "digital card". */
  countNoun?: string;
}

function Panel({ card }: { card?: Card }) {
  if (!card || !displayImageSrc(card)) {
    return <span className={styles.panel} />;
  }

  return (
    <span className={styles.panel}>
      <CardPhoto card={card} alt="" sizes="120px" className={styles.thumb} />
    </span>
  );
}

export function WingDoor({
  wing,
  count,
  value = null,
  previews = [],
  href,
  title,
  eyebrow,
  enterLabel = "Enter wing",
  titleLines = 1,
  countNoun = "card",
}: Props) {
  const style = { "--accent": wing.accent } as CSSProperties;
  const cardsLabel = `${count} ${count === 1 ? countNoun : `${countNoun}s`}`;
  const doorTitle = title ?? wing.name;
  const label =
    titleLines === 2
      ? `Open the ${doorTitle} set, ${cardsLabel}${value ? `, ${value}` : ""}`
      : `Enter the ${doorTitle} wing, ${cardsLabel}${value ? `, ${value}` : ""}`;

  return (
    <Link
      href={href ?? `/my-cards/${wing.slug}`}
      className={styles.door}
      style={style}
      aria-label={label}
    >
      <span className={styles.eyebrow}>{eyebrow ?? wing.tagline}</span>

      <span className={styles.arch}>
        <span className={styles.inner}>
          <span className={styles.medallion}>
            <WingIcon slug={wing.slug} />
          </span>
          <span className={titleLines === 2 ? styles.nameLong : styles.name}>{doorTitle}</span>
          <span className={styles.rule} />
          <span className={styles.count}>{cardsLabel}</span>
          <span className={styles.value} aria-hidden={value ? undefined : true}>
            {value || "\u00a0"}
          </span>
          <span className={styles.panels}>
            <Panel card={previews[0]} />
            <Panel card={previews[1]} />
          </span>
        </span>
        <span className={styles.handle} />
      </span>

      <span className={styles.spill} />

      <span className={styles.enter}>
        {enterLabel}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}
