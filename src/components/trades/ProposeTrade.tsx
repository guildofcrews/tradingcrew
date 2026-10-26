"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { proposeTrade } from "@/app/actions/trades";
import { CardFrame } from "@/components/gallery/CardFrame";
import type { Card } from "@/lib/cards";
import { CardSelectGrid } from "./CardSelectGrid";
import { useTradeDraft } from "./TradeDraft";
import styles from "@/components/gallery/shell.module.css";

export function ProposeTrade({
  ownerId,
  otherName,
  myCards,
}: {
  ownerId: string;
  otherName: string;
  myCards: Card[];
}) {
  const router = useRouter();
  const { draft, toggleWant, clear } = useTradeDraft();
  const [step, setStep] = useState<"pick" | "review">("pick");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = draft.want.length > 0 && draft.give.length > 0;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await proposeTrade({
        recipientId: ownerId,
        wantCardIds: draft.want.map((card) => card.id),
        giveCardIds: draft.give.map((card) => card.id),
        message,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      clear();
      router.push(result.tradeId ? `/trades/${result.tradeId}` : "/trades");
      router.refresh();
    });
  }

  return (
    <div className={styles.stack}>
      <div className={styles.heroText}>
        <Link href={`/shared/${ownerId}`} className={styles.back}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Back to {otherName}&apos;s gallery
        </Link>
        <div className={styles.eyebrow}>Offer a trade</div>
        <h1 className={styles.h1}>{step === "review" ? "Check your trade" : `Cards for ${otherName}`}</h1>
        <p className={styles.lead}>
          {step === "review"
            ? "Look it over, add a short note if you want, then send it."
            : `You get the cards you picked from ${otherName}. Choose one or more of yours to give.`}
        </p>
      </div>

      {draft.want.length === 0 ? (
        <section className={styles.panel}>
          <p className={styles.lead}>Pick at least one card from their gallery first.</p>
          <Link href={`/shared/${ownerId}`} className={styles.primary}>
            Back to their cards
          </Link>
        </section>
      ) : step === "pick" ? (
        <>
          <section className={styles.panel} aria-labelledby="want-heading">
            <h2 id="want-heading" className={styles.h2}>You get</h2>
            <div className={styles.compactGrid}>
              {draft.want.map((card) => (
                <div key={card.id}>
                  <CardFrame card={card} variant="compact" mode="view" />
                  <button type="button" className={styles.quiet} onClick={() => toggleWant(card)} style={{ marginTop: 8 }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="give-heading">
            <h2 id="give-heading" className={styles.h2}>You give</h2>
            <p className={styles.lead}>Tap your cards to add them. Cards already in a swap stay put.</p>
            {myCards.length === 0 ? (
              <p className={styles.muted}>You don&apos;t have any cards to offer yet.</p>
            ) : (
              <div className={styles.compactGrid}>
                <CardSelectGrid cards={myCards} side="give" variant="compact" />
              </div>
            )}
          </section>

          {error && <p className={styles.error}>{error}</p>}
          <button type="button" className={styles.primary} disabled={!ready} onClick={() => setStep("review")}>
            Review trade
          </button>
        </>
      ) : (
        <section className={styles.panel} aria-labelledby="review-heading">
          <h2 id="review-heading" className={styles.h2}>Ready to send?</h2>
          <div className={styles.split}>
            <div>
              <p className={styles.label}>You get</p>
              <ul className={styles.list}>
                {draft.want.map((card) => (
                  <li key={card.id}>{card.title}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className={styles.label}>You give</p>
              <ul className={styles.list}>
                {draft.give.map((card) => (
                  <li key={card.id}>{card.title}</li>
                ))}
              </ul>
            </div>
          </div>
          <label className={styles.field}>
            <span className={styles.label}>Note for {otherName} (optional)</span>
            <textarea
              className={styles.textarea}
              maxLength={280}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Want to swap at recess?"
            />
            <span className={styles.muted}>{message.trim().length}/280</span>
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={pending || !ready} onClick={submit}>
              {pending ? "Sending…" : "Send trade"}
            </button>
            <button type="button" className={styles.secondary} disabled={pending} onClick={() => setStep("pick")}>
              Go back
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
