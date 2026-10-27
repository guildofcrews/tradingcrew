import "server-only";
import { cache } from "react";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { cards, galleryShares, trades, users } from "@/db/schema";
import { type Card } from "@/lib/cards";
import { viewCardsWithPrices } from "@/lib/pokemon-price/attach";

export type SharedGallery =
  | { kind: "unavailable" }
  | { kind: "self" }
  | { kind: "hidden" }
  | {
      kind: "ok";
      owner: { id: string; name: string | null };
      cards: Card[];
      tradesDone: number;
    };

export const loadSharedGallery = cache(async function loadSharedGallery(
  viewerId: string,
  ownerId: string
): Promise<SharedGallery> {
  if (!db) return { kind: "unavailable" };
  if (viewerId === ownerId) return { kind: "self" };

  const owner = await db.query.users.findFirst({
    where: eq(users.id, ownerId),
    columns: { id: true, name: true, status: true },
  });
  if (!owner || owner.status !== "approved") return { kind: "hidden" };

  const share = await db.query.galleryShares.findFirst({
    where: and(eq(galleryShares.ownerId, ownerId), eq(galleryShares.granteeId, viewerId)),
    columns: { id: true },
  });
  if (!share) return { kind: "hidden" };

  const [rows, tradesDone] = await Promise.all([
    db.query.cards.findMany({
      where: eq(cards.ownerId, ownerId),
      orderBy: [desc(cards.createdAt)],
    }),
    countCompletedTrades(ownerId),
  ]);

  return {
    kind: "ok",
    owner: { id: owner.id, name: owner.name },
    cards: await viewCardsWithPrices(rows),
    tradesDone,
  };
});

export const loadOwnCards = cache(async function loadOwnCards(userId: string): Promise<Card[]> {
  if (!db) return [];
  const rows = await db.query.cards.findMany({
    where: eq(cards.ownerId, userId),
    orderBy: [desc(cards.createdAt)],
  });
  return viewCardsWithPrices(rows);
});

export const countCompletedTrades = cache(async function countCompletedTrades(userId: string) {
  if (!db) return 0;
  const rows = await db
    .select({ id: trades.id })
    .from(trades)
    .where(
      and(
        eq(trades.status, "completed"),
        or(eq(trades.proposerId, userId), eq(trades.recipientId, userId))
      )
    );
  return rows.length;
});

export const countIncomingTrades = cache(async function countIncomingTrades(userId: string) {
  if (!db) return 0;
  const rows = await db
    .select({ id: trades.id })
    .from(trades)
    .where(and(eq(trades.recipientId, userId), eq(trades.status, "proposed")));
  return rows.length;
});
