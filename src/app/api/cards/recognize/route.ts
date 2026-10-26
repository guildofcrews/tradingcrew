import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { approvedUserOrResponse } from "@/lib/api-user";
import { recognizeCard } from "@/lib/card-vision";
import { isUuid, loadReviewCard } from "@/lib/review-queue";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!db) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const authResult = await approvedUserOrResponse();
  if (!authResult.user) return authResult.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const cardId = typeof body === "object" && body && "cardId" in body ? String(body.cardId) : "";
  if (!isUuid(cardId)) {
    return NextResponse.json({ error: "Missing card" }, { status: 400 });
  }

  const existing = await db.query.cards.findFirst({
    where: and(eq(cards.id, cardId), eq(cards.ownerId, authResult.user.id)),
    columns: { id: true, recognitionStatus: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  if (existing.recognitionStatus !== "done") {
    await db
      .update(cards)
      .set({ recognitionStatus: "pending" })
      .where(and(eq(cards.id, cardId), eq(cards.ownerId, authResult.user.id)));
    await recognizeCard(cardId);
  }

  const card = await loadReviewCard(authResult.user.id, cardId);
  return NextResponse.json({ card });
}
