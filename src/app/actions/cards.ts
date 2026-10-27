"use server";

import { put, del } from "@vercel/blob";
import { auth } from "@/auth";
import { db } from "@/db";
import { cards, users } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { isTradeError, detachCardForDelete } from "@/lib/trade-commands";
import { revalidateCollections } from "@/lib/revalidate-gallery";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export type CardCategory = "pokemon" | "basketball" | "baseball" | "football";

interface UploadCardResult {
  success: boolean;
  error?: string;
}

export async function uploadCard(formData: FormData): Promise<UploadCardResult> {
  if (!db) {
    return { success: false, error: "Database is not configured" };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to upload cards" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { status: true },
  });

  if (!user || user.status !== "approved") {
    return { success: false, error: "Your account is not approved" };
  }

  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;
  const category = formData.get("category") as CardCategory | null;

  if (!file || !title) {
    return { success: false, error: "File and title are required" };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "Only JPEG, PNG, GIF, and WebP images are allowed",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: "File size must be less than 10MB" };
  }

  try {
    const blob = await put(`cards/${session.user.id}/${Date.now()}-${file.name}`, file, {
      access: "private",
      addRandomSuffix: true,
    });

    await db.insert(cards).values({
      ownerId: session.user.id,
      title: title.trim(),
      category: category || null,
      imageUrl: blob.url,
    });

    revalidateCollections();

    return { success: true };
  } catch (error) {
    console.error("Failed to upload card:", error);
    return { success: false, error: "Failed to upload card. Please try again." };
  }
}

export async function updateCard(
  cardId: string,
  data: {
    title?: string;
    category?: CardCategory | null;
    setName?: string | null;
    setCode?: string | null;
    cardNumber?: string | null;
  }
): Promise<UploadCardResult> {
  if (!db) {
    return { success: false, error: "Database is not configured" };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to update cards" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { status: true },
  });

  if (!user || user.status !== "approved") {
    return { success: false, error: "Your account is not approved" };
  }

  try {
    const updateData: {
      title?: string;
      category?: CardCategory | null;
      setName?: string | null;
      setCode?: string | null;
      cardNumber?: string | null;
    } = {};
    if (data.title !== undefined) {
      updateData.title = data.title.trim();
    }
    if (data.category !== undefined) {
      updateData.category = data.category;
    }
    if (data.setName !== undefined) updateData.setName = blankToNull(data.setName, 120);
    if (data.setCode !== undefined) updateData.setCode = blankToNull(data.setCode, 16);
    if (data.cardNumber !== undefined) updateData.cardNumber = blankToNull(data.cardNumber, 40);

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "No changes provided" };
    }

    const updated = await db
      .update(cards)
      .set({ ...updateData, detailsTouched: true, reviewStatus: "confirmed" })
      .where(and(eq(cards.id, cardId), eq(cards.ownerId, session.user.id), isNull(cards.lockedTradeId)))
      .returning({ id: cards.id });

    if (updated.length === 0) {
      const existing = await db.query.cards.findFirst({
        where: and(eq(cards.id, cardId), eq(cards.ownerId, session.user.id)),
        columns: { lockedTradeId: true },
      });
      if (!existing) {
        return { success: false, error: "Card not found or you don't have permission to edit it" };
      }
      return {
        success: false,
        error: "This card is promised in a trade, so it can't be edited until that swap is finished or cancelled.",
      };
    }

    revalidateCollections();

    return { success: true };
  } catch (error) {
    console.error("Failed to update card:", error);
    return { success: false, error: "Failed to update card. Please try again." };
  }
}

export async function deleteCard(cardId: string): Promise<UploadCardResult> {
  if (!db) {
    return { success: false, error: "Database is not configured" };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to delete cards" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { status: true },
  });

  if (!user || user.status !== "approved") {
    return { success: false, error: "Your account is not approved" };
  }

  try {
    const removed = await detachCardForDelete(session.user.id, cardId);
    const urls = [removed.imageUrl, removed.originalImageUrl].filter(
      (url, index, all): url is string => Boolean(url) && all.indexOf(url) === index,
    );
    for (const url of urls) {
      try {
        await del(url);
      } catch (blobError) {
        console.error("Failed to delete blob:", blobError);
      }
    }

    revalidateCollections();

    return { success: true };
  } catch (error) {
    if (isTradeError(error)) {
      return { success: false, error: error.message };
    }
    console.error("Failed to delete card:", error);
    return { success: false, error: "Failed to delete card. Please try again." };
  }
}

function blankToNull(value: string | null, max: number): string | null {
  if (!value) return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.slice(0, max);
}
