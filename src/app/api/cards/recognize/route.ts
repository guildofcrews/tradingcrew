import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { approvedUserOrResponse } from "@/lib/api-user";
import { recognizeCard } from "@/lib/card-vision";
import { isUuid, loadReviewCard } from "@/lib/review-queue";

export const maxDuration = 60;

const TRADE_LOCKED = "This card is in a trade, so I can't change it.";

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
    columns: { id: true, lockedTradeId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  if (existing.lockedTradeId) {
    return NextResponse.json({ error: TRADE_LOCKED }, { status: 409 });
  }

  const queued = await db
    .update(cards)
    .set({ recognitionStatus: "pending", recognitionNote: null })
    .where(and(eq(cards.id, cardId), eq(cards.ownerId, authResult.user.id), isNull(cards.lockedTradeId)))
    .returning({ id: cards.id });
  if (queued.length === 0) {
    return NextResponse.json({ error: TRADE_LOCKED }, { status: 409 });
  }
  const result = await recognizeCard(cardId);
  if (!result.ok) {
    const card = await loadReviewCard(authResult.user.id, cardId);
    const status = result.failure.kind === "rate_limit" ? 429 : result.failure.kind === "credits" ? 402 : 200;
    const headers = new Headers();
    if (status === 429) {
      const seconds = Math.max(1, Math.ceil((result.failure.retryAfterMs ?? 2000) / 1000));
      headers.set("Retry-After", String(seconds));
    }
    return NextResponse.json({ error: result.failure.kidMessage, card }, { status, headers });
  }

  const card = await loadReviewCard(authResult.user.id, cardId);
  return NextResponse.json({ card, outcome: result.outcome });
}
