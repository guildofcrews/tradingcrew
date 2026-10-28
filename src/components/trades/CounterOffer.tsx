"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { counterTrade } from "@/app/actions/trades";
import { CardFrame } from "@/components/gallery/CardFrame";
import { formatCardPrinting, type Card } from "@/lib/cards";
import { collectionTotalFromCards, PRICE_CREDIT } from "@/lib/pokemon-price/display";
import { CardSelectGrid } from "./CardSelectGrid";
import { TradeDraftProvider, useTradeDraft } from "./TradeDraft";
import styles from "@/components/gallery/shell.module.css";

export function CounterOffer({
  tradeId,
  otherName,
  myCards,
  theirCards,
  canAddTheirs,
  seedWant,
  seedGive,
}: {
  tradeId: string;
  otherName: string;
  myCards: Card[];
  theirCards: Card[];
  canAddTheirs: boolean;
  seedWant: Card[];
  seedGive: Card[];
}) {
  return (
    <TradeDraftProvider ownerId={`counter:${tradeId}`}>
      <CounterEditor
        tradeId={tradeId}
        otherName={otherName}
        myCards={myCards}
        theirCards={theirCards}
        canAddTheirs={canAddTheirs}
        seedWant={seedWant}
        seedGive={seedGive}
      />
    </TradeDraftProvider>
  );
}

function SideTotal({ cards }: { cards: readonly { price?: Card["price"] }[] }) {
  const total = collectionTotalFromCards(cards);
  if (!total.short) return null;
  return <p className={styles.muted}>{total.short}</p>;
}

