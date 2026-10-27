import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cards } from "@/db/schema";
import type { Category } from "@/lib/cards";

export type ReviewCard = {
  id: string;
  title: string;
  category: Category | null;
  imageUrl: string;
  originalImageUrl: string | null;
  setName: string | null;
  setCode: string | null;
  cardNumber: string | null;
  reviewStatus: "needs_review" | "confirmed" | null;
  recognitionStatus: "pending" | "running" | "done" | "failed" | null;
  recognitionNote: string | null;
  scanStatus: "cleaned" | "original" | null;
  recognitionConfidence: number | null;
  suggestedTitle: string | null;
  suggestedCategory: Category | null;
  suggestedSetName: string | null;
  suggestedSetCode: string | null;
  suggestedCardNumber: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export async function loadReviewCards(ownerId: string, batchId: string | null): Promise<ReviewCard[]> {
  if (!db) return [];
  if (batchId && !isUuid(batchId)) return [];

  const filters = [eq(cards.ownerId, ownerId), eq(cards.reviewStatus, "needs_review")];
  if (batchId) filters.push(eq(cards.captureBatchId, batchId));

  const rows = await db.query.cards.findMany({
    where: and(...filters),
    orderBy: [asc(cards.createdAt)],
    columns: {
      id: true,
      title: true,
      category: true,
      imageUrl: true,
      originalImageUrl: true,
      setName: true,
      setCode: true,
      cardNumber: true,
      reviewStatus: true,
      recognitionStatus: true,
      recognitionNote: true,
      scanStatus: true,
      recognitionConfidence: true,
      suggestedTitle: true,
      suggestedCategory: true,
      suggestedSetName: true,
      suggestedSetCode: true,
      suggestedCardNumber: true,
    },
  });

  return rows;
}

export async function loadReviewCard(ownerId: string, cardId: string): Promise<ReviewCard | null> {
  if (!db || !isUuid(cardId)) return null;
  const row = await db.query.cards.findFirst({
    where: and(eq(cards.id, cardId), eq(cards.ownerId, ownerId)),
    columns: {
      id: true,
      title: true,
      category: true,
      imageUrl: true,
      originalImageUrl: true,
      setName: true,
      setCode: true,
      cardNumber: true,
      reviewStatus: true,
      recognitionStatus: true,
      recognitionNote: true,
      scanStatus: true,
      recognitionConfidence: true,
      suggestedTitle: true,
      suggestedCategory: true,
      suggestedSetName: true,
      suggestedSetCode: true,
      suggestedCardNumber: true,
    },
  });
  return row ?? null;
}
