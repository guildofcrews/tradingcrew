import { del, put } from "@vercel/blob";
import { after, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { approvedUserOrResponse } from "@/lib/api-user";
import { recognizeCard } from "@/lib/card-vision";
import { isUuid, loadReviewCard } from "@/lib/review-queue";
import { revalidateCollections } from "@/lib/revalidate-gallery";

export const maxDuration = 60;

const MAX_FILE_SIZE = 8 * 1024 * 1024;

export async function POST(request: Request) {
  if (!db) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const authResult = await approvedUserOrResponse();
  if (!authResult.user) return authResult.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "That photo could not be read" }, { status: 400 });
  }

  const cardId = String(form.get("cardId") ?? "");
  const file = form.get("file");
  if (!isUuid(cardId) || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing card photo" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "That photo is too big or not an image" }, { status: 400 });
  }

  const existing = await db.query.cards.findFirst({
    where: and(eq(cards.id, cardId), eq(cards.ownerId, authResult.user.id)),
  });
  if (!existing) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  if (existing.lockedTradeId) {
    return NextResponse.json(
      { error: "This card is promised in a trade, so its photo stays put for now." },
      { status: 409 },
    );
  }

  try {
    const blob = await put(`cards/${authResult.user.id}/cleaned-${Date.now()}.jpg`, file, {
      access: "private",
      addRandomSuffix: true,
      contentType: file.type || "image/jpeg",
    });

    const reread =
      !existing.detailsTouched &&
      existing.reviewStatus === "needs_review";

    await db
      .update(cards)
      .set({
        imageUrl: blob.url,
        scanStatus: "cleaned",
        ...(reread ? { recognitionStatus: "pending" as const } : {}),
      })
      .where(and(eq(cards.id, cardId), eq(cards.ownerId, authResult.user.id)));

    const previous = existing.imageUrl;
    if (previous !== existing.originalImageUrl && previous !== blob.url) {
      try {
        await del(previous);
      } catch (error) {
        console.error("Failed to delete the old cleaned photo", error);
      }
    }

    revalidateCollections();
    if (reread) {
      after(async () => {
        await recognizeCard(cardId);
      });
    }

    const card = await loadReviewCard(authResult.user.id, cardId);
    return NextResponse.json({ card });
  } catch (error) {
    console.error("Failed to straighten card", error);
    return NextResponse.json({ error: "Couldn't save the straightened photo." }, { status: 500 });
  }
}
