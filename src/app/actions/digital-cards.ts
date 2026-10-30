"use server";

import { put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { cards, users } from "@/db/schema";
import { revalidateCollections } from "@/lib/revalidate-gallery";
import { allowlistedImageUrl, type NftPlatform, type SportsCategory } from "@/lib/nft/allowlist";
import { lookupNft } from "@/lib/nft/lookup";
import { manualDigitalDraft } from "@/lib/nft/manual";
import type { NftDraft } from "@/lib/nft/page";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export interface PreviewResult {
  success: boolean;
  error?: string;
  draft?: NftDraft;
  platform?: NftPlatform | null;
}

export interface SaveResult {
  success: boolean;
  error?: string;
  category?: SportsCategory;
}

async function approvedUserId(): Promise<{ id: string } | { error: string }> {
  if (!db) return { error: "Database is not configured" };
  const session = await auth();
  if (!session?.user?.id) return { error: "You must be signed in to add a card" };
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { status: true },
  });
  if (!user || user.status !== "approved") return { error: "Your account is not approved" };
  return { id: session.user.id };
}

async function copyAllowlistedImage(userId: string, imageUrl: string): Promise<string | null> {
  const allowed = allowlistedImageUrl(imageUrl);
  if (!allowed) return null;
  const response = await fetch(allowed, {
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    headers: { "user-agent": "TradingCrew/1.0 (display-only kids gallery; no wallet)" },
  });
  if (!response.ok) return null;
  if (!allowlistedImageUrl(response.url)) return null;
  const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = IMAGE_TYPES[type];
  if (!ext) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 32 || bytes.length > MAX_FILE_SIZE) return null;
  const blob = await put(`cards/${userId}/nft-${Date.now()}.${ext}`, bytes, {
    access: "private",
    contentType: type,
    addRandomSuffix: true,
  });
  return blob.url;
}

async function alreadyClaimed(userId: string, platform: NftPlatform, tokenId: string): Promise<boolean> {
  if (!db) return false;
  const existing = await db.query.cards.findFirst({
    where: and(eq(cards.ownerId, userId), eq(cards.platform, platform), eq(cards.tokenId, tokenId)),
    columns: { id: true },
  });
  return Boolean(existing);
}

async function insertDigital(userId: string, draft: NftDraft, imageUrl: string): Promise<SaveResult> {
  if (!db) return { success: false, error: "Database is not configured" };
  if (draft.tokenId && (await alreadyClaimed(userId, draft.platform, draft.tokenId))) {
    return { success: false, error: "You already added this one." };
  }
  try {
    await db.insert(cards).values({
      ownerId: userId,
      title: draft.title,
      category: draft.category,
      imageUrl,
      setName: draft.setName,
      cardNumber: draft.serial,
      kind: "digital",
      collection: draft.collection,
      platform: draft.platform,
      tokenId: draft.tokenId || null,
      sourceUrl: draft.sourceUrl || null,
      claimStatus: "claimed",
      recognitionStatus: "done",
      reviewStatus: "confirmed",
      detailsTouched: true,
    });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    if (code === "23505") return { success: false, error: "You already added this one." };
    console.error("Failed to save digital card:", error);
    return { success: false, error: "We couldn't save that card. Try again." };
  }
  revalidateCollections();
  return { success: true, category: draft.category };
}

/** Look up a pasted link. Nothing is saved. */
export async function previewDigitalCard(url: string): Promise<PreviewResult> {
  const user = await approvedUserId();
  if ("error" in user) return { success: false, error: user.error };
  const looked = await lookupNft(url);
  if (!looked.ok) return { success: false, error: looked.message, platform: looked.platform };
  return { success: true, draft: looked.draft, platform: looked.draft.platform };
}

/** Re-read the link on the server, copy the picture, and save the claim. */
export async function saveDigitalCard(url: string): Promise<SaveResult> {
  const user = await approvedUserId();
  if ("error" in user) return { success: false, error: user.error };
  const looked = await lookupNft(url);
  if (!looked.ok) return { success: false, error: looked.message };
  let stored: string | null = null;
  try {
    stored = await copyAllowlistedImage(user.id, looked.draft.imageUrl);
  } catch (error) {
    console.error("Failed to copy digital card image:", error);
  }
  if (!stored) return { success: false, error: "We couldn't save the picture. Try again." };
  return insertDigital(user.id, looked.draft, stored);
}

/** Typed-in fallback when the link can't be read. The picture comes from the upload. */
export async function saveManualDigitalCard(formData: FormData): Promise<SaveResult> {
  const user = await approvedUserId();
  if ("error" in user) return { success: false, error: user.error };

  const drafted = manualDigitalDraft({
    platform: String(formData.get("platform") ?? ""),
    category: String(formData.get("category") ?? ""),
    title: String(formData.get("title") ?? ""),
    setName: String(formData.get("setName") ?? ""),
    serial: String(formData.get("serial") ?? ""),
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
  });
  if (!drafted.ok) return { success: false, error: drafted.message };

  const file = formData.get("file");
  if (!(file instanceof File) || !IMAGE_TYPES[file.type] || file.size < 32 || file.size > MAX_FILE_SIZE) {
    return { success: false, error: "Choose a JPEG, PNG, WEBP, or GIF picture under 8MB." };
  }

  let stored: string;
  try {
    const blob = await put(`cards/${user.id}/nft-${Date.now()}.${IMAGE_TYPES[file.type]}`, file, {
      access: "private",
      contentType: file.type,
      addRandomSuffix: true,
    });
    stored = blob.url;
  } catch (error) {
    console.error("Failed to store manual digital card image:", error);
    return { success: false, error: "We couldn't save the picture. Try again." };
  }

  return insertDigital(user.id, { ...drafted.draft, imageUrl: stored }, stored);
}
