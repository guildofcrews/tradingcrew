import "server-only";

import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { cardPrices, cards, type Card as DbCard } from "@/db/schema";
import { toViewCard, type Card } from "@/lib/cards";
import { presentCardValue, type CardValue, type StoredVariantPrice } from "./display";

async function pricesByTcgdexId(tcgdexIds: string[]): Promise<Map<string, StoredVariantPrice[]>> {
  const grouped = new Map<string, StoredVariantPrice[]>();
  if (!db || tcgdexIds.length === 0) return grouped;
  const rows = await db.select().from(cardPrices).where(inArray(cardPrices.tcgdexId, tcgdexIds));
  for (const row of rows) {
    const list = grouped.get(row.tcgdexId) ?? [];
    list.push({
      variant: row.variant,
      marketUsd: row.marketUsd,
      sourceUpdatedAt: row.sourceUpdatedAt,
    });
    grouped.set(row.tcgdexId, list);
  }
  return grouped;
}

function pokemonValue(
  category: string | null,
  tcgdexId: string | null,
  priceVariant: string | null,
  grouped: Map<string, StoredVariantPrice[]>,
): CardValue | null {
  if (category !== "pokemon") return null;
  const prices = tcgdexId ? (grouped.get(tcgdexId) ?? []) : [];
  return presentCardValue(prices, priceVariant);
}

/** Gallery cards. Pokémon rows always get a value, including "Value not available". */
export async function viewCardsWithPrices(rows: DbCard[]): Promise<Card[]> {
  const ids = [
    ...new Set(rows.flatMap((row) => (row.category === "pokemon" && row.tcgdexId ? [row.tcgdexId] : []))),
  ];
  const grouped = await pricesByTcgdexId(ids);
  return rows.map((row) => {
    const price = pokemonValue(row.category, row.tcgdexId, row.priceVariant, grouped);
    const view = toViewCard(row);
    return price ? { ...view, price } : view;
  });
}

/** Live prices for trade snapshots, keyed by the real card id. */
export async function pricesByCardId(cardIds: string[]): Promise<Map<string, CardValue>> {
  const values = new Map<string, CardValue>();
  if (!db || cardIds.length === 0) return values;
  const unique = [...new Set(cardIds)];
  const rows = await db
    .select({
      id: cards.id,
      category: cards.category,
      tcgdexId: cards.tcgdexId,
      priceVariant: cards.priceVariant,
    })
    .from(cards)
    .where(inArray(cards.id, unique));
  const ids = [
    ...new Set(rows.flatMap((row) => (row.category === "pokemon" && row.tcgdexId ? [row.tcgdexId] : []))),
  ];
  const grouped = await pricesByTcgdexId(ids);
  for (const row of rows) {
    const price = pokemonValue(row.category, row.tcgdexId, row.priceVariant, grouped);
    if (price) values.set(row.id, price);
  }
  return values;
}
