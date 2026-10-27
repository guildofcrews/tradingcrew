import "server-only";

import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { get } from "@vercel/blob";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cards, recognitionLogs } from "@/db/schema";
import { revalidateCollections } from "@/lib/revalidate-gallery";
import { normalizeCardPhoto } from "@/lib/card-image";
import {
  classifyGatewayFailure,
  coerceCardIdentity,
  describeRecognitionError,
  formatParsedIdentity,
  planRecognitionUpdate,
  type GatewayFailure,
  type ReadOutcome,
} from "@/lib/recognition-plan";
import { readGatewaySpend, tokenCount } from "@/lib/recognition-usage";
import { safeMatchCard } from "@/lib/pokemon-price/sync";

/**
 * Cheap vision model with structured output. Both the Google and Vertex
 * endpoints are marked available on the free AI Gateway credit. Override with
 * AI_GATEWAY_MODEL.
 */
export const DEFAULT_CARD_VISION_MODEL = "google/gemini-2.5-flash-lite";

export type RecognizeResult =
  | { ok: true; outcome: Exclude<ReadOutcome, "unreadable"> }
  | { ok: false; failure: GatewayFailure };

const identitySchema = z.object({
  title: z.string(),
  category: z.string().nullable(),
  setName: z.string().nullable(),
  setCode: z.string().nullable(),
  cardNumber: z.string().nullable(),
  confidence: z.number().nullable(),
  setConfidence: z.number().nullable(),
  setCodeConfidence: z.number().nullable(),
  numberConfidence: z.number().nullable(),
});

const INSTRUCTIONS = `You label one physical trading card for a children's collection.
Read only what is printed. Never invent a name, set, or number.
title is the card name as printed, for example "Moltres & Zapdos & Articuno GX" or "LeBron James". A phone photo may be slightly tilted or show a bit of table; if the name is legible, return that name. Use an empty title only when no name is readable.
category is "pokemon" for a Pokémon card, "basketball", "baseball", or "football" for those sports, and null otherwise.
setName is the expansion name. For a Pokémon card, work it out from the set symbol, a printed code such as "SV6a" or "SFA", the copyright year, the regulation mark, and the total after the slash in the collector number. For a sports card, use the brand, year, and series, such as "2023 Panini Prizm". Return null when those clues are not enough. Do not invent a set from the card name alone.
setCode is the short printed set code only, such as "SFA", "SV6a", or "OBF", or null. It is not the collector number. Older cards sometimes have no code; return null then.
cardNumber is the collector number exactly as printed, including the total after the slash when one is printed, such as "046/264" or "247/191". Keep leading zeros. A number higher than the total is still valid. Return null when the number is not readable.
confidence is how sure you are of the title alone, from 0 to 1.
setConfidence is how sure you are of setName alone, from 0 to 1. Use 0 when setName is null.
setCodeConfidence is how sure you are of setCode alone, from 0 to 1. Use 0 when setCode is null.
numberConfidence is how sure you are of cardNumber alone, from 0 to 1. Use 0 when cardNumber is null.`;

export function cardVisionModel(): string {
  const override = process.env.AI_GATEWAY_MODEL?.trim();
  return override || DEFAULT_CARD_VISION_MODEL;
}

/**
 * Identify one uploaded card. Safe to call from after(): it claims the row
 * first, so a second call does not start another model request, and a stale
 * result cannot overwrite a newer attempt.
 */
export async function recognizeCard(cardId: string): Promise<RecognizeResult> {
  if (!db) return { ok: true, outcome: "same" };

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
  if (!card) return { ok: true, outcome: "same" };

  const model = cardVisionModel();
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let totalTokens: number | null = null;
  let costUsd: string | null = null;
  let generationId: string | null = null;
  let sourceBytes = 0;
  let sourceType: string | null = null;
  let normalizedBytes = 0;

  try {
    const downloaded = await get(card.imageUrl, { access: "private" });
    if (!downloaded) throw new Error("Card photo is missing");
    const bytes = new Uint8Array(await new Response(downloaded.stream).arrayBuffer());
    sourceBytes = bytes.byteLength;
    sourceType = downloaded.blob.contentType ?? null;
    const photo = await normalizeCardPhoto(bytes);
    normalizedBytes = photo.bytes.byteLength;

    const result = await generateText({
      model,
      reasoning: "none",
      maxRetries: 0,
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
            { type: "file", mediaType: photo.mediaType, data: photo.bytes },
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

    if (!result.output) throw new Error("The model did not return a card identity");
    const identity = coerceCardIdentity(result.output);

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
      return { ok: true, outcome: "same" };
    }

    const plan = planRecognitionUpdate(
      {
        title: fresh.title,
        category: fresh.category,
        setName: fresh.setName,
        setCode: fresh.setCode,
        cardNumber: fresh.cardNumber,
        detailsTouched: fresh.detailsTouched,
        reviewStatus: fresh.reviewStatus,
      },
      identity,
    );
    const audit = formatParsedIdentity(identity, plan.outcome);
    console.info("[card-recognition]", card.id, audit);

    if (plan.outcome === "unreadable") {
      await db
        .update(cards)
        .set({ recognitionStatus: "failed", recognitionNote: plan.note })
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
        error: audit,
      });
      revalidateCollections();
      return {
        ok: false,
        failure: { kind: "other", kidMessage: plan.note, retryAfterMs: null, logMessage: audit },
      };
    }

    await db
      .update(cards)
      .set(plan.write)
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
      error: audit,
    });
    const nextCategory = plan.write.category !== undefined ? plan.write.category : fresh.category;
    const touchesPokemon = nextCategory === "pokemon" || fresh.category === "pokemon";
    if (
      touchesPokemon &&
      (plan.outcome === "applied" ||
        (plan.outcome === "same" && fresh.category === "pokemon" && fresh.matchConfidence == null))
    ) {
      await safeMatchCard(card.id);
    }
    revalidateCollections();
    return { ok: true, outcome: plan.outcome };
  } catch (error) {
    const usage = NoObjectGeneratedError.isInstance(error) ? error.usage : undefined;
    if (usage) {
      inputTokens = inputTokens ?? tokenCount(usage.inputTokens);
      outputTokens = outputTokens ?? tokenCount(usage.outputTokens);
      totalTokens = totalTokens ?? tokenCount(usage.totalTokens);
    }
    const failure = classifyGatewayFailure(gatewayErrorParts(error));
    const detail = describeRecognitionError(error, { sourceBytes, sourceType, normalizedBytes });
    console.error("[card-recognition]", card.id, detail);
    await db
      .update(cards)
      .set({ recognitionStatus: "failed", recognitionNote: failure.kidMessage })
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
      error: detail,
    });
    return { ok: false, failure };
  }
}

function gatewayErrorParts(error: unknown): {
  statusCode?: number;
  message?: string;
  responseBody?: string;
  retryAfter?: string | null;
} {
  const call = findCall(error);
  const message = error instanceof Error ? error.message : "Recognition failed";
  return {
    statusCode: call?.statusCode,
    message,
    responseBody: call?.responseBody,
    retryAfter: headerValue(call?.responseHeaders, "retry-after"),
  };
}

function findCall(error: unknown): APICallError | null {
  if (APICallError.isInstance(error)) return error;
  if (error instanceof Error && error.cause) return findCall(error.cause);
  return null;
}

function headerValue(headers: Record<string, string> | undefined, name: string): string | null {
  if (!headers) return null;
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
  return found ? found[1] : null;
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
