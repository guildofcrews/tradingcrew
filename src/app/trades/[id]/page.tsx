import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireApprovedUser } from "@/lib/auth-utils";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { AppHeader } from "@/components/gallery/AppHeader";
import { CardFrame } from "@/components/gallery/CardFrame";
import { TradeActions } from "@/components/trades/TradeActions";
import { db } from "@/db";
import { formatWhen } from "@/lib/presentation";
import { getTradeForUser, TRADE_STATUS_LABEL } from "@/lib/trade-queries";
import styles from "@/components/gallery/shell.module.css";

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

          <div className={styles.split}>
            <section className={styles.panel} aria-label="Cards you get">
              <h2 className={styles.h2}>You get</h2>
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

          <TradeActions
            tradeId={trade.id}
            status={trade.status}
            youAre={trade.youAre}
            youConfirmed={youConfirmed}
            theyConfirmed={theyConfirmed}
            otherName={trade.otherName}
          />
        </div>
      </main>
    </div>
  );
}
