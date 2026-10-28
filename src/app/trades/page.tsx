import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireApprovedUser } from "@/lib/auth-utils";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { AppHeader } from "@/components/gallery/AppHeader";
import { db } from "@/db";
import { formatWhen } from "@/lib/presentation";
import { listTradesForUser, TRADE_STATUS_LABEL, type TradeListItem } from "@/lib/trade-queries";
import { listSharing } from "@/lib/sharing";
import styles from "@/components/gallery/shell.module.css";

export const metadata: Metadata = { title: "Trades · TradingCrew" };

function isOpen(trade: TradeListItem): boolean {
  return trade.status === "proposed" || trade.status === "countered";
}

function headline(trade: TradeListItem): string {
  if (isOpen(trade)) return trade.yourTurn ? "Waiting on you" : `Waiting on ${trade.otherName}`;
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
            {trade.statusReason && !isOpen(trade) && trade.status !== "accepted" && (
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

  const [trades, sharing] = await Promise.all([listTradesForUser(user.id), listSharing(user.id)]);
  const sharedWithYou = sharing.received;
  const incoming = trades.filter((trade) => isOpen(trade) && trade.yourTurn);
  const outgoing = trades.filter((trade) => isOpen(trade) && !trade.yourTurn);
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

        <div className={styles.stack}>
        <section className={styles.panel} aria-labelledby="start-trade-heading">
          <h2 id="start-trade-heading" className={styles.h2}>Start a trade</h2>
          {sharedWithYou.length === 0 ? (
            <>
              <p className={styles.lead}>
                A friend needs to share their gallery with you first. They can do that from Sharing.
              </p>
              <Link href="/sharing" className={styles.primary}>
                Go to sharing
              </Link>
            </>
          ) : (
            <ul className={styles.list}>
              {sharedWithYou.map((share) => (
                <li key={share.id} className={styles.row}>
                  <div className={styles.rowText}>
                    <p className={styles.rowTitle}>{share.name}</p>
                    <p className={styles.muted}>Their gallery is shared with you</p>
                  </div>
                  <Link href={`/shared/${share.userId}`} className={styles.primary}>
                    Start a trade
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {trades.length === 0 ? (
          <section className={styles.panel}>
            <p className={styles.lead}>
              {sharedWithYou.length === 0
                ? "No trades yet."
                : "No trades yet. Open a friend's gallery above and pick the cards you want."}
            </p>
          </section>
        ) : (
          <>
            <TradeGroup title="Waiting on you" trades={incoming} />
            <TradeGroup title="Waiting on them" trades={outgoing} />
            <TradeGroup title="Ready to swap" trades={awaiting} />
            <TradeGroup title="Completed" trades={completed} />
            <TradeGroup title="Closed" trades={closed} />
          </>
        )}
        </div>
      </main>
    </div>
  );
}
