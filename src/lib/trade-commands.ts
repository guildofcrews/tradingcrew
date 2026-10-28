import "server-only";
import { and, asc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { getTradeDb, type TradeTx } from "@/db/trade-db";
import {
  cards,
  galleryShares,
  tradeItems,
  tradeRoundItems,
  tradeRounds,
  trades,
  users,
  type TradeItemDirection,
} from "@/db/schema";
import { isOpenTrade, isYourTurn, sidesForActor } from "@/lib/trade-turn";

const MAX_SIDE = 24;
const CARD_PROMISED = "This offer was cancelled because a card in it was promised in another trade.";

export class TradeError extends Error {
  readonly tradeError = true;
  constructor(message: string) {
    super(message);
    this.name = "TradeError";
  }
}

export function isTradeError(error: unknown): error is TradeError {
  return (
    error instanceof TradeError ||
    (typeof error === "object" && error !== null && "tradeError" in error && (error as { tradeError?: boolean }).tradeError === true)
  );
}

export type TradeRef = { tradeId: string; proposerId: string; recipientId: string };

function cleanIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string") continue;
    const trimmed = id.trim();
    if (!trimmed || trimmed.length > 80 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function cleanMessage(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (!trimmed) return null;
  if (trimmed.length > 280) {
    throw new TradeError("Keep your note to 280 characters or fewer.");
  }
  return trimmed;
}

function pgCode(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

function isDeadlock(error: unknown): boolean {
  const code = pgCode(error);
  return code === "40P01" || code === "40001";
}

async function withTradeTx<T>(fn: (tx: TradeTx) => Promise<T>): Promise<T> {
  const database = getTradeDb();
  if (!database) throw new TradeError("Database is not configured");
  try {
    return await database.transaction(fn);
  } catch (error) {
    if (isTradeError(error) || !isDeadlock(error)) throw error;
    return database.transaction(fn);
  }
}

async function lockCards(tx: TradeTx, ids: string[]) {
  const sorted = [...new Set(ids)].sort();
  if (sorted.length === 0) return [];
  return tx.select().from(cards).where(inArray(cards.id, sorted)).orderBy(asc(cards.id)).for("update");
}

async function lockTrades(tx: TradeTx, ids: string[]) {
  const sorted = [...new Set(ids)].sort();
  if (sorted.length === 0) return [];
  return tx.select().from(trades).where(inArray(trades.id, sorted)).orderBy(asc(trades.id)).for("update");
}

const openTradeStatus = or(eq(trades.status, "proposed"), eq(trades.status, "countered"));

function itemFields(card: {
  id: string;
  title: string;
  imageUrl: string;
  category: (typeof cards.$inferSelect)["category"];
  setName: string | null;
  setCode: string | null;
  cardNumber: string | null;
}) {
  return {
    cardId: card.id,
    title: card.title,
    imageUrl: card.imageUrl,
    category: card.category,
    setName: card.setName,
    setCode: card.setCode,
    cardNumber: card.cardNumber,
  };
}

function roundFields(item: {
  cardId: string | null;
  direction: TradeItemDirection;
  title: string;
  imageUrl: string;
  category: (typeof cards.$inferSelect)["category"];
  setName: string | null;
  setCode: string | null;
  cardNumber: string | null;
}) {
  return {
    cardId: item.cardId,
    direction: item.direction,
    title: item.title,
    imageUrl: item.imageUrl,
    category: item.category,
    setName: item.setName,
    setCode: item.setCode,
    cardNumber: item.cardNumber,
  };
}

export async function proposeTradeForUser(
  userId: string,
  input: { recipientId: string; wantCardIds: string[]; giveCardIds: string[]; message?: string }
): Promise<TradeRef> {
  const wantIds = cleanIds(input.wantCardIds);
  const giveIds = cleanIds(input.giveCardIds);
  const recipientId = input.recipientId?.trim();

  if (!recipientId) throw new TradeError("Choose a gallery first.");
  if (recipientId === userId) throw new TradeError("You can't trade with yourself.");
  if (wantIds.length < 1 || giveIds.length < 1) {
    throw new TradeError("Pick at least one card to get and one card to give.");
  }
  if (wantIds.length > MAX_SIDE || giveIds.length > MAX_SIDE) {
    throw new TradeError(`You can include up to ${MAX_SIDE} cards on each side.`);
  }
  if (wantIds.some((id) => giveIds.includes(id))) {
    throw new TradeError("A card can't be on both sides of a trade.");
  }
  const message = cleanMessage(input.message);

  const tradeId = await withTradeTx(async (tx) => {
    const [share] = await tx
      .select({ id: galleryShares.id })
      .from(galleryShares)
      .where(and(eq(galleryShares.ownerId, recipientId), eq(galleryShares.granteeId, userId)))
      .for("update");
    if (!share) {
      throw new TradeError("You can only offer a trade when that person has shared their gallery with you.");
    }

    const [recipient] = await tx
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, recipientId));
    if (!recipient || recipient.status !== "approved") {
      throw new TradeError("That gallery isn't available.");
    }

    const locked = await lockCards(tx, [...wantIds, ...giveIds]);
    if (locked.length !== wantIds.length + giveIds.length) {
      throw new TradeError("One of those cards isn't available anymore.");
    }
    const byId = new Map(locked.map((card) => [card.id, card]));

    for (const id of wantIds) {
      const card = byId.get(id);
      if (!card || card.ownerId !== recipientId) {
        throw new TradeError("You can only ask for cards from the gallery you're viewing.");
      }
      if (card.lockedTradeId) {
        throw new TradeError(`"${card.title}" is already promised in another trade.`);
      }
    }
    for (const id of giveIds) {
      const card = byId.get(id);
      if (!card || card.ownerId !== userId) {
        throw new TradeError("You can only offer cards you own.");
      }
      if (card.lockedTradeId) {
        throw new TradeError(`"${card.title}" is already promised in another trade.`);
      }
    }

    const [trade] = await tx
      .insert(trades)
      .values({
        proposerId: userId,
        recipientId,
        message,
        status: "proposed",
        turnUserId: recipientId,
      })
      .returning({ id: trades.id });

    const snapshot = (id: string, direction: TradeItemDirection) => {
      const card = byId.get(id)!;
      return {
        tradeId: trade.id,
        direction,
        // Kid's photo stays on the snapshot. Official art is overlaid from the live card.
        ...itemFields(card),
      };
    };

    const rows = [
      ...giveIds.map((id) => snapshot(id, "offer")),
      ...wantIds.map((id) => snapshot(id, "request")),
    ];
    await tx.insert(tradeItems).values(rows);

    const [round] = await tx
      .insert(tradeRounds)
      .values({ tradeId: trade.id, roundNumber: 1, authorId: userId, message })
      .returning({ id: tradeRounds.id });
    await tx.insert(tradeRoundItems).values(rows.map((row) => ({ roundId: round.id, ...roundFields(row) })));

    return trade.id;
  });

  return { tradeId, proposerId: userId, recipientId };
}

export async function withdrawTradeForUser(userId: string, tradeId: string): Promise<TradeRef> {
  return withTradeTx(async (tx) => {
    const [trade] = await lockTrades(tx, [tradeId]);
    if (!trade) throw new TradeError("That trade doesn't exist.");
    if (trade.proposerId !== userId && trade.recipientId !== userId) {
      throw new TradeError("You aren't part of this trade.");
    }
    if (!isOpenTrade(trade.status)) throw new TradeError("This offer isn't open anymore.");

    const now = new Date();
    const takeBack = trade.status === "proposed" && trade.proposerId === userId;
    const updated = await tx
      .update(trades)
      .set({
        status: takeBack ? "withdrawn" : "cancelled",
        statusReason: takeBack ? "This offer was taken back." : "This trade was cancelled.",
        respondedAt: trade.respondedAt ?? now,
        closedAt: now,
        updatedAt: now,
      })
      .where(and(eq(trades.id, tradeId), openTradeStatus))
      .returning({ id: trades.id, proposerId: trades.proposerId, recipientId: trades.recipientId });

    const row = updated[0];
    if (!row) throw new TradeError("This offer isn't open anymore.");
    return { tradeId: row.id, proposerId: row.proposerId, recipientId: row.recipientId };
  });
}

export async function rejectTradeForUser(userId: string, tradeId: string): Promise<TradeRef> {
  return withTradeTx(async (tx) => {
    const [trade] = await lockTrades(tx, [tradeId]);
    if (!trade) throw new TradeError("That trade doesn't exist.");
    if (!isYourTurn(trade, userId)) throw new TradeError("It's not your turn to answer this trade.");

    const now = new Date();
    const updated = await tx
      .update(trades)
      .set({
        status: "rejected",
        statusReason: "This offer was declined.",
        respondedAt: now,
        closedAt: now,
        updatedAt: now,
      })
      .where(and(eq(trades.id, tradeId), openTradeStatus))
      .returning({ id: trades.id, proposerId: trades.proposerId, recipientId: trades.recipientId });

    const row = updated[0];
    if (!row) throw new TradeError("This offer isn't open anymore.");
    return { tradeId: row.id, proposerId: row.proposerId, recipientId: row.recipientId };
  });
}

export async function acceptTradeForUser(userId: string, tradeId: string): Promise<TradeRef> {
  return withTradeTx(async (tx) => {
    const [preview] = await tx.select().from(trades).where(eq(trades.id, tradeId));
    if (!preview) throw new TradeError("That trade doesn't exist.");
    if (preview.proposerId !== userId && preview.recipientId !== userId) {
      throw new TradeError("You aren't part of this trade.");
    }
    if (!isYourTurn(preview, userId)) {
      throw new TradeError("It's not your turn to answer this trade.");
    }
    if (!isOpenTrade(preview.status)) {
      throw new TradeError("This offer isn't waiting for an answer anymore.");
    }

    const items = await tx.select().from(tradeItems).where(eq(tradeItems.tradeId, tradeId));
    const offers = items.filter((item) => item.direction === "offer");
    const requests = items.filter((item) => item.direction === "request");
    if (offers.length < 1 || requests.length < 1 || items.some((item) => !item.cardId)) {
      throw new TradeError("A card in this offer is missing, so it can't be accepted.");
    }

    const cardIds = items.map((item) => item.cardId!);
    const locked = await lockCards(tx, cardIds);
    const byId = new Map(locked.map((card) => [card.id, card]));

    for (const item of offers) {
      const card = byId.get(item.cardId!);
      if (!card || card.ownerId !== preview.proposerId || card.lockedTradeId) {
        throw new TradeError("A card in this offer isn't available anymore.");
      }
    }
    for (const item of requests) {
      const card = byId.get(item.cardId!);
      if (!card || card.ownerId !== preview.recipientId || card.lockedTradeId) {
        throw new TradeError("A card in this offer isn't available anymore.");
      }
    }

    const overlaps = await tx
      .select({ tradeId: tradeItems.tradeId })
      .from(tradeItems)
      .innerJoin(trades, eq(trades.id, tradeItems.tradeId))
      .where(and(inArray(tradeItems.cardId, cardIds), openTradeStatus, ne(trades.id, tradeId)));
    const otherIds = overlaps.map((row) => row.tradeId);
    const lockedTrades = await lockTrades(tx, [tradeId, ...otherIds]);
    const current = lockedTrades.find((trade) => trade.id === tradeId);
    if (!current || !isOpenTrade(current.status) || !isYourTurn(current, userId)) {
      throw new TradeError("This offer isn't waiting for an answer anymore.");
    }

    const now = new Date();
    if (otherIds.length > 0) {
      await tx
        .update(trades)
        .set({
          status: "cancelled",
          statusReason: CARD_PROMISED,
          closedAt: now,
          updatedAt: now,
        })
        .where(and(inArray(trades.id, [...new Set(otherIds)]), openTradeStatus));
    }

    const lockedUpdate = await tx
      .update(cards)
      .set({ lockedTradeId: tradeId })
      .where(and(inArray(cards.id, cardIds), isNull(cards.lockedTradeId)))
      .returning({ id: cards.id });
    if (lockedUpdate.length !== cardIds.length) {
      throw new TradeError("A card was just promised in another trade. Please try again.");
    }

    const updated = await tx
      .update(trades)
      .set({
        status: "accepted",
        respondedAt: now,
        updatedAt: now,
        statusReason: null,
      })
      .where(and(eq(trades.id, tradeId), openTradeStatus))
      .returning({ id: trades.id, proposerId: trades.proposerId, recipientId: trades.recipientId });
    const trade = updated[0];
    if (!trade) throw new TradeError("This offer isn't waiting for an answer anymore.");
    return { tradeId: trade.id, proposerId: trade.proposerId, recipientId: trade.recipientId };
  });
}

export async function counterTradeForUser(
  userId: string,
  input: { tradeId: string; wantCardIds: string[]; giveCardIds: string[]; message?: string }
): Promise<TradeRef> {
  const wantIds = cleanIds(input.wantCardIds);
  const giveIds = cleanIds(input.giveCardIds);
  const tradeId = input.tradeId?.trim();

  if (!tradeId) throw new TradeError("That trade doesn't exist.");
  if (wantIds.length < 1 || giveIds.length < 1) {
    throw new TradeError("Pick at least one card to get and one card to give.");
  }
  if (wantIds.length > MAX_SIDE || giveIds.length > MAX_SIDE) {
    throw new TradeError(`You can include up to ${MAX_SIDE} cards on each side.`);
  }
  if (wantIds.some((id) => giveIds.includes(id))) {
    throw new TradeError("A card can't be on both sides of a trade.");
  }
  const message = cleanMessage(input.message);

  return withTradeTx(async (tx) => {
    const [preview] = await tx.select().from(trades).where(eq(trades.id, tradeId));
    if (!preview) throw new TradeError("That trade doesn't exist.");
    if (preview.proposerId !== userId && preview.recipientId !== userId) {
      throw new TradeError("You aren't part of this trade.");
    }
    if (!isOpenTrade(preview.status) || !isYourTurn(preview, userId)) {
      throw new TradeError("It's not your turn to change this trade.");
    }
    const otherId = preview.proposerId === userId ? preview.recipientId : preview.proposerId;

    const [share] = await tx
      .select({ id: galleryShares.id })
      .from(galleryShares)
      .where(and(eq(galleryShares.ownerId, otherId), eq(galleryShares.granteeId, userId)))
      .for("update");

    const locked = await lockCards(tx, [...wantIds, ...giveIds]);
    const [trade] = await lockTrades(tx, [tradeId]);
    if (!trade || !isOpenTrade(trade.status) || !isYourTurn(trade, userId)) {
      throw new TradeError("It's not your turn to change this trade.");
    }

    const items = await tx.select().from(tradeItems).where(eq(tradeItems.tradeId, tradeId));
    if (items.some((item) => !item.cardId)) {
      throw new TradeError("A card in this offer is missing, so it can't be changed.");
    }
    const currentIds = new Set(items.map((item) => item.cardId!));
    if (locked.length !== wantIds.length + giveIds.length) {
      throw new TradeError("One of those cards isn't available anymore.");
    }

    const byId = new Map(locked.map((card) => [card.id, card]));
    const { offerIds, requestIds } = sidesForActor(trade.proposerId === userId, wantIds, giveIds);
    if (wantIds.some((id) => !currentIds.has(id)) && !share) {
      throw new TradeError(
        "You can take their cards off this offer. To add more of their cards, they need to share their gallery with you."
      );
    }

    for (const id of offerIds) {
      const card = byId.get(id);
      if (!card || card.ownerId !== trade.proposerId) {
        throw new TradeError("Those cards have to come from the two people in this trade.");
      }
      if (card.lockedTradeId) throw new TradeError(`"${card.title}" is already promised in another trade.`);
    }
    for (const id of requestIds) {
      const card = byId.get(id);
      if (!card || card.ownerId !== trade.recipientId) {
        throw new TradeError("Those cards have to come from the two people in this trade.");
      }
      if (card.lockedTradeId) throw new TradeError(`"${card.title}" is already promised in another trade.`);
    }

    const existingRounds = await tx
      .select({ roundNumber: tradeRounds.roundNumber })
      .from(tradeRounds)
      .where(eq(tradeRounds.tradeId, tradeId));
    let latestRound = existingRounds.reduce((max, row) => Math.max(max, row.roundNumber), 0);
    if (latestRound === 0) {
      const [opening] = await tx
        .insert(tradeRounds)
        .values({
          tradeId,
          roundNumber: 1,
          authorId: trade.proposerId,
          message: trade.message,
          createdAt: trade.createdAt,
        })
        .returning({ id: tradeRounds.id });
      await tx.insert(tradeRoundItems).values(items.map((item) => ({ roundId: opening.id, ...roundFields(item) })));
      latestRound = 1;
    }

    const [round] = await tx
      .insert(tradeRounds)
      .values({ tradeId, roundNumber: latestRound + 1, authorId: userId, message })
      .returning({ id: tradeRounds.id });

    const nextItems = [
      ...offerIds.map((id) => ({ tradeId, direction: "offer" as const, ...itemFields(byId.get(id)!) })),
      ...requestIds.map((id) => ({ tradeId, direction: "request" as const, ...itemFields(byId.get(id)!) })),
    ];
    await tx.delete(tradeItems).where(eq(tradeItems.tradeId, tradeId));
    await tx.insert(tradeItems).values(nextItems);
    await tx.insert(tradeRoundItems).values(nextItems.map((row) => ({ roundId: round.id, ...roundFields(row) })));

    const now = new Date();
    const updated = await tx
      .update(trades)
      .set({
        status: "countered",
        turnUserId: otherId,
        message,
        statusReason: null,
        respondedAt: trade.respondedAt ?? now,
        updatedAt: now,
      })
      .where(and(eq(trades.id, tradeId), openTradeStatus))
      .returning({ id: trades.id, proposerId: trades.proposerId, recipientId: trades.recipientId });
    const row = updated[0];
    if (!row) throw new TradeError("It's not your turn to change this trade.");
    return { tradeId: row.id, proposerId: row.proposerId, recipientId: row.recipientId };
  });
}

export async function cancelAcceptedTradeForUser(userId: string, tradeId: string): Promise<TradeRef> {
  return withTradeTx(async (tx) => {
    const [trade] = await lockTrades(tx, [tradeId]);
    if (!trade) throw new TradeError("That trade doesn't exist.");
    if (trade.proposerId !== userId && trade.recipientId !== userId) {
      throw new TradeError("You aren't part of this trade.");
    }
    if (trade.status !== "accepted") {
      throw new TradeError("This swap can't be cancelled.");
    }

    const held = await tx.select({ id: cards.id }).from(cards).where(eq(cards.lockedTradeId, tradeId));
    await lockCards(tx, held.map((card) => card.id));

    const now = new Date();
    await tx.update(cards).set({ lockedTradeId: null }).where(eq(cards.lockedTradeId, tradeId));
    const updated = await tx
      .update(trades)
      .set({
        status: "cancelled",
        statusReason: "The swap was cancelled before both of you confirmed it.",
        closedAt: now,
        updatedAt: now,
      })
      .where(and(eq(trades.id, tradeId), eq(trades.status, "accepted")))
      .returning({ id: trades.id, proposerId: trades.proposerId, recipientId: trades.recipientId });
    const row = updated[0];
    if (!row) throw new TradeError("This swap can't be cancelled.");
    return { tradeId: row.id, proposerId: row.proposerId, recipientId: row.recipientId };
  });
}

export async function confirmTradeForUser(userId: string, tradeId: string): Promise<TradeRef> {
  return withTradeTx(async (tx) => {
    const [trade] = await lockTrades(tx, [tradeId]);
    if (!trade) throw new TradeError("That trade doesn't exist.");
    const youAreProposer = trade.proposerId === userId;
    const youAreRecipient = trade.recipientId === userId;
    if (!youAreProposer && !youAreRecipient) {
      throw new TradeError("You aren't part of this trade.");
    }
    if (trade.status !== "accepted") {
      throw new TradeError("This trade isn't waiting for a swap confirmation.");
    }
    if ((youAreProposer && trade.proposerCompletedAt) || (youAreRecipient && trade.recipientCompletedAt)) {
      return { tradeId: trade.id, proposerId: trade.proposerId, recipientId: trade.recipientId };
    }

    const now = new Date();
    const proposerCompletedAt = youAreProposer ? now : trade.proposerCompletedAt;
    const recipientCompletedAt = youAreRecipient ? now : trade.recipientCompletedAt;

    if (proposerCompletedAt && recipientCompletedAt) {
      const items = await tx.select().from(tradeItems).where(eq(tradeItems.tradeId, tradeId));
      const offers = items.filter((item) => item.direction === "offer");
      const requests = items.filter((item) => item.direction === "request");
      if (
        offers.length < 1 ||
        requests.length < 1 ||
        offers.some((item) => !item.cardId) ||
        requests.some((item) => !item.cardId)
      ) {
        throw new TradeError("A card in this trade is missing, so it can't be completed. You can cancel it instead.");
      }

      const offerIds = offers.map((item) => item.cardId!);
      const requestIds = requests.map((item) => item.cardId!);
      const locked = await lockCards(tx, [...offerIds, ...requestIds]);
      const byId = new Map(locked.map((card) => [card.id, card]));

      for (const id of offerIds) {
        const card = byId.get(id);
        if (!card || card.ownerId !== trade.proposerId || card.lockedTradeId !== trade.id) {
          throw new TradeError("A card changed before the swap could finish. Nothing was moved.");
        }
      }
      for (const id of requestIds) {
        const card = byId.get(id);
        if (!card || card.ownerId !== trade.recipientId || card.lockedTradeId !== trade.id) {
          throw new TradeError("A card changed before the swap could finish. Nothing was moved.");
        }
      }

      const movedOffers = await tx
        .update(cards)
        .set({ ownerId: trade.recipientId, lockedTradeId: null })
        .where(and(inArray(cards.id, offerIds), eq(cards.ownerId, trade.proposerId), eq(cards.lockedTradeId, trade.id)))
        .returning({ id: cards.id });
      if (movedOffers.length !== offerIds.length) {
        throw new TradeError("A card changed before the swap could finish. Nothing was moved.");
      }

      const movedRequests = await tx
        .update(cards)
        .set({ ownerId: trade.proposerId, lockedTradeId: null })
        .where(and(inArray(cards.id, requestIds), eq(cards.ownerId, trade.recipientId), eq(cards.lockedTradeId, trade.id)))
        .returning({ id: cards.id });
      if (movedRequests.length !== requestIds.length) {
        throw new TradeError("A card changed before the swap could finish. Nothing was moved.");
      }

      const updated = await tx
        .update(trades)
        .set({
          status: "completed",
          proposerCompletedAt,
          recipientCompletedAt,
          completedAt: now,
          updatedAt: now,
          statusReason: null,
        })
        .where(and(eq(trades.id, tradeId), eq(trades.status, "accepted")))
        .returning({ id: trades.id, proposerId: trades.proposerId, recipientId: trades.recipientId });
      const row = updated[0];
      if (!row) throw new TradeError("This trade isn't waiting for a swap confirmation.");
      return { tradeId: row.id, proposerId: row.proposerId, recipientId: row.recipientId };
    }

    const updated = await tx
      .update(trades)
      .set({ proposerCompletedAt, recipientCompletedAt, updatedAt: now })
      .where(and(eq(trades.id, tradeId), eq(trades.status, "accepted")))
      .returning({ id: trades.id, proposerId: trades.proposerId, recipientId: trades.recipientId });
    const row = updated[0];
    if (!row) throw new TradeError("This trade isn't waiting for a swap confirmation.");
    return { tradeId: row.id, proposerId: row.proposerId, recipientId: row.recipientId };
  });
}

export async function detachCardForDelete(
  userId: string,
  cardId: string,
): Promise<{ imageUrl: string; originalImageUrl: string | null }> {
  return withTradeTx(async (tx) => {
    const [card] = await tx
      .select()
      .from(cards)
      .where(and(eq(cards.id, cardId), eq(cards.ownerId, userId)))
      .for("update");
    if (!card) throw new TradeError("Card not found or you don't have permission to delete it");
    if (card.lockedTradeId) {
      throw new TradeError("This card is promised in a trade, so it can't be deleted until that swap is finished or cancelled.");
    }

    const [active] = await tx
      .select({ id: trades.id })
      .from(tradeItems)
      .innerJoin(trades, eq(trades.id, tradeItems.tradeId))
      .where(
        and(
          eq(tradeItems.cardId, cardId),
          or(eq(trades.status, "proposed"), eq(trades.status, "countered"), eq(trades.status, "accepted"))
        )
      )
      .limit(1);
    if (active) {
      throw new TradeError("This card is part of a trade, so it can't be deleted right now.");
    }

    await tx.update(tradeRoundItems).set({ cardId: null }).where(eq(tradeRoundItems.cardId, cardId));
    await tx.update(tradeItems).set({ cardId: null }).where(eq(tradeItems.cardId, cardId));
    await tx.delete(cards).where(and(eq(cards.id, cardId), eq(cards.ownerId, userId)));
    return { imageUrl: card.imageUrl, originalImageUrl: card.originalImageUrl };
  });
}
