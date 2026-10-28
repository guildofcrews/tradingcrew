"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { updateCard } from "@/app/actions/cards";
import { FEATURES, formatAdded, formatCardPrinting, wingFor, type Card } from "@/lib/cards";
import { artCreditLine, canChooseOfficialArt } from "@/lib/card-art";
import { cardNeedsAiRead, galleryReadLabel } from "@/lib/recognition-plan";
import { ReadCardButton } from "@/components/capture/ReadCardButton";
import { ArtChoice } from "./ArtChoice";
import { CardPhoto } from "./CardPhoto";
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
  const [preferOverride, setPreferOverride] = useState<boolean | null>(null);
  const [savingArt, setSavingArt] = useState(false);
  const [artError, setArtError] = useState<string | null>(null);
  const preferKidPhoto = preferOverride ?? card.preferKidPhoto === true;
  const shown: Card = { ...card, preferKidPhoto };
  const wing = wingFor(shown);
  const style = { "--accent": wing.accent } as CSSProperties;
  const showTrade = FEATURES.openToTrade && openToTrade;
  const locked = Boolean(card.locked);
  const frameClass = [
    styles.frame,
    variant === "compact" ? styles.compact : styles.gallery,
    selected ? styles.selected : "",
    mode === "select" && locked && !selected ? styles.locked : "",
  ]
    .filter(Boolean)
    .join(" ");

  const offerRead = mode === "owner" && cardNeedsAiRead(shown);
  const printing = formatCardPrinting(shown);
  const price = shown.category === "pokemon" ? shown.price : null;
  const credit = artCreditLine(price?.credit, shown);
  const value = price || credit ? (
    <div className={styles.value}>
      {price && <p className={styles.valueHeadline}>{price.headline}</p>}
      {price?.detail && <p className={styles.valueDetail}>{price.detail}</p>}
      {price?.secondary && <p className={styles.valueDetail}>{price.secondary}</p>}
      {credit && <p className={styles.valueCredit}>{credit}</p>}
    </div>
  ) : null;
  const readButton = offerRead ? (
    <ReadCardButton
      cardId={shown.id}
      label={galleryReadLabel(shown.recognitionStatus)}
      note={shown.recognitionNote}
    />
  ) : null;
  const photo = (
    <div className={styles.photo}>
      {shown.imageUrl || shown.officialImageUrl ? (
        <CardPhoto
          card={shown}
          alt={shown.title}
          sizes={variant === "gallery" ? "(max-width: 640px) 90vw, 280px" : "(max-width: 640px) 45vw, 200px"}
          className={styles.img}
        />
      ) : (
        <span className={styles.empty}>No photo</span>
      )}
      {mode === "owner" && shown.needsReview && (
        <Link href={`/my-cards/review?card=${shown.id}`} className={styles.reviewBadge}>
          Check me
        </Link>
      )}
    </div>
  );
  const showArtChoice = variant === "gallery" && mode === "owner" && !locked && canChooseOfficialArt(shown);
  async function chooseArt(next: boolean) {
    if (next === preferKidPhoto || savingArt) return;
    const previous = preferKidPhoto;
    setPreferOverride(next);
    setSavingArt(true);
    setArtError(null);
    const result = await updateCard(shown.id, { preferKidPhoto: next });
    setSavingArt(false);
    if (!result.success) {
      setPreferOverride(previous);
      setArtError("Couldn't save that picture choice. Try again.");
    }
  }
  const artChoice = showArtChoice ? (
    <div className={styles.artChoice}>
      <ArtChoice preferKidPhoto={preferKidPhoto} disabled={savingArt} onChoose={chooseArt} />
      {artError && <p className={styles.artError}>{artError}</p>}
    </div>
  ) : null;

  const lockBadge = locked && mode === "owner" ? <span className={styles.tradeBadge}>In a trade</span> : null;

  const inner =
    variant === "compact" ? (
      <>
        <div className={styles.mat}>{photo}</div>
        <h3 className={styles.title}>{shown.title}</h3>
        {printing && <p className={styles.printing}>{printing}</p>}
        {value}
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
            <h3 className={styles.title}>{shown.title}</h3>
            {printing && <p className={styles.printing}>{printing}</p>}
            {value}
            <time className={styles.date} dateTime={shown.createdAt}>
              {formatAdded(shown.createdAt)}
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
                aria-label={`Edit ${shown.title}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {artChoice}
        {readButton}
      </>
    );

  if (mode === "select") {
    const label = selected
      ? `Remove ${shown.title} from this trade`
      : locked
        ? `${shown.title} is already in a trade`
        : `Choose ${shown.title}`;
    return (
      <button
        type="button"
        className={frameClass}
        style={style}
        disabled={locked && !selected}
        aria-pressed={selected}
        aria-label={label}
        onClick={() => onToggle?.(shown)}
      >
        {inner}
        <span className={styles.selectMark}>{locked && !selected ? "In a trade" : selected ? "Picked" : "Tap to pick"}</span>
      </button>
    );
  }

  return (
    <>
      <article className={frameClass} style={style}>
        {inner}
      </article>
      {mode === "owner" && (
        <EditCardModal
          card={isEditing ? shown : null}
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          onArtSaved={setPreferOverride}
        />
      )}
    </>
  );
}
