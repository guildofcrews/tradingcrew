import "server-only";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { cards, galleryShares, tradeItems, trades } from "@/db/schema";

/**
 * A viewer may see a card image when they own it, the owner has shared their
 * gallery with them, or the card is on a trade they are party to.
 * Returns null for both missing and unauthorized cards.
 */
export async function findViewableCardByImage(viewerId: string, imageUrl: string) {
  if (!db) return null;

  const card = await db.query.cards.findFirst({
    where: or(eq(cards.imageUrl, imageUrl), eq(cards.originalImageUrl, imageUrl)),
  });
  if (!card) return null;
  if (card.ownerId === viewerId) return card;

  const share = await db.query.galleryShares.findFirst({
    where: and(eq(galleryShares.ownerId, card.ownerId), eq(galleryShares.granteeId, viewerId)),
    columns: { id: true },
  });
  if (share) return card;

  const [tradeHit] = await db
    .select({ id: tradeItems.id })
    .from(tradeItems)
    .innerJoin(trades, eq(trades.id, tradeItems.tradeId))
    .where(
      and(
        eq(tradeItems.cardId, card.id),
        or(eq(trades.proposerId, viewerId), eq(trades.recipientId, viewerId))
      )
    )
    .limit(1);

  return tradeHit ? card : null;
}
