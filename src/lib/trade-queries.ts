import "server-only";
import { cache } from "react";
import { desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { trades, type TradeStatus } from "@/db/schema";
import { toViewCard, type Card, type Category } from "@/lib/cards";
import { presentCardValue } from "@/lib/pokemon-price/display";
import { livePokemonByCardId } from "@/lib/pokemon-price/attach";
import { publicName } from "@/lib/presentation";
import { isYourTurn } from "@/lib/trade-turn";

export type TradeListItem = {
  id: string;
  status: TradeStatus;
  statusReason: string | null;
  createdAt: string;
  youAre: "proposer" | "recipient";
  yourTurn: boolean;
  otherName: string;
  youGetCount: number;
  youGiveCount: number;
};

export type TradeRoundView = {
  id: string;
  roundNumber: number;
  kind: "offer" | "counter";
  authorName: string;
  createdAt: string;
  message: string | null;
  youGet: Card[];
  youGive: Card[];
  latest: boolean;
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
  yourTurn: boolean;
  otherId: string;
  otherName: string;
  youGet: Card[];
  youGive: Card[];
  /** Real card ids on the latest terms, for the counter editor. */
  youGetIds: string[];
  youGiveIds: string[];
  /** Latest-term cards keyed by the real card id, including a locked flag. */
  snapshots: Card[];
  rounds: TradeRoundView[];
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

function idsOf(items: { cardId: string | null }[]): string[] {
  return items.flatMap((item) => (item.cardId ? [item.cardId] : []));
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
      yourTurn: isYourTurn(trade, userId),
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
      items: { with: { card: { columns: { lockedTradeId: true } } } },
      rounds: {
        with: {
          author: { columns: { id: true, name: true } },
          items: true,
        },
      },
      proposer: { columns: { id: true, name: true } },
      recipient: { columns: { id: true, name: true } },
    },
  });
  if (!trade) return null;
  if (trade.proposerId !== userId && trade.recipientId !== userId) return null;

  const youAre = trade.proposerId === userId ? "proposer" : "recipient";
  const other = youAre === "proposer" ? trade.recipient : trade.proposer;
  const createdAt = trade.createdAt.toISOString();
  const liveCards = await livePokemonByCardId(
    trade.items.flatMap((item) => (item.cardId ? [item.cardId] : [])),
  );
  const priced = (item: (typeof trade.items)[number]) => {
    const view = cardFromItem({ ...item, createdAt });
    const locked = Boolean(item.card?.lockedTradeId);
    if (item.category !== "pokemon") return { ...view, locked };
    const live = item.cardId ? liveCards.get(item.cardId) : undefined;
    const price = (live?.category === "pokemon" && live.price) || presentCardValue([], null);
    if (live?.category !== "pokemon") return { ...view, price, locked };
    return {
      ...view,
      price,
      locked,
      officialImageUrl: live.officialImageUrl,
      preferKidPhoto: live.preferKidPhoto,
      tcgdexId: live.tcgdexId,
    };
  };
  const offerItems = trade.items.filter((item) => item.direction === "offer");
  const requestItems = trade.items.filter((item) => item.direction === "request");
  const offers = offerItems.map(priced);
  const requests = requestItems.map(priced);
  const youGetItems = youAre === "proposer" ? requestItems : offerItems;
  const youGiveItems = youAre === "proposer" ? offerItems : requestItems;

  const sides = (items: { direction: "offer" | "request"; id: string; cardId: string | null; title: string; imageUrl: string; category: Category | null; setName: string | null; setCode: string | null; cardNumber: string | null }[], at: string) => {
    const got = items
      .filter((item) => (youAre === "proposer" ? item.direction === "request" : item.direction === "offer"))
      .map((item) => cardFromItem({ ...item, createdAt: at }));
    const gave = items
      .filter((item) => (youAre === "proposer" ? item.direction === "offer" : item.direction === "request"))
      .map((item) => cardFromItem({ ...item, createdAt: at }));
    return { youGet: got, youGive: gave };
  };

  const stored = [...trade.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const rounds: TradeRoundView[] =
    stored.length === 0
      ? [
          {
            id: `opening-${trade.id}`,
            roundNumber: 1,
            kind: "offer",
            authorName: youAre === "proposer" ? "You" : publicName(trade.proposer),
            createdAt,
            message: trade.message,
            youGet: youAre === "proposer" ? requests : offers,
            youGive: youAre === "proposer" ? offers : requests,
            latest: true,
          },
        ]
      : stored.map((round, index) => ({
          id: round.id,
          roundNumber: round.roundNumber,
          kind: round.roundNumber === 1 ? "offer" : "counter",
          authorName: round.authorId === userId ? "You" : publicName(round.author),
          createdAt: round.createdAt.toISOString(),
          message: round.message,
          ...sides(round.items, round.createdAt.toISOString()),
          latest: index === stored.length - 1,
        }));

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
    yourTurn: isYourTurn(trade, userId),
    otherId: other.id,
    otherName: publicName(other),
    youGet: youAre === "proposer" ? requests : offers,
    youGive: youAre === "proposer" ? offers : requests,
    youGetIds: idsOf(youGetItems),
    youGiveIds: idsOf(youGiveItems),
    snapshots: trade.items.flatMap((item) => (item.cardId ? [priced({ ...item, id: item.cardId })] : [])),
    rounds,
  };
});

export const TRADE_STATUS_LABEL: Record<TradeStatus, string> = {
  proposed: "Proposed",
  countered: "Countered",
  accepted: "Accepted — waiting for the swap",
  completed: "Completed",
  rejected: "Declined",
  withdrawn: "Taken back",
  cancelled: "Cancelled",
};
