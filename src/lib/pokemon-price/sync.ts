import "server-only";

import { and, eq, isNotNull, isNull, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { cardPrices, cards } from "@/db/schema";
import { resolveMatch } from "./match";
import { type PriceLabel } from "./normalize";
import { createTcgdexCatalog, fetchTcgdexCard, mapPool } from "./tcgdex";
import { readTcgplayerPrices } from "./tcgplayer";

const MATCH_BATCH = 40;
const REFRESH_BATCH = 120;
const CONCURRENCY = 3;
const BUDGET_MS = 50_000;

function moneyColumn(value: number | null): string | null {
  return value == null ? null : value.toFixed(2);
}

/**
 * Refresh one catalog card. A missing `pricing.tcgplayer` or a failed request
 * leaves the previous rows in place. An empty variant list does not wipe them either.
 */
export async function refreshCardPrice(tcgdexId: string): Promise<"updated" | "missing" | "empty"> {
  if (!db) return "missing";
  const snapshot = readTcgplayerPrices(await fetchTcgdexCard(tcgdexId));
  if (!snapshot) return "missing";
  if (snapshot.variants.length === 0) return "empty";

  const parsed = snapshot.updated ? new Date(snapshot.updated) : null;
  const sourceUpdatedAt = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  const fetchedAt = new Date();
  for (const variant of snapshot.variants) {
    const row = {
      tcgdexId,
      variant: variant.variant,
      marketUsd: moneyColumn(variant.market),
      lowUsd: moneyColumn(variant.low),
      midUsd: moneyColumn(variant.mid),
      sourceUpdatedAt,
      fetchedAt,
    };
    await db
      .insert(cardPrices)
      .values(row)
      .onConflictDoUpdate({
        target: [cardPrices.tcgdexId, cardPrices.variant],
        set: {
          marketUsd: row.marketUsd,
          lowUsd: row.lowUsd,
          midUsd: row.midUsd,
          sourceUpdatedAt: row.sourceUpdatedAt,
          fetchedAt: row.fetchedAt,
        },
      });
  }

  await db
    .delete(cardPrices)
    .where(
      and(
        eq(cardPrices.tcgdexId, tcgdexId),
        notInArray(
          cardPrices.variant,
          snapshot.variants.map((variant) => variant.variant),
        ),
      ),
    );
  return "updated";
}

/** Resolve one card and, when it matches, fetch its price. Throws if TCGdex is unreachable. */
export async function matchCardById(cardId: string): Promise<void> {
  if (!db) return;
  const card = await db.query.cards.findFirst({ where: eq(cards.id, cardId) });
  if (!card) return;

  if (card.category !== "pokemon") {
    await db
      .update(cards)
      .set({ tcgdexId: null, matchConfidence: null, matchCandidates: null, priceVariant: null })
      .where(eq(cards.id, cardId));
    return;
  }

  await db
    .update(cards)
    .set({ tcgdexId: null, matchConfidence: null, matchCandidates: null })
    .where(eq(cards.id, cardId));

  if (!card.title.trim() || !card.cardNumber?.trim()) {
    await db
      .update(cards)
      .set({ matchConfidence: "none", matchCandidates: [] })
      .where(eq(cards.id, cardId));
    return;
  }

  const outcome = await resolveMatch(
    {
      name: card.title,
      cardNumber: card.cardNumber,
      setCode: card.setCode,
      setName: card.setName,
    },
    createTcgdexCatalog(),
  );
  await db
    .update(cards)
    .set({
      tcgdexId: outcome.tcgdexId,
      matchConfidence: outcome.confidence,
      matchCandidates: outcome.candidates,
    })
    .where(eq(cards.id, cardId));

  if (!outcome.tcgdexId) return;
  try {
    await refreshCardPrice(outcome.tcgdexId);
  } catch (error) {
    console.error(
      "[card-prices]",
      outcome.tcgdexId,
      error instanceof Error ? error.message : "price fetch failed",
    );
  }
}

export async function safeMatchCard(cardId: string): Promise<void> {
  try {
    await matchCardById(cardId);
  } catch (error) {
    console.error("[card-prices]", cardId, error instanceof Error ? error.message : "match failed");
  }
}

export function priceLabel(card: {
  title: string;
  cardNumber: string | null;
  setCode: string | null;
  setName: string | null;
  category: string | null;
  matchConfidence: PriceLabel["matchConfidence"];
}): PriceLabel {
  return {
    name: card.title,
    cardNumber: card.cardNumber,
    setCode: card.setCode,
    setName: card.setName,
    category: card.category,
    matchConfidence: card.matchConfidence,
  };
}

export async function runCardPriceSync(startedAt = Date.now()): Promise<{
  matched: number;
  unresolved: number;
  refreshed: number;
  kept: number;
  failed: number;
}> {
  const summary = { matched: 0, unresolved: 0, refreshed: 0, kept: 0, failed: 0 };
  if (!db) return summary;
  const expired = () => Date.now() - startedAt > BUDGET_MS;

  const pending = await db.query.cards.findMany({
    where: and(eq(cards.category, "pokemon"), isNull(cards.matchConfidence), isNotNull(cards.cardNumber)),
    columns: { id: true },
    limit: MATCH_BATCH,
  });

  for (const card of pending) {
    if (expired()) break;
    try {
      await matchCardById(card.id);
      const saved = await db.query.cards.findFirst({
        where: eq(cards.id, card.id),
        columns: { matchConfidence: true },
      });
      if (saved?.matchConfidence === "high" || saved?.matchConfidence === "medium") summary.matched += 1;
      else if (saved?.matchConfidence === "none") summary.unresolved += 1;
    } catch (error) {
      summary.failed += 1;
      console.error("[card-prices]", card.id, error instanceof Error ? error.message : "match failed");
    }
  }

  const idRows = await db
    .selectDistinct({ id: cards.tcgdexId })
    .from(cards)
    .where(isNotNull(cards.tcgdexId))
    .limit(REFRESH_BATCH);

  await mapPool(
    idRows.flatMap((row) => (row.id ? [row.id] : [])),
    CONCURRENCY,
    async (id) => {
      if (expired()) return;
      try {
        const result = await refreshCardPrice(id);
        if (result === "updated") summary.refreshed += 1;
        else summary.kept += 1;
      } catch (error) {
        summary.failed += 1;
        console.error("[card-prices]", id, error instanceof Error ? error.message : "refresh failed");
      }
    },
  );

  console.info("[card-prices]", summary);
  return summary;
}
