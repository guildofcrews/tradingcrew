import { put } from "@vercel/blob";
import { after, NextResponse } from "next/server";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { approvedUserOrResponse } from "@/lib/api-user";
import { CARD_PLACEHOLDER_TITLE } from "@/lib/cards";
import { recognizeCard } from "@/lib/card-vision";
import { isUuid } from "@/lib/review-queue";
import { revalidateCollections } from "@/lib/revalidate-gallery";

export const maxDuration = 60;

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
    return NextResponse.json({ error: "That upload could not be read" }, { status: 400 });
  }

  const original = form.get("original");
  const cleaned = form.get("cleaned");
  const batchId = String(form.get("batchId") ?? "").slice(0, 40);

  if (!(original instanceof File) || !isAllowed(original)) {
    return NextResponse.json({ error: "Choose a JPEG, PNG, or WebP photo under 8MB" }, { status: 400 });
  }
  if (!isUuid(batchId)) {
    return NextResponse.json({ error: "This batch is not valid" }, { status: 400 });
  }
  if (cleaned instanceof File && cleaned.size > 0 && !isAllowed(cleaned)) {
    return NextResponse.json({ error: "The cleaned photo must be a JPEG, PNG, or WebP under 8MB" }, { status: 400 });
  }

  try {
    const ownerId = authResult.user.id;
    const stamp = Date.now();
    const originalBlob = await put(`cards/${ownerId}/original-${stamp}.jpg`, original, {
      access: "private",
      addRandomSuffix: true,
      contentType: original.type || "image/jpeg",
    });

    let cleanedUrl: string | null = null;
    if (cleaned instanceof File && cleaned.size > 0) {
      const cleanedBlob = await put(`cards/${ownerId}/cleaned-${stamp}.jpg`, cleaned, {
        access: "private",
        addRandomSuffix: true,
        contentType: cleaned.type || "image/jpeg",
      });
      cleanedUrl = cleanedBlob.url;
    }

    const [card] = await db
      .insert(cards)
      .values({
        ownerId,
        title: CARD_PLACEHOLDER_TITLE,
        category: null,
        imageUrl: cleanedUrl ?? originalBlob.url,
        originalImageUrl: originalBlob.url,
        reviewStatus: "needs_review",
        recognitionStatus: "pending",
        scanStatus: cleanedUrl ? "cleaned" : "original",
        captureBatchId: batchId,
        detailsTouched: false,
      })
      .returning({ id: cards.id, imageUrl: cards.imageUrl });

    revalidateCollections();
    after(async () => {
      await recognizeCard(card.id);
    });

    return NextResponse.json({ id: card.id, imageUrl: card.imageUrl });
  } catch (error) {
    console.error("Failed to save captured card", error);
    return NextResponse.json({ error: "Couldn't save that card. Try again." }, { status: 500 });
  }
}

function isAllowed(file: File): boolean {
  return file.size > 0 && file.size <= MAX_FILE_SIZE && ALLOWED_TYPES.has(file.type);
}
