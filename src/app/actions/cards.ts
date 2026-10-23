"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { auth } from "@/auth";
import { db } from "@/db";
import { cards, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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

    revalidatePath("/my-cards");

    return { success: true };
  } catch (error) {
    console.error("Failed to upload card:", error);
    return { success: false, error: "Failed to upload card. Please try again." };
  }
}

export async function updateCard(
  cardId: string,
  data: { title?: string; category?: CardCategory | null }
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
    const card = await db.query.cards.findFirst({
      where: and(eq(cards.id, cardId), eq(cards.ownerId, session.user.id)),
    });

    if (!card) {
      return { success: false, error: "Card not found or you don't have permission to edit it" };
    }

    const updateData: { title?: string; category?: CardCategory | null } = {};
    if (data.title !== undefined) {
      updateData.title = data.title.trim();
    }
    if (data.category !== undefined) {
      updateData.category = data.category;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "No changes provided" };
    }

    await db.update(cards).set(updateData).where(eq(cards.id, cardId));

    revalidatePath("/my-cards");

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
    const card = await db.query.cards.findFirst({
      where: and(eq(cards.id, cardId), eq(cards.ownerId, session.user.id)),
    });

    if (!card) {
      return { success: false, error: "Card not found or you don't have permission to delete it" };
    }

    try {
      await del(card.imageUrl);
    } catch (blobError) {
      console.error("Failed to delete blob:", blobError);
    }

    await db.delete(cards).where(eq(cards.id, cardId));

    revalidatePath("/my-cards");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete card:", error);
    return { success: false, error: "Failed to delete card. Please try again." };
  }
}
