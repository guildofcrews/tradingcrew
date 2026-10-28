import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireApprovedUser } from "@/lib/auth-utils";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { AppHeader } from "@/components/gallery/AppHeader";
import { CardFrame } from "@/components/gallery/CardFrame";
import { TradeActions } from "@/components/trades/TradeActions";
import { db } from "@/db";
import { formatCardPrinting, type Card } from "@/lib/cards";
import { collectionTotalFromCards, PRICE_CREDIT } from "@/lib/pokemon-price/display";
import { formatWhen } from "@/lib/presentation";
import { getTradeForUser, TRADE_STATUS_LABEL, type TradeRoundView } from "@/lib/trade-queries";
import { isOpenTrade } from "@/lib/trade-turn";
import styles from "@/components/gallery/shell.module.css";

function SideTotal({ cards }: { cards: Card[] }) {
  const total = collectionTotalFromCards(cards);
  if (!total.short) return null;
  return <p className={styles.muted}>{total.short}</p>;
}

function RoundSide({ label, cards }: { label: string; cards: Card[] }) {
  return (
    <div>
      <p className={styles.label}>{label}</p>
      {cards.length === 0 ? (
        <p className={styles.muted}>No cards</p>
      ) : (
        <ul className={styles.list}>
          {cards.map((card) => (
            <li key={card.id}>
              {card.title}
              {formatCardPrinting(card) && <div className={styles.muted}>{formatCardPrinting(card)}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RoundTimeline({ rounds }: { rounds: TradeRoundView[] }) {
  if (rounds.length === 0) return null;
  return (
    <section className={styles.stack} aria-label="Trade history">
      <h2 className={styles.h2}>How this trade changed</h2>
      <ol className={styles.timeline}>
        {rounds.map((round) => (
          <li key={round.id} className={round.latest ? styles.roundLatest : styles.round}>
            <div className={styles.tradeTop}>
              <span className={styles.status}>
                {round.kind === "offer" ? "Offer" : "Counter-offer"}
                {round.latest ? " · Latest" : ""}
              </span>
              <time dateTime={round.createdAt}>{formatWhen(round.createdAt)}</time>
            </div>
            <p className={styles.rowTitle}>{round.authorName}</p>
            {round.message && <p className={styles.muted}>{round.message}</p>}
            <div className={styles.split}>
              <RoundSide label="You get" cards={round.youGet} />
              <RoundSide label="You give" cards={round.youGive} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Trade ${id.slice(0, 4)} · TradingCrew` };
}

export default async function TradeDetailPage({ params }: PageProps) {
  if (!db) return <ServiceUnavailable />;

  const { id } = await params;
  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect(`/signin?callbackUrl=/trades/${id}`);
    redirect("/pending");
  }

  const trade = await getTradeForUser(user.id, id);
  if (!trade) notFound();

  const youConfirmed = trade.youAre === "proposer" ? Boolean(trade.proposerCompletedAt) : Boolean(trade.recipientCompletedAt);
  const theyConfirmed = trade.youAre === "proposer" ? Boolean(trade.recipientCompletedAt) : Boolean(trade.proposerCompletedAt);
  const open = isOpenTrade(trade.status);
  const turnLabel = open ? (trade.yourTurn ? "Waiting on you" : `Waiting on ${trade.otherName}`) : null;
  const showPrices = [...trade.youGet, ...trade.youGive].some((card) => card.category === "pokemon" && card.price?.credit);

  const stamps: { label: string; value: string | null }[] = [
    { label: "Offered", value: trade.createdAt },
    { label: trade.status === "accepted" || trade.status === "completed" ? "Accepted" : "Answered", value: trade.respondedAt },
    { label: "You confirmed the swap", value: trade.youAre === "proposer" ? trade.proposerCompletedAt : trade.recipientCompletedAt },
    { label: `${trade.otherName} confirmed`, value: trade.youAre === "proposer" ? trade.recipientCompletedAt : trade.proposerCompletedAt },
    { label: "Completed", value: trade.completedAt },
    { label: "Closed", value: trade.closedAt },
  ];

  return (
    <div className={styles.page}>
      <AppHeader user={user} active="/trades" />
      <main className={`tc-container ${styles.main}`}>
        <div className={styles.stack}>
          <Link href="/trades" className={styles.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            All trades
          </Link>
          <header className={styles.heroText}>
            <div className={styles.eyebrow}>{TRADE_STATUS_LABEL[trade.status]}</div>
            <h1 className={styles.h1}>Trade with {trade.otherName}</h1>
            {turnLabel && <p className={styles.lead}>{turnLabel}</p>}
            {trade.status === "accepted" && (
              <p className={styles.lead}>Accepted — waiting for the real-life swap.</p>
            )}
            {trade.status === "completed" && (
              <p className={styles.lead}>This trade is complete. The cards have moved.</p>
            )}
          </header>

          {trade.message && <blockquote className={styles.note}>{trade.message}</blockquote>}
          {trade.statusReason && <p className={styles.muted}>{trade.statusReason}</p>}

          <div className={styles.list}>
            {stamps
              .filter((stamp) => stamp.value)
              .map((stamp) => (
                <div key={stamp.label} className={styles.tradeTop}>
                  <span>{stamp.label}</span>
                  <time dateTime={stamp.value!}>{formatWhen(stamp.value)}</time>
                </div>
              ))}
          </div>

          <section className={styles.stack} aria-label="Latest terms">
            {open && <h2 className={styles.h2}>Latest terms</h2>}
            <div className={styles.split}>
              <section className={styles.panel} aria-label="Cards you get">
                <h2 className={styles.h2}>You get</h2>
                <SideTotal cards={trade.youGet} />
                {trade.youGet.length === 0 ? (
                  <p className={styles.muted}>No cards on this side.</p>
                ) : (
                  <div className={styles.compactGrid}>
                    {trade.youGet.map((card) => (
                      <CardFrame key={card.id} card={card} variant="compact" mode="view" />
                    ))}
                  </div>
                )}
              </section>
              <section className={styles.panel} aria-label="Cards you give">
                <h2 className={styles.h2}>You give</h2>
                <SideTotal cards={trade.youGive} />
                {trade.youGive.length === 0 ? (
                  <p className={styles.muted}>No cards on this side.</p>
                ) : (
                  <div className={styles.compactGrid}>
                    {trade.youGive.map((card) => (
                      <CardFrame key={card.id} card={card} variant="compact" mode="view" />
                    ))}
                  </div>
                )}
              </section>
            </div>
            {showPrices && <p className={styles.muted}>{PRICE_CREDIT}</p>}
          </section>

          <RoundTimeline rounds={trade.rounds} />

          <TradeActions
            tradeId={trade.id}
            status={trade.status}
            youAre={trade.youAre}
            yourTurn={trade.yourTurn}
            youConfirmed={youConfirmed}
            theyConfirmed={theyConfirmed}
            otherName={trade.otherName}
          />
        </div>
      </main>
    </div>
  );
}
