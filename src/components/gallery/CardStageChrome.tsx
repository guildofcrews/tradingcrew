"use client";

import Link from "next/link";
import { ReadCardButton } from "@/components/capture/ReadCardButton";
import { canChooseOfficialArt } from "@/lib/card-art";
import { formatCardPrinting, type Card } from "@/lib/cards";
import { cardNeedsAiRead, galleryReadLabel } from "@/lib/recognition-plan";
import styles from "./CardStageChrome.module.css";

export function stageActivateLabel(card: Card, purpose: "detail" | "select", selected: boolean): string {
  if (purpose === "select") {
    return selected ? `Remove ${card.title} from this trade` : `Choose ${card.title}`;
  }
  return `Open ${card.title}`;
}

function artState(card: Card): string | null {
  if (!canChooseOfficialArt(card)) return null;
  return card.preferKidPhoto ? "My photo" : "Official art";
}

/** Previous, position, next. Carousel stops at the ends. A ring leaves both arrows on. */
export function CardStageControls({
  index,
  count,
  onPrevious,
  onNext,
  stopAtEnds = false,
}: {
  index: number;
  count: number;
  onPrevious: () => void;
  onNext: () => void;
  stopAtEnds?: boolean;
}) {
  const alone = count <= 1;
  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.arrow}
        onClick={onPrevious}
        disabled={alone || (stopAtEnds && index <= 0)}
        aria-label="Previous card"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>
      <p className={styles.count} aria-live="polite">
        {count === 0 ? "0 / 0" : `${index + 1} / ${count}`}
      </p>
      <button
        type="button"
        className={styles.arrow}
        onClick={onNext}
        disabled={alone || (stopAtEnds && index >= count - 1)}
        aria-label="Next card"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}

/** Title, printing, value, and art state under the card in front. */
export function CardStageMeta({
  card,
  selected = false,
  ownerActions = false,
}: {
  card: Card;
  selected?: boolean;
  ownerActions?: boolean;
}) {
  const printing = formatCardPrinting(card);
  const priced = card.category === "pokemon" && card.price?.marketUsd != null ? card.price.headline : null;
  const picture = artState(card);

  return (
    <div className={styles.meta}>
      <h2 className={styles.title}>{card.title}</h2>
      {printing && <p className={styles.printing}>{printing}</p>}
      {priced && <p className={styles.value}>{priced}</p>}
      {picture && <p className={styles.picture}>{picture}</p>}
      {selected && <p className={styles.pickedLabel}>Picked</p>}
      {card.locked && ownerActions && <p className={styles.picture}>In a trade</p>}
      {ownerActions && card.needsReview && (
        <Link href={`/my-cards/review?card=${card.id}`} className={styles.review}>
          Check me
        </Link>
      )}
      {ownerActions && cardNeedsAiRead(card) && (
        <ReadCardButton cardId={card.id} label={galleryReadLabel(card.recognitionStatus)} note={card.recognitionNote} />
      )}
    </div>
  );
}
