import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireApprovedUser } from "@/lib/auth-utils";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { AppHeader } from "@/components/gallery/AppHeader";
import { CounterOffer } from "@/components/trades/CounterOffer";
import { db } from "@/db";
import { loadOwnCards, loadSharedGallery } from "@/lib/galleries";
import type { Card } from "@/lib/cards";
import { getTradeForUser } from "@/lib/trade-queries";
import { isOpenTrade } from "@/lib/trade-turn";
import styles from "@/components/gallery/shell.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Counter-offer ${id.slice(0, 4)} · TradingCrew` };
}

function resolveCards(ids: string[], snapshots: Card[], live: Card[]): Card[] {
  const byId = new Map<string, Card>();
  for (const card of snapshots) byId.set(card.id, card);
  for (const card of live) byId.set(card.id, card);
  return ids.flatMap((id) => {
    const card = byId.get(id);
    return card ? [card] : [];
  });
}

export default async function CounterTradePage({ params }: PageProps) {
  if (!db) return <ServiceUnavailable />;

  const { id } = await params;
  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect(`/signin?callbackUrl=/trades/${id}/counter`);
    redirect("/pending");
  }

  const trade = await getTradeForUser(user.id, id);
  if (!trade) notFound();
  if (!trade.yourTurn || !isOpenTrade(trade.status)) redirect(`/trades/${id}`);

  const [mine, shared] = await Promise.all([loadOwnCards(user.id), loadSharedGallery(user.id, trade.otherId)]);
  const theirs = shared.kind === "ok" ? shared.cards : [];
  const live = [...mine, ...theirs];

  return (
    <div className={styles.page}>
      <AppHeader user={user} active="/trades" />
      <main className={`tc-container ${styles.main}`}>
        <CounterOffer
          tradeId={trade.id}
          otherName={trade.otherName}
          myCards={mine}
          theirCards={theirs}
          canAddTheirs={shared.kind === "ok"}
          seedWant={resolveCards(trade.youGetIds, trade.snapshots, live)}
          seedGive={resolveCards(trade.youGiveIds, trade.snapshots, live)}
        />
      </main>
    </div>
  );
}
