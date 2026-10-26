import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireApprovedUser } from "@/lib/auth-utils";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { AppHeader } from "@/components/gallery/AppHeader";
import { db } from "@/db";
import { formatWhen } from "@/lib/presentation";
import { listTradesForUser, TRADE_STATUS_LABEL, type TradeListItem } from "@/lib/trade-queries";
import styles from "@/components/gallery/shell.module.css";

export const metadata: Metadata = { title: "Trades · TradingCrew" };

function headline(trade: TradeListItem): string {
  if (trade.status === "proposed" && trade.youAre === "recipient") return `${trade.otherName} wants to trade`;
  if (trade.status === "proposed") return `Waiting for ${trade.otherName}`;
  if (trade.status === "accepted") return `Swap in person with ${trade.otherName}`;
  if (trade.status === "completed") return `Traded with ${trade.otherName}`;
  if (trade.status === "rejected") {
    return trade.youAre === "recipient" ? `You declined ${trade.otherName}` : `${trade.otherName} declined`;
  }
  if (trade.status === "withdrawn") return `Offer with ${trade.otherName} was taken back`;
  return `Trade with ${trade.otherName} was cancelled`;
}

function TradeGroup({ title, trades }: { title: string; trades: TradeListItem[] }) {
  if (trades.length === 0) return null;
  return (
    <section className={styles.stack} aria-label={title}>
      <h2 className={styles.h2}>
        {title} ({trades.length})
      </h2>
      <div className={styles.list}>
        {trades.map((trade) => (
          <Link key={trade.id} href={`/trades/${trade.id}`} className={styles.tradeLink}>
            <div className={styles.tradeTop}>
              <span className={styles.status}>{TRADE_STATUS_LABEL[trade.status]}</span>
              <time dateTime={trade.createdAt}>{formatWhen(trade.createdAt)}</time>
            </div>
            <h3 className={styles.rowTitle}>{headline(trade)}</h3>
            <p className={styles.muted}>
              You get {trade.youGetCount} · You give {trade.youGiveCount}
            </p>
            {trade.statusReason && trade.status !== "proposed" && trade.status !== "accepted" && (
              <p className={styles.muted}>{trade.statusReason}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function TradesPage() {
  if (!db) return <ServiceUnavailable />;

  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect("/signin?callbackUrl=/trades");
    redirect("/pending");
  }

  const trades = await listTradesForUser(user.id);
  const incoming = trades.filter((trade) => trade.status === "proposed" && trade.youAre === "recipient");
  const outgoing = trades.filter((trade) => trade.status === "proposed" && trade.youAre === "proposer");
  const awaiting = trades.filter((trade) => trade.status === "accepted");
  const completed = trades.filter((trade) => trade.status === "completed");
  const closed = trades.filter((trade) => trade.status === "rejected" || trade.status === "withdrawn" || trade.status === "cancelled");

  return (
    <div className={styles.page}>
      <AppHeader user={user} active="/trades" />
      <main className={`tc-container ${styles.main}`}>
        <header className={styles.hero}>
          <div className={styles.heroText}>
            <div className={styles.eyebrow}>Swap in person</div>
            <h1 className={styles.h1}>Trades</h1>
            <p className={styles.lead}>
              Offers you&apos;ve sent, offers waiting for you, and swaps that are ready to finish face to face.
            </p>
          </div>
        </header>

        {trades.length === 0 ? (
          <section className={styles.panel}>
            <p className={styles.lead}>No trades yet. When a friend shares their gallery, you can offer a trade.</p>
            <Link href="/sharing" className={styles.primary}>
              Go to sharing
            </Link>
          </section>
        ) : (
          <div className={styles.stack}>
            <TradeGroup title="New offers" trades={incoming} />
            <TradeGroup title="Waiting for them" trades={outgoing} />
            <TradeGroup title="Ready to swap" trades={awaiting} />
            <TradeGroup title="Completed" trades={completed} />
            <TradeGroup title="Closed" trades={closed} />
          </div>
        )}
      </main>
    </div>
  );
}
