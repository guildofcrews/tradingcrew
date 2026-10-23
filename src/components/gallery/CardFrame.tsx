"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { FEATURES, formatAdded, wingFor, type Card } from "@/lib/cards";
import { getImageUrl } from "@/lib/images";
import { EditCardModal } from "./EditCardModal";
import styles from "./CardFrame.module.css";

interface Props {
  card: Card;
  variant: "compact" | "gallery";
  openToTrade?: boolean;
}

export function CardFrame({ card, variant, openToTrade }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const wing = wingFor(card);
  const style = { "--accent": wing.accent } as CSSProperties;
  const showTrade = FEATURES.openToTrade && openToTrade;

  const photo = (
    <div className={styles.photo}>
      {card.imageUrl ? (
        <Image
          src={getImageUrl(card.imageUrl)}
          alt={card.title}
          fill
          sizes={variant === "gallery" ? "(max-width: 640px) 90vw, 280px" : "(max-width: 640px) 45vw, 200px"}
          className={styles.img}
        />
      ) : (
        <span className={styles.empty}>No photo</span>
      )}
    </div>
  );

  if (variant === "compact") {
    return (
      <>
        <article className={`${styles.frame} ${styles.compact}`} style={style}>
          <div className={styles.mat}>{photo}</div>
          <h3 className={styles.title}>{card.title}</h3>
          <div className={styles.wingName}>{wing.name}</div>
        </article>
      </>
    );
  }

  return (
    <>
      <article className={`${styles.frame} ${styles.gallery}`} style={style}>
        <div className={styles.spotlight} aria-hidden="true" />
        <div className={styles.pictureFrame}>
          <div className={styles.innerMat}>{photo}</div>
        </div>
        <div className={styles.meta}>
          <div className={styles.metaText}>
            <h3 className={styles.title}>{card.title}</h3>
            <time className={styles.date} dateTime={card.createdAt}>
              {formatAdded(card.createdAt)}
            </time>
          </div>
          <div className={styles.metaActions}>
            {showTrade && <span className={styles.tradeBadge}>Open to trade</span>}
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
          </div>
        </div>
      </article>

      <EditCardModal
        card={isEditing ? card : null}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
      />
    </>
  );
}
