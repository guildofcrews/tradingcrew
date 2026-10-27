import "server-only";
import { cache } from "react";
import { desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { trades, type TradeStatus } from "@/db/schema";
import { toViewCard, type Card, type Category } from "@/lib/cards";
import { presentCardValue } from "@/lib/pokemon-price/display";
import { livePokemonByCardId } from "@/lib/pokemon-price/attach";
import { publicName } from "@/lib/presentation";

export type TradeListItem = {
  id: string;
  status: TradeStatus;
  statusReason: string | null;
  createdAt: string;
  youAre: "proposer" | "recipient";
  otherName: string;
  youGetCount: number;
  youGiveCount: number;
};

export type TradeDetail = {
  id: string;
  status: TradeStatus;
  message: string | null;
  statusReason: string | null;
  createdAt: string;
  respondedAt: string | null;
  proposerCompletedAt: string | null;
  recipientCompletedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  youAre: "proposer" | "recipient";
  otherName: string;
  youGet: Card[];
  youGive: Card[];
};

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function cardFromItem(item: {
  id: string;
  cardId: string | null;
  title: string;
  imageUrl: string;
  category: Category | null;
  setName: string | null;
  setCode: string | null;
  cardNumber: string | null;
  createdAt: string;
}): Card {
  return toViewCard({
    id: item.id,
    title: item.title,
    imageUrl: item.cardId ? item.imageUrl : "",
    category: item.category,
    setName: item.setName,
    setCode: item.setCode,
    cardNumber: item.cardNumber,
    createdAt: item.createdAt,
  });
}

export const listTradesForUser = cache(async function listTradesForUser(userId: string): Promise<TradeListItem[]> {
  if (!db) return [];
  const rows = await db.query.trades.findMany({
    where: or(eq(trades.proposerId, userId), eq(trades.recipientId, userId)),
    with: {
      items: true,
      proposer: { columns: { id: true, name: true } },
      recipient: { columns: { id: true, name: true } },
    },
    orderBy: [desc(trades.createdAt)],
  });

  return rows.map((trade) => {
    const youAre = trade.proposerId === userId ? "proposer" : "recipient";
    const offers = trade.items.filter((item) => item.direction === "offer").length;
    const requests = trade.items.filter((item) => item.direction === "request").length;
    return {
      id: trade.id,
      status: trade.status,
      statusReason: trade.statusReason,
      createdAt: trade.createdAt.toISOString(),
      youAre,
      otherName: publicName(youAre === "proposer" ? trade.recipient : trade.proposer),
      youGetCount: youAre === "proposer" ? requests : offers,
      youGiveCount: youAre === "proposer" ? offers : requests,
    };
  });
});

export const getTradeForUser = cache(async function getTradeForUser(
  userId: string,
  tradeId: string
): Promise<TradeDetail | null> {
  if (!db) return null;
  const trade = await db.query.trades.findFirst({
    where: eq(trades.id, tradeId),
    with: {
      items: true,
      proposer: { columns: { id: true, name: true } },
      recipient: { columns: { id: true, name: true } },
    },
  });
  if (!trade) return null;
  if (trade.proposerId !== userId && trade.recipientId !== userId) return null;

  const youAre = trade.proposerId === userId ? "proposer" : "recipient";
  const createdAt = trade.createdAt.toISOString();
  const liveCards = await livePokemonByCardId(
    trade.items.flatMap((item) => (item.cardId ? [item.cardId] : [])),
  );
  const priced = (item: (typeof trade.items)[number]) => {
    const view = cardFromItem({ ...item, createdAt });
    if (item.category !== "pokemon") return view;
    const live = item.cardId ? liveCards.get(item.cardId) : undefined;
    const price = (live?.category === "pokemon" && live.price) || presentCardValue([], null);
    if (live?.category !== "pokemon") return { ...view, price };
    return {
      ...view,
      price,
      officialImageUrl: live.officialImageUrl,
      preferKidPhoto: live.preferKidPhoto,
      tcgdexId: live.tcgdexId,
    };
  };
  const offers = trade.items.filter((item) => item.direction === "offer").map(priced);
  const requests = trade.items.filter((item) => item.direction === "request").map(priced);

  return {
    id: trade.id,
    status: trade.status,
    message: trade.message,
    statusReason: trade.statusReason,
    createdAt,
    respondedAt: iso(trade.respondedAt),
    proposerCompletedAt: iso(trade.proposerCompletedAt),
    recipientCompletedAt: iso(trade.recipientCompletedAt),
    completedAt: iso(trade.completedAt),
    closedAt: iso(trade.closedAt),
    youAre,
    otherName: publicName(youAre === "proposer" ? trade.recipient : trade.proposer),
    youGet: youAre === "proposer" ? requests : offers,
    youGive: youAre === "proposer" ? offers : requests,
  };
});

export const TRADE_STATUS_LABEL: Record<TradeStatus, string> = {
  proposed: "Proposed",
  accepted: "Accepted — waiting for the swap",
  completed: "Completed",
  rejected: "Declined",
  withdrawn: "Taken back",
  cancelled: "Cancelled",
};
