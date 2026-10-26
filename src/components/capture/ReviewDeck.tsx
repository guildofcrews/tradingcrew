"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { confirmCardReview, fetchReviewCards } from "@/app/actions/review";
import { CornerAdjust } from "@/components/capture/CornerAdjust";
import { CATEGORY_WINGS, CARD_PLACEHOLDER_TITLE, type Category } from "@/lib/cards";
import { getImageUrl } from "@/lib/images";
import type { ReviewCard } from "@/lib/review-queue";
import styles from "./ReviewDeck.module.css";

export function ReviewDeck({
  initialCards,
  batchId,
  startId,
}: {
  initialCards: ReviewCard[];
  batchId: string | null;
  startId: string | null;
}) {
  const [cards, setCards] = useState(initialCards);
  const [index, setIndex] = useState(() => {
    if (!startId) return 0;
    const found = initialCards.findIndex((card) => card.id === startId);
    return found >= 0 ? found : 0;
  });
  const [title, setTitle] = useState(initialCards[0]?.title ?? "");
  const [category, setCategory] = useState<Category | "">(initialCards[0]?.category ?? "");
  const [setName, setSetName] = useState(initialCards[0]?.setName ?? "");
  const [cardNumber, setCardNumber] = useState(initialCards[0]?.cardNumber ?? "");
  const [busy, setBusy] = useState(false);
  const [straighten, setStraighten] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(0);
  const dirty = useRef(false);
  const pointer = useRef<{ id: number; x: number } | null>(null);

  const card = cards[index];
  const waiting = cards.some(
    (item) => item.recognitionStatus === "pending" || item.recognitionStatus === "running",
  );

  useEffect(() => {
    if (!card || dirty.current) return;
    setTitle(card.title);
    setCategory(card.category ?? "");
    setSetName(card.setName ?? "");
    setCardNumber(card.cardNumber ?? "");
  }, [card]);

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(async () => {
      const next = await fetchReviewCards(batchId);
      setCards((current) => current.map((item) => next.find((fresh) => fresh.id === item.id) ?? item));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [waiting, batchId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const delta = event.key === "ArrowRight" ? 1 : -1;
      dirty.current = false;
      setStraighten(false);
      setError(null);
      setDrag(0);
      setIndex((current) => {
        if (cards.length === 0) return 0;
        return (current + delta + cards.length) % cards.length;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards.length]);

  function go(next: number) {
    if (cards.length === 0) return;
    const wrapped = (next + cards.length) % cards.length;
    dirty.current = false;
    setStraighten(false);
    setError(null);
    setDrag(0);
    setIndex(wrapped);
  }

  function markDirty() {
    dirty.current = true;
  }

  async function looksRight() {
    if (!card) return;
    setBusy(true);
    setError(null);
    const result = await confirmCardReview(card.id, {
      title: title.trim() || CARD_PLACEHOLDER_TITLE,
      category: category || null,
      setName,
      cardNumber,
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Couldn't save that card");
      return;
    }
    const nextCards = cards.filter((item) => item.id !== card.id);
    dirty.current = false;
    setCards(nextCards);
    setIndex((current) => Math.max(0, Math.min(current, nextCards.length - 1)));
  }

  async function reread() {
    if (!card) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/cards/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id }),
        redirect: "manual",
      });
      const payload = (await response.json()) as { card?: ReviewCard; error?: string };
      if (!response.ok || !payload.card) {
        setError(payload.error || "Couldn't read that card");
      } else {
        const updated = payload.card;
        dirty.current = false;
        setCards((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      }
    } catch {
      setError("Couldn't read that card");
    } finally {
      setBusy(false);
    }
  }

  async function saveStraightened(blob: Blob) {
    if (!card) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("cardId", card.id);
      body.set("file", new File([blob], "cleaned.jpg", { type: "image/jpeg" }));
      const response = await fetch("/api/cards/straighten", { method: "POST", body, redirect: "manual" });
      const payload = (await response.json()) as { card?: ReviewCard; error?: string };
      if (!response.ok || !payload.card) {
        setError(payload.error || "Couldn't save the crop");
        return;
      }
      const updated = payload.card;
      setCards((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setStraighten(false);
    } catch {
      setError("Couldn't save the crop");
    } finally {
      setBusy(false);
    }
  }

  if (!card) {
    return (
      <div className={styles.page}>
        <header className={styles.top}>
          <Link href="/my-cards" className={styles.back}>
            Gallery
          </Link>
        </header>
        <main className={styles.main}>
          <div className={styles.done}>
            <h1>All checked</h1>
            <p className={styles.note}>These cards are in your gallery. Anything you skipped stays marked until you say it looks right.</p>
            <Link href="/my-cards" className={styles.primary}>
              Back to the gallery
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const lowConfidence =
    card.recognitionStatus === "done" &&
    card.recognitionConfidence !== null &&
    card.recognitionConfidence < 0.55;
  const reading = card.recognitionStatus === "pending" || card.recognitionStatus === "running";

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link href="/my-cards" className={styles.back}>
          Gallery
        </Link>
        <p className={styles.progress}>
          {index + 1} of {cards.length}
        </p>
        <button type="button" className={styles.linkish} onClick={() => go(index + 1)}>
          Next
        </button>
      </header>
      <main className={styles.main}>
        {straighten && card.originalImageUrl ? (
          <CornerAdjust
            key={card.originalImageUrl}
            imageUrl={getImageUrl(card.originalImageUrl)}
            busy={busy}
            onCancel={() => setStraighten(false)}
            onApply={(blob) => void saveStraightened(blob)}
          />
        ) : (
          <>
            <article
              className={styles.frame}
              style={{ transform: `translateX(${drag}px)` }}
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest("button, input, a, textarea")) return;
                pointer.current = { id: event.pointerId, x: event.clientX };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!pointer.current || pointer.current.id !== event.pointerId) return;
                setDrag(event.clientX - pointer.current.x);
              }}
              onPointerUp={(event) => {
                if (!pointer.current || pointer.current.id !== event.pointerId) return;
                const delta = event.clientX - pointer.current.x;
                pointer.current = null;
                setDrag(0);
                if (delta > 70) go(index - 1);
                if (delta < -70) go(index + 1);
              }}
              onPointerCancel={() => {
                pointer.current = null;
                setDrag(0);
              }}
            >
              <div className={styles.photo}>
                <Image
                  src={getImageUrl(card.imageUrl)}
                  alt={title || "Card photo"}
                  fill
                  unoptimized
                  sizes="440px"
                  key={card.imageUrl}
                />
                <span className={styles.badge}>Check me</span>
              </div>
            </article>

            <label className={styles.note} htmlFor="card-title">
              Name
            </label>
            <input
              id="card-title"
              className={styles.title}
              value={title}
              autoComplete="off"
              onChange={(event) => {
                markDirty();
                setTitle(event.target.value);
              }}
            />

            <div className={styles.wings} role="radiogroup" aria-label="Wing">
              {CATEGORY_WINGS.map((wing) => {
                const on = category === wing.slug;
                return (
                  <button
                    key={wing.slug}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={on ? styles.wingOn : styles.wing}
                    style={{ "--accent": wing.accent } as CSSProperties}
                    onClick={() => {
                      markDirty();
                      setCategory(wing.slug as Category);
                    }}
                  >
                    {wing.name}
                  </button>
                );
              })}
              <button
                type="button"
                role="radio"
                aria-checked={category === ""}
                className={category === "" ? styles.wingOn : styles.wing}
                onClick={() => {
                  markDirty();
                  setCategory("");
                }}
              >
                Not sure
              </button>
            </div>

            <div className={styles.details}>
              <input
                aria-label="Set name"
                placeholder="Set"
                value={setName}
                onChange={(event) => {
                  markDirty();
                  setSetName(event.target.value);
                }}
              />
              <input
                aria-label="Card number"
                placeholder="Number"
                value={cardNumber}
                onChange={(event) => {
                  markDirty();
                  setCardNumber(event.target.value);
                }}
              />
            </div>

            <p className={styles.note}>
              {reading && "Reading the card…"}
              {card.recognitionStatus === "failed" && "I couldn't read this one. You can type the name."}
              {lowConfidence && "Please check this name."}
              {card.scanStatus === "original" && " The table is still in the photo — straighten it if you want."}
              {!reading && card.recognitionStatus !== "failed" && !lowConfidence && card.scanStatus !== "original" && "Swipe for the next card. It stays in your gallery either way."}
            </p>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <div className={styles.row}>
              <button type="button" className={styles.secondary} onClick={() => go(index + 1)}>
                Skip
              </button>
              <button type="button" className={styles.primary} onClick={() => void looksRight()} disabled={busy}>
                {busy ? "Saving…" : "Looks right"}
              </button>
            </div>
            <div className={styles.tools}>
              {card.originalImageUrl && (
                <button type="button" className={styles.linkish} onClick={() => setStraighten(true)}>
                  Straighten
                </button>
              )}
              {card.recognitionStatus !== "done" && (
                <button type="button" className={styles.linkish} onClick={() => void reread()} disabled={busy}>
                  Try reading again
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
