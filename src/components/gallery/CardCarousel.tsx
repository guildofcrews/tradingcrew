"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ReadCardButton } from "@/components/capture/ReadCardButton";
import { canChooseOfficialArt } from "@/lib/card-art";
import { formatCardPrinting, type Card } from "@/lib/cards";
import { cardNeedsAiRead, galleryReadLabel } from "@/lib/recognition-plan";
import { CardPhoto } from "./CardPhoto";
import styles from "./CardCarousel.module.css";

const NEIGHBOR_SPAN = 2;
const DRAG_THRESHOLD = 56;

interface Props {
  cards: readonly Card[];
  /** Centered card tap. Owner opens the edit modal. A shared gallery toggles a trade pick. */
  onOpen?: (card: Card) => void;
  selectedIds?: ReadonlySet<string>;
  /** detail opens the card. select picks it for a trade. */
  purpose?: "detail" | "select";
  /** Owner-only read button and review link. Visitors leave this off. */
  ownerActions?: boolean;
}

function artState(card: Card): string | null {
  if (!canChooseOfficialArt(card)) return null;
  return card.preferKidPhoto ? "My photo" : "Official art";
}

function activateLabel(card: Card, purpose: "detail" | "select", selected: boolean): string {
  if (purpose === "select") {
    return selected ? `Remove ${card.title} from this trade` : `Choose ${card.title}`;
  }
  return `Open ${card.title}`;
}

/**
 * Large centered card with faded, turned neighbors.
 * Hallway rooms can reuse this with any ordered card list.
 */
export function CardCarousel({
  cards,
  onOpen,
  selectedIds,
  purpose = "detail",
  ownerActions = false,
}: Props) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLSpanElement>(null);
  const pointer = useRef<{ id: number; x: number; moved: boolean } | null>(null);
  const finePointer = useRef(false);

  const active = cards.length === 0 ? 0 : Math.min(index, cards.length - 1);
  const card = cards[active];

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      finePointer.current = fine.matches && !reduced.matches;
    };
    sync();
    fine.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      fine.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  function go(delta: number) {
    setIndex((current) => Math.max(0, Math.min(cards.length - 1, Math.min(current, cards.length - 1) + delta)));
  }

  function clearTilt() {
    const face = faceRef.current;
    if (!face) return;
    face.style.removeProperty("--rx");
    face.style.removeProperty("--ry");
    face.style.removeProperty("--mx");
    face.style.removeProperty("--my");
  }

  function activate(place: number) {
    if (!card) return;
    if (place === 0) onOpen?.(card);
    else go(place);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    pointer.current = { id: event.pointerId, x: event.clientX, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    clearTilt();
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const dragStart = pointer.current;
    if (dragStart && dragStart.id === event.pointerId) {
      let dx = event.clientX - dragStart.x;
      if (Math.abs(dx) > 8) dragStart.moved = true;
      if (!dragStart.moved) return;
      if ((active === 0 && dx > 0) || (active === cards.length - 1 && dx < 0)) dx *= 0.35;
      setDragging(true);
      setDrag(dx);
      return;
    }
    if (!finePointer.current || !faceRef.current) return;
    const rect = faceRef.current.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!inside) {
      clearTilt();
      return;
    }
    const mx = ((event.clientX - rect.left) / rect.width) * 100;
    const my = ((event.clientY - rect.top) / rect.height) * 100;
    faceRef.current.style.setProperty("--mx", `${mx}%`);
    faceRef.current.style.setProperty("--my", `${my}%`);
    faceRef.current.style.setProperty("--rx", `${((my - 50) / 50) * -8}deg`);
    faceRef.current.style.setProperty("--ry", `${((mx - 50) / 50) * 10}deg`);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const dragStart = pointer.current;
    if (!dragStart || dragStart.id !== event.pointerId) return;
    const dx = event.clientX - dragStart.x;
    const moved = dragStart.moved;
    pointer.current = null;
    setDrag(0);
    setDragging(false);
    if (moved) {
      if (dx <= -DRAG_THRESHOLD) go(1);
      else if (dx >= DRAG_THRESHOLD) go(-1);
      return;
    }
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const place = under?.closest<HTMLElement>("[data-place]")?.dataset.place;
    if (place != null && place !== "") activate(Number(place));
  }

  function onPointerCancel() {
    pointer.current = null;
    setDrag(0);
    setDragging(false);
    clearTilt();
  }

  if (!card) return null;

  const printing = formatCardPrinting(card);
  const priced = card.category === "pokemon" && card.price?.marketUsd != null ? card.price.headline : null;
  const picture = artState(card);
  const selected = selectedIds?.has(card.id) ?? false;
  const slides = cards.flatMap((item, itemIndex) => {
    const place = itemIndex - active;
    if (Math.abs(place) > NEIGHBOR_SPAN) return [];
    return [{ item, place }];
  });

  return (
    <section
      className={styles.root}
      aria-roledescription="carousel"
      aria-label={`${card.title}, ${active + 1} of ${cards.length}`}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(-1);
        }
      }}
    >
      <div
        ref={stageRef}
        className={dragging ? `${styles.stage} ${styles.dragging}` : styles.stage}
        style={{ "--drag": `${drag}px` } as CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={() => {
          if (!pointer.current) clearTilt();
        }}
      >
        <div className={styles.track}>
          {slides.map(({ item, place }) => {
            const picked = selectedIds?.has(item.id) ?? false;
            return (
              <button
                key={item.id}
                type="button"
                data-place={place}
                className={picked ? `${styles.slide} ${styles.picked}` : styles.slide}
                aria-label={place === 0 ? activateLabel(item, purpose, picked) : `Show ${item.title}`}
                aria-pressed={purpose === "select" && place === 0 ? selected : undefined}
                aria-current={place === 0 ? "true" : undefined}
                tabIndex={place === 0 ? 0 : -1}
                onClick={(event) => {
                  if (event.detail !== 0) return;
                  activate(place);
                }}
              >
                <span className={styles.tilt} ref={place === 0 ? faceRef : undefined}>
                  <span className={styles.face}>
                    {item.imageUrl || item.officialImageUrl ? (
                      <CardPhoto
                        card={item}
                        alt=""
                        sizes={place === 0 ? "(max-width: 640px) 62vw, 300px" : "140px"}
                        className={styles.img}
                        priority={place === 0}
                      />
                    ) : (
                      <span className={styles.empty}>No photo</span>
                    )}
                    {place === 0 && <span className={styles.shine} aria-hidden="true" />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.controls}>
        <button type="button" className={styles.arrow} onClick={() => go(-1)} disabled={active === 0} aria-label="Previous card">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <p className={styles.count} aria-live="polite">
          {active + 1} / {cards.length}
        </p>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => go(1)}
          disabled={active === cards.length - 1}
          aria-label="Next card"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

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
    </section>
  );
}
