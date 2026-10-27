"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { FEATURES, formatAdded, formatCardPrinting, wingFor, type Card } from "@/lib/cards";
import { cardNeedsAiRead, galleryReadLabel } from "@/lib/recognition-plan";
import { getImageUrl } from "@/lib/images";
import { ReadCardButton } from "@/components/capture/ReadCardButton";
import { EditCardModal } from "./EditCardModal";
import styles from "./CardFrame.module.css";

interface Props {
  card: Card;
  variant: "compact" | "gallery";
  openToTrade?: boolean;
  /** owner: edit your card. view: read-only. select: tap to add to a trade. */
  mode?: "owner" | "view" | "select";
  selected?: boolean;
  onToggle?: (card: Card) => void;
}

export function CardFrame({ card, variant, openToTrade, mode = "owner", selected = false, onToggle }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const wing = wingFor(card);
  const style = { "--accent": wing.accent } as CSSProperties;
  const showTrade = FEATURES.openToTrade && openToTrade;
  const locked = Boolean(card.locked);
  const frameClass = [
    styles.frame,
    variant === "compact" ? styles.compact : styles.gallery,
    selected ? styles.selected : "",
    mode === "select" && locked ? styles.locked : "",
  ]
    .filter(Boolean)
    .join(" ");

  const offerRead = mode === "owner" && cardNeedsAiRead(card);
  const printing = formatCardPrinting(card);
  const readButton = offerRead ? (
    <ReadCardButton
      cardId={card.id}
      label={galleryReadLabel(card.recognitionStatus)}
      note={card.recognitionNote}
    />
  ) : null;
  const src = card.imageUrl ? getImageUrl(card.imageUrl) : "";
  // Private blob photos are served by /api/images, which checks the session cookie.
  // The Next image optimizer fetches that route server-side without the cookie and gets 401.
  const photo = (
    <div className={styles.photo}>
      {src ? (
        <Image
          src={src}
          alt={card.title}
          fill
          unoptimized={src.startsWith("/api/images")}
          sizes={variant === "gallery" ? "(max-width: 640px) 90vw, 280px" : "(max-width: 640px) 45vw, 200px"}
          className={styles.img}
        />
      ) : (
        <span className={styles.empty}>No photo</span>
      )}
      {mode === "owner" && card.needsReview && (
        <Link href={`/my-cards/review?card=${card.id}`} className={styles.reviewBadge}>
          Check me
        </Link>
      )}
    </div>
  );

  const lockBadge = locked && mode === "owner" ? <span className={styles.tradeBadge}>In a trade</span> : null;

  const inner =
    variant === "compact" ? (
      <>
        <div className={styles.mat}>{photo}</div>
        <h3 className={styles.title}>{card.title}</h3>
        {printing && <p className={styles.printing}>{printing}</p>}
        <div className={styles.wingName}>{wing.name}</div>
        {lockBadge}
        {readButton}
      </>
    ) : (
      <>
        <div className={styles.spotlight} aria-hidden="true" />
        <div className={styles.pictureFrame}>
          <div className={styles.innerMat}>{photo}</div>
        </div>
        <div className={styles.meta}>
          <div className={styles.metaText}>
            <h3 className={styles.title}>{card.title}</h3>
            {printing && <p className={styles.printing}>{printing}</p>}
            <time className={styles.date} dateTime={card.createdAt}>
              {formatAdded(card.createdAt)}
            </time>
          </div>
          <div className={styles.metaActions}>
            {showTrade && <span className={styles.tradeBadge}>Open to trade</span>}
            {lockBadge}
            {mode === "owner" && !locked && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className={styles.editBtn}
                aria-label={`Edit ${card.title}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {readButton}
      </>
    );

  if (mode === "select") {
    const label = locked
      ? `${card.title} is already in a trade`
      : selected
        ? `Remove ${card.title} from this trade`
        : `Choose ${card.title}`;
    return (
      <button
        type="button"
        className={frameClass}
        style={style}
        disabled={locked}
        aria-pressed={selected}
        aria-label={label}
        onClick={() => onToggle?.(card)}
      >
        {inner}
        <span className={styles.selectMark}>{locked ? "In a trade" : selected ? "Picked" : "Tap to pick"}</span>
      </button>
    );
  }

  return (
    <>
      <article className={frameClass} style={style}>
        {inner}
      </article>
      {mode === "owner" && (
        <EditCardModal card={isEditing ? card : null} isOpen={isEditing} onClose={() => setIsEditing(false)} />
      )}
    </>
  );
}
