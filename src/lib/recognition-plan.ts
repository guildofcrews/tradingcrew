import { CARD_PLACEHOLDER_TITLE, parseCategory, type Category } from "@/lib/cards";

const TITLE_CONFIDENCE = 0.45;
const CATEGORY_CONFIDENCE = 0.55;
const SET_CONFIDENCE = 0.75;

export const AI_BUSY_MESSAGE = "The AI reader is busy. Wait a moment, then try again.";
export const AI_CREDITS_MESSAGE = "The AI reader is out of credits for now. Try again later.";
export const AI_UNAVAILABLE_MESSAGE = "The AI reader isn't available right now. Try again later.";
export const AI_MISSED_MESSAGE = "I couldn't read this one. You can type the name.";
export const AI_SAME_MESSAGE = "I read it, and your name already looks right.";

export type GatewayFailureKind = "rate_limit" | "credits" | "unavailable" | "other";

export type GatewayFailure = {
  kind: GatewayFailureKind;
  kidMessage: string;
  retryAfterMs: number | null;
  logMessage: string;
};

export function classifyGatewayFailure(input: {
  statusCode?: number;
  message?: string;
  responseBody?: string;
  retryAfter?: string | null;
}): GatewayFailure {
  const logMessage = (input.message || "Recognition failed").slice(0, 400);
  const blob = `${input.message ?? ""} ${input.responseBody ?? ""}`.toLowerCase();
  const retryAfterMs = retryAfterToMs(input.retryAfter ?? null);

  if (input.statusCode === 429 || blob.includes("rate_limit") || blob.includes("rate limit")) {
    return { kind: "rate_limit", kidMessage: AI_BUSY_MESSAGE, retryAfterMs, logMessage };
  }
  if (
    input.statusCode === 402 ||
    blob.includes("insufficient_funds") ||
    blob.includes("quota_for_entity") ||
    blob.includes("insufficient credits")
  ) {
    return { kind: "credits", kidMessage: AI_CREDITS_MESSAGE, retryAfterMs: null, logMessage };
  }
  if (
    input.statusCode === 403 ||
    blob.includes("customer_verification_required") ||
    blob.includes("not available") ||
    blob.includes("free tier")
  ) {
    return { kind: "unavailable", kidMessage: AI_UNAVAILABLE_MESSAGE, retryAfterMs: null, logMessage };
  }
  return { kind: "other", kidMessage: AI_MISSED_MESSAGE, retryAfterMs: null, logMessage };
}

export function retryAfterToMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const date = Date.parse(header);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - Date.now());
}

type Identity = {
  title: string | null;
  category: string | null;
  setName: string | null;
  cardNumber: string | null;
  confidence: number;
  setConfidence: number;
};

export type RecognitionFresh = {
  title: string;
  category: Category | null;
  setName: string | null;
  cardNumber: string | null;
  detailsTouched: boolean;
  reviewStatus: "needs_review" | "confirmed" | null;
};

export type RecognitionWrite = {
  recognitionStatus: "done";
  recognitionConfidence: number;
  recognitionNote: null;
  suggestedTitle: string | null;
  suggestedCategory: Category | null;
  suggestedSetName: string | null;
  suggestedCardNumber: string | null;
  title?: string;
  category?: Category | null;
  setName?: string | null;
  cardNumber?: string | null;
  reviewStatus?: "needs_review";
};

/**
 * New snaps still auto-fill a placeholder title. A name or wing the owner
 * already chose is only stored as a suggestion until they accept it.
 */
export function planRecognitionUpdate(fresh: RecognitionFresh, identity: Identity): RecognitionWrite {
  const suggestedTitle =
    identity.confidence >= TITLE_CONFIDENCE ? cleanLabel(identity.title, 140) : null;
  const suggestedCategory =
    identity.confidence >= CATEGORY_CONFIDENCE ? parseCategory(identity.category) : null;
  const setOk = identity.setConfidence >= SET_CONFIDENCE;
  const suggestedSetName = setOk ? cleanLabel(identity.setName, 120) : null;
  const suggestedCardNumber = setOk ? cleanLabel(identity.cardNumber, 40) : null;

  const write: RecognitionWrite = {
    recognitionStatus: "done",
    recognitionConfidence: identity.confidence,
    recognitionNote: null,
    suggestedTitle,
    suggestedCategory,
    suggestedSetName,
    suggestedCardNumber,
  };

  const ownerNamedIt = fresh.detailsTouched || fresh.title !== CARD_PLACEHOLDER_TITLE;
  if (!ownerNamedIt) {
    if (suggestedTitle) write.title = suggestedTitle;
    if (fresh.category == null && suggestedCategory) write.category = suggestedCategory;
    if (suggestedSetName) write.setName = suggestedSetName;
    if (suggestedCardNumber) write.cardNumber = suggestedCardNumber;
    return write;
  }

  const titleChanged = Boolean(suggestedTitle && suggestedTitle !== fresh.title);
  const categoryChanged = Boolean(suggestedCategory && suggestedCategory !== fresh.category);
  const setChanged = Boolean(suggestedSetName && suggestedSetName !== fresh.setName);
  const numberChanged = Boolean(suggestedCardNumber && suggestedCardNumber !== fresh.cardNumber);
  if ((titleChanged || categoryChanged || setChanged || numberChanged) && fresh.reviewStatus !== "confirmed") {
    write.reviewStatus = "needs_review";
  }
  return write;
}

export function cleanLabel(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || text.length > max) return null;
  if (/^(unknown|n\/a|none|null)\b/i.test(text)) return null;
  return text;
}

export type SuggestionCard = {
  title: string;
  category: Category | null;
  setName: string | null;
  cardNumber: string | null;
  suggestedTitle: string | null;
  suggestedCategory: Category | null;
  suggestedSetName: string | null;
  suggestedCardNumber: string | null;
};

export function reviewDraft(card: SuggestionCard, prefer: "suggestion" | "current") {
  if (prefer === "current") {
    return {
      title: card.title,
      category: (card.category ?? "") as Category | "",
      setName: card.setName ?? "",
      cardNumber: card.cardNumber ?? "",
    };
  }
  return {
    title: card.suggestedTitle && card.suggestedTitle !== card.title ? card.suggestedTitle : card.title,
    category: (card.suggestedCategory && card.suggestedCategory !== card.category
      ? card.suggestedCategory
      : (card.category ?? "")) as Category | "",
    setName:
      card.suggestedSetName && card.suggestedSetName !== card.setName
        ? card.suggestedSetName
        : (card.setName ?? ""),
    cardNumber:
      card.suggestedCardNumber && card.suggestedCardNumber !== card.cardNumber
        ? card.suggestedCardNumber
        : (card.cardNumber ?? ""),
  };
}

export function hasSuggestionChoice(card: SuggestionCard): boolean {
  const draft = reviewDraft(card, "suggestion");
  return (
    draft.title !== card.title ||
    draft.category !== (card.category ?? "") ||
    draft.setName !== (card.setName ?? "") ||
    draft.cardNumber !== (card.cardNumber ?? "")
  );
}