function CounterEditor({
  tradeId,
  otherName,
  myCards,
  theirCards,
  canAddTheirs,
  seedWant,
  seedGive,
}: {
  tradeId: string;
  otherName: string;
  myCards: Card[];
  theirCards: Card[];
  canAddTheirs: boolean;
  seedWant: Card[];
  seedGive: Card[];
}) {
  const router = useRouter();
  const { draft, notice, toggleWant, toggleGive, replace, clear } = useTradeDraft();
  const didSeed = useRef(false);
  const [step, setStep] = useState<"pick" | "review">("pick");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = draft.want.length > 0 && draft.give.length > 0;
  const wantPicker = canAddTheirs ? theirCards : seedWant;
  const wantPickerIds = new Set(wantPicker.map((card) => card.id));
  const givePickerIds = new Set(myCards.map((card) => card.id));
  const extraWant = draft.want.filter((card) => !wantPickerIds.has(card.id));
  const extraGive = draft.give.filter((card) => !givePickerIds.has(card.id));
  const showPrices = [...draft.want, ...draft.give].some((card) => card.category === "pokemon" && card.price?.credit);

  useEffect(() => {
    if (didSeed.current) return;
    didSeed.current = true;
    if (seedWant.length === 0 && seedGive.length === 0) return;
    try {
      const raw = sessionStorage.getItem(`tc-trade-draft:counter:${tradeId}`);
      const saved = raw ? (JSON.parse(raw) as { want?: unknown[]; give?: unknown[] }) : null;
      if ((saved?.want?.length ?? 0) > 0 || (saved?.give?.length ?? 0) > 0) return;
    } catch {
      // Private mode can block storage. Seeding the in-memory draft is still right.
    }
    replace(seedWant, seedGive);
  }, [replace, seedGive, seedWant, tradeId]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await counterTrade({
        tradeId,
        wantCardIds: draft.want.map((card) => card.id),
        giveCardIds: draft.give.map((card) => card.id),
        message,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      clear();
      router.push(`/trades/${tradeId}`);
      router.refresh();
    });
  }

  return (
    <div className={styles.stack}>
      <div className={styles.heroText}>
        <Link href={`/trades/${tradeId}`} className={styles.back}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Back to the trade
        </Link>
        <div className={styles.eyebrow}>Counter-offer</div>
        <h1 className={styles.h1}>{step === "review" ? "Check your counter-offer" : `Change the trade with ${otherName}`}</h1>
        <p className={styles.lead}>
          {step === "review"
            ? "This replaces the cards on the table. Then it's their turn."
            : "Start from the current cards. Add or remove any, on both sides."}
        </p>
      </div>

      {step === "pick" ? (
        <>
          <section className={styles.panel} aria-labelledby="want-heading">
            <h2 id="want-heading" className={styles.h2}>You get</h2>
            <SideTotal cards={draft.want} />
            {canAddTheirs ? (
              <p className={styles.lead}>Tap {otherName}&apos;s cards to add or remove them.</p>
            ) : (
              <p className={styles.lead}>
                You can take their cards off this offer. To add more of their cards, they need to share their gallery with you.
              </p>
            )}
            {wantPicker.length === 0 ? (
              <p className={styles.muted}>No cards from {otherName} to change right now.</p>
            ) : (
              <div className={styles.compactGrid}>
                <CardSelectGrid cards={wantPicker} side="want" variant="compact" />
              </div>
            )}
            {extraWant.length > 0 && (
              <div className={styles.compactGrid}>
                {extraWant.map((card) => (
                  <div key={card.id}>
                    <CardFrame card={card} variant="compact" mode="view" />
                    <button type="button" className={styles.quiet} onClick={() => toggleWant(card)} style={{ marginTop: 8 }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="give-heading">
            <h2 id="give-heading" className={styles.h2}>You give</h2>
            <SideTotal cards={draft.give} />
            <p className={styles.lead}>Tap your cards to add or remove them. Cards already promised in a swap stay put.</p>
            {myCards.length === 0 ? (
              <p className={styles.muted}>You don&apos;t have any cards to offer yet.</p>
            ) : (
              <div className={styles.compactGrid}>
                <CardSelectGrid cards={myCards} side="give" variant="compact" />
              </div>
            )}
            {extraGive.length > 0 && (
              <div className={styles.compactGrid}>
                {extraGive.map((card) => (
                  <div key={card.id}>
                    <CardFrame card={card} variant="compact" mode="view" />
                    <button type="button" className={styles.quiet} onClick={() => toggleGive(card)} style={{ marginTop: 8 }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {notice && <p className={styles.error}>{notice}</p>}
          {error && <p className={styles.error}>{error}</p>}
          {showPrices && <p className={styles.muted}>{PRICE_CREDIT}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={!ready} onClick={() => setStep("review")}>
              Review counter-offer
            </button>
            <button type="button" className={styles.secondary} onClick={() => replace(seedWant, seedGive)}>
              Start over
            </button>
          </div>
        </>
      ) : (
        <section className={styles.panel} aria-labelledby="review-heading">
          <h2 id="review-heading" className={styles.h2}>Ready to send?</h2>
          <div className={styles.split}>
            <div>
              <p className={styles.label}>You get</p>
              <SideTotal cards={draft.want} />
              <ul className={styles.list}>
                {draft.want.map((card) => (
                  <li key={card.id}>
                    {card.title}
                    {formatCardPrinting(card) && <div className={styles.muted}>{formatCardPrinting(card)}</div>}
                    {card.category === "pokemon" && card.price?.headline && (
                      <div className={styles.muted}>{card.price.headline}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={styles.label}>You give</p>
              <SideTotal cards={draft.give} />
              <ul className={styles.list}>
                {draft.give.map((card) => (
                  <li key={card.id}>
                    {card.title}
                    {formatCardPrinting(card) && <div className={styles.muted}>{formatCardPrinting(card)}</div>}
                    {card.category === "pokemon" && card.price?.headline && (
                      <div className={styles.muted}>{card.price.headline}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {showPrices && <p className={styles.muted}>{PRICE_CREDIT}</p>}
          <label className={styles.field}>
            <span className={styles.label}>Note for {otherName} (optional)</span>
            <textarea
              className={styles.textarea}
              maxLength={280}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="How about these instead?"
            />
            <span className={styles.muted}>{message.trim().length}/280</span>
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={pending || !ready} onClick={submit}>
              {pending ? "Sending…" : "Send counter-offer"}
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
