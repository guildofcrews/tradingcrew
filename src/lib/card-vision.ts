import "server-only";

import { generateText, NoObjectGeneratedError, Output } from "ai";
import { get } from "@vercel/blob";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cards, recognitionLogs } from "@/db/schema";
import { CARD_PLACEHOLDER_TITLE, parseCategory } from "@/lib/cards";
import { revalidateCollections } from "@/lib/revalidate-gallery";
import { readGatewaySpend, tokenCount } from "@/lib/recognition-usage";

/** Cheap vision model with structured output. Override with AI_GATEWAY_MODEL. */
export const DEFAULT_CARD_VISION_MODEL = "google/gemini-2.5-flash-lite";

const TITLE_CONFIDENCE = 0.45;
const CATEGORY_CONFIDENCE = 0.55;
const SET_CONFIDENCE = 0.75;

const identitySchema = z.object({
  title: z.string(),
  category: z.enum(["pokemon", "basketball", "baseball", "football"]).nullable(),
  setName: z.string().nullable(),
  cardNumber: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  setConfidence: z.number().min(0).max(1),
});

const INSTRUCTIONS = `You label one physical trading card for a children's collection.
Read only what is printed. Never invent a name, set, or number.
title is the card name as printed, for example "Moltres & Zapdos & Articuno GX" or "LeBron James". Use an empty title when you cannot read one.
category is "pokemon" for a Pokémon card, "basketball", "baseball", or "football" for those sports, and null otherwise.
setName is the set or expansion printed on the card, or null.
cardNumber is the collector number exactly as printed, such as "44/181", or null.
confidence is how sure you are of the title, from 0 to 1.
setConfidence is how sure you are of the set name and the card number together, from 0 to 1.`;

export function cardVisionModel(): string {
  const override = process.env.AI_GATEWAY_MODEL?.trim();
  return override || DEFAULT_CARD_VISION_MODEL;
}

/**
 * Identify one uploaded card. Safe to call from after(): it claims the row
 * first, so a second call does not start another model request, and a stale
 * result cannot overwrite a newer attempt.
 */
export async function recognizeCard(cardId: string): Promise<void> {
  if (!db) return;

  const claimed = await db
    .update(cards)
    .set({
      recognitionStatus: "running",
      recognitionAttempt: sql`${cards.recognitionAttempt} + 1`,
    })
    .where(and(eq(cards.id, cardId), eq(cards.recognitionStatus, "pending")))
    .returning({
      id: cards.id,
      ownerId: cards.ownerId,
      imageUrl: cards.imageUrl,
      attempt: cards.recognitionAttempt,
    });

  const card = claimed[0];
  if (!card) return;

  const model = cardVisionModel();
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let totalTokens: number | null = null;
  let costUsd: string | null = null;
  let generationId: string | null = null;

  try {
    const downloaded = await get(card.imageUrl, { access: "private" });
    if (!downloaded) throw new Error("Card photo is missing");
    const bytes = new Uint8Array(await new Response(downloaded.stream).arrayBuffer());
    const mediaType = downloaded.blob.contentType?.startsWith("image/")
      ? downloaded.blob.contentType
      : "image/jpeg";

    const result = await generateText({
      model,
      reasoning: "none",
      maxRetries: 1,
      maxOutputTokens: 400,
      output: Output.object({
        name: "CardIdentity",
        description: "Printed identity of one trading card",
        schema: identitySchema,
      }),
      instructions: INSTRUCTIONS,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Identify this trading card." },
            { type: "file", mediaType, data: bytes },
          ],
        },
      ],
    });

    const usage = result.totalUsage ?? result.usage;
    inputTokens = tokenCount(usage?.inputTokens);
    outputTokens = tokenCount(usage?.outputTokens);
    totalTokens = tokenCount(usage?.totalTokens);
    const spend = readGatewaySpend(result.providerMetadata);
    costUsd = spend.costUsd;
    generationId = spend.generationId;

    const identity = result.output;
    if (!identity) throw new Error("The model did not return a card identity");

    const fresh = await db.query.cards.findFirst({
      where: and(eq(cards.id, card.id), eq(cards.recognitionAttempt, card.attempt)),
    });
    if (!fresh) {
      await writeLog({
        cardId: card.id,
        ownerId: card.ownerId,
        model,
        generationId,
        inputTokens,
        outputTokens,
        totalTokens,
        costUsd,
        status: "success",
        error: "Discarded because a newer read finished first",
      });
      return;
    }

    const title = cleanLabel(identity.title, 140);
    const setName = cleanLabel(identity.setName, 120);
    const cardNumber = cleanLabel(identity.cardNumber, 40);
    const confidence = identity.confidence;
    const patch: {
      recognitionStatus: "done";
      recognitionConfidence: number;
      title?: string;
      category?: typeof fresh.category;
      setName?: string;
      cardNumber?: string;
    } = {
      recognitionStatus: "done",
      recognitionConfidence: confidence,
    };

    const placeholderConfirmed =
      fresh.reviewStatus === "confirmed" && fresh.title !== CARD_PLACEHOLDER_TITLE;
    const canRewriteTitle = !fresh.detailsTouched && !placeholderConfirmed;
    if (canRewriteTitle && title && confidence >= TITLE_CONFIDENCE) {
      patch.title = title;
    }
    if (!fresh.detailsTouched && fresh.category == null && confidence >= CATEGORY_CONFIDENCE) {
      patch.category = parseCategory(identity.category);
    }
    if (!fresh.detailsTouched && identity.setConfidence >= SET_CONFIDENCE) {
      if (setName) patch.setName = setName;
      if (cardNumber) patch.cardNumber = cardNumber;
    }

    await db
      .update(cards)
      .set(patch)
      .where(and(eq(cards.id, card.id), eq(cards.recognitionAttempt, card.attempt)));

    await writeLog({
      cardId: card.id,
      ownerId: card.ownerId,
      model,
      generationId,
      inputTokens,
      outputTokens,
      totalTokens,
      costUsd,
      status: "success",
      error: null,
    });
    revalidateCollections();
  } catch (error) {
    const usage = NoObjectGeneratedError.isInstance(error) ? error.usage : undefined;
    if (usage) {
      inputTokens = inputTokens ?? tokenCount(usage.inputTokens);
      outputTokens = outputTokens ?? tokenCount(usage.outputTokens);
      totalTokens = totalTokens ?? tokenCount(usage.totalTokens);
    }
    const message = error instanceof Error ? error.message : "Recognition failed";
    console.error("Card recognition failed", card.id, message);
    await db
      .update(cards)
      .set({ recognitionStatus: "failed" })
      .where(and(eq(cards.id, card.id), eq(cards.recognitionAttempt, card.attempt)));
    await writeLog({
      cardId: card.id,
      ownerId: card.ownerId,
      model,
      generationId,
      inputTokens,
      outputTokens,
      totalTokens,
      costUsd,
      status: "error",
      error: message.slice(0, 400),
    });
  }
}

function cleanLabel(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || text.length > max) return null;
  if (/^(unknown|n\/a|none|null)\b/i.test(text)) return null;
  return text;
}

async function writeLog(entry: {
  cardId: string;
  ownerId: string;
  model: string;
  generationId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  costUsd: string | null;
  status: "success" | "error";
  error: string | null;
}) {
  if (!db) return;
  try {
    await db.insert(recognitionLogs).values(entry);
  } catch (error) {
    console.error("Failed to log recognition usage", error);
  }
}
