"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { cards } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { requireApprovedUser } from "@/lib/auth-utils";
import { CARD_PLACEHOLDER_TITLE, parseCategory } from "@/lib/cards";
import { labelsNeedRematch } from "@/lib/pokemon-price/normalize";
import { priceLabel, safeMatchCard } from "@/lib/pokemon-price/sync";
import { loadReviewCards, type ReviewCard } from "@/lib/review-queue";
import { revalidateCollections } from "@/lib/revalidate-gallery";

export async function fetchReviewCards(batchId: string | null): Promise<ReviewCard[]> {
  if (!db) return [];
  const { authorized, user } = await requireApprovedUser();
  if (!authorized || !user) return [];
  return loadReviewCards(user.id, batchId);
}

export async function confirmCardReview(
  cardId: string,
  input: {
    title: string;
    category: string | null;
    setName: string;
    setCode: string;
    cardNumber: string;
  },
): Promise<ActionResult> {
  if (!db) return { success: false, error: "Database is not configured" };

  const { authorized, user } = await requireApprovedUser();
  if (!authorized || !user) return { success: false, error: "You must be signed in" };

  const existing = await db.query.cards.findFirst({
    where: and(eq(cards.id, cardId), eq(cards.ownerId, user.id)),
  });
  if (!existing) return { success: false, error: "Card not found" };
  if (existing.lockedTradeId) {
    return {
      success: false,
      error: "This card is promised in a trade, so it can't be edited until that swap is finished or cancelled.",
    };
  }

  const title = clean(input.title, 140) || existing.title || CARD_PLACEHOLDER_TITLE;
  const category = parseCategory(input.category);
  const setName = clean(input.setName, 120);
  const setCode = clean(input.setCode, 16);
  const cardNumber = clean(input.cardNumber, 40);
  const touched =
    title !== existing.title ||
    category !== existing.category ||
    setName !== existing.setName ||
    setCode !== existing.setCode ||
    cardNumber !== existing.cardNumber;

  const updated = await db
    .update(cards)
    .set({
      title,
      category,
      setName,
      setCode,
      cardNumber,
      reviewStatus: "confirmed",
      detailsTouched: existing.detailsTouched || touched,
    })
    .where(and(eq(cards.id, cardId), eq(cards.ownerId, user.id), isNull(cards.lockedTradeId)))
    .returning({ id: cards.id });

  if (updated.length === 0) {
    return { success: false, error: "Couldn't save that card" };
  }

  const before = priceLabel(existing);
  if (
    labelsNeedRematch(before, {
      ...before,
      name: title,
      category,
      setName,
      setCode,
      cardNumber,
    })
  ) {
    await safeMatchCard(cardId);
  }

  revalidateCollections();
  return { success: true };
}

function clean(value: string, max: number): string | null {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.slice(0, max);
}
