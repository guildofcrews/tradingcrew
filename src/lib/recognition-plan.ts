import { CARD_PLACEHOLDER_TITLE, parseCategory, type Category } from "@/lib/cards";

/** Auto-fill a placeholder title only when the read is fairly sure. */
const TITLE_CONFIDENCE = 0.45;
/** A different printed name at moderate confidence is still a suggestion. */
const SUGGEST_CONFIDENCE = 0.25;
const CATEGORY_CONFIDENCE = 0.55;
const SET_NAME_CONFIDENCE = 0.55;
const SET_CODE_CONFIDENCE = 0.55;
const NUMBER_CONFIDENCE = 0.55;

export const AI_BUSY_MESSAGE = "The AI reader is busy. Wait a moment, then try again.";
export const AI_CREDITS_MESSAGE = "The AI reader is out of credits for now. Try again later.";
export const AI_UNAVAILABLE_MESSAGE = "The AI reader isn't available right now. Try again later.";
export const AI_MISSED_MESSAGE = "I couldn't read this one. You can type the name.";
export const AI_SAME_MESSAGE = "I read it, and your name already looks right.";
export const AI_UNSURE_MESSAGE = "I couldn't tell which card this is — try a clearer photo.";
export const AI_APPLIED_MESSAGE = "I read the name from the photo.";

type ReadCard = {
  recognitionStatus?: string | null;
  locked?: boolean;
  lockedTradeId?: string | null;
};

/** Trade-locked cards stay put. Every other owned card can be sent to the reader. */
export function canAskForAiRead(card: ReadCard): boolean {
  return !card.locked && !card.lockedTradeId;
}

/**
 * Gallery and bulk read include never-run, failed, and stuck pending/running.
 * A finished read stays off the card face; the edit modal can still ask again.
 * A killed function leaves status "running", which used to hide the button.
 */
export function cardNeedsAiRead(card: ReadCard): boolean {
  return canAskForAiRead(card) && card.recognitionStatus !== "done";
}

export function galleryReadLabel(status: string | null | undefined): string {
  return status == null ? "Let AI read this card" : "Try reading again";
}

export function editReadLabel(status: string | null | undefined): string {
  return status === "done" ? "Read again" : galleryReadLabel(status);
}

export function aiReadBannerCopy(count: number): string {
  return count === 1 ? "1 card needs an AI read." : `${count} cards need an AI read.`;
}

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

/** A model score of 80 means 80%, not a schema failure. Values outside 0–100 clamp. */
export function clampConfidence(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  const unit = value > 1 && value <= 100 ? value / 100 : value;
  if (unit < 0) return 0;
  if (unit > 1) return 1;
  return unit;
}

export function coerceCardIdentity(raw: {
  title?: string | null;
  category?: string | null;
  setName?: string | null;
  setCode?: string | null;
  cardNumber?: string | null;
  confidence?: number | null;
  setConfidence?: number | null;
  setCodeConfidence?: number | null;
  numberConfidence?: number | null;
}): Identity {
  return {
    title: raw.title ?? "",
    category: raw.category ?? null,
    setName: raw.setName ?? null,
    setCode: raw.setCode ?? null,
    cardNumber: raw.cardNumber ?? null,
    confidence: clampConfidence(raw.confidence),
    setConfidence: clampConfidence(raw.setConfidence),
    setCodeConfidence: clampConfidence(raw.setCodeConfidence),
    numberConfidence: clampConfidence(raw.numberConfidence),
  };
}

type ErrorContext = {
  sourceBytes?: number;
  sourceType?: string | null;
  normalizedBytes?: number;
};

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function callDetails(error: unknown): { statusCode?: number; responseBody?: string } {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as { statusCode?: unknown; responseBody?: unknown; cause?: unknown };
    if (typeof record.statusCode === "number") {
      return {
        statusCode: record.statusCode,
        responseBody: typeof record.responseBody === "string" ? record.responseBody : undefined,
      };
    }
    current = record.cause;
  }
  return {};
}

/**
 * Diagnostic stored on card_recognition_log and printed as [card-recognition].
 * The kid still sees the short message from classifyGatewayFailure.
 */
export function describeRecognitionError(error: unknown, context: ErrorContext = {}): string {
  const name = error instanceof Error ? error.name : "Error";
  const message = error instanceof Error ? error.message : String(error);
  const bits = [`${name}: ${oneLine(message)}`];
  const call = callDetails(error);
  if (call.statusCode != null) bits.push(`HTTP ${call.statusCode}`);
  if (call.responseBody) bits.push(`body ${oneLine(call.responseBody).slice(0, 500)}`);
  const text =
    error && typeof error === "object" && "text" in error && typeof error.text === "string"
      ? error.text
      : undefined;
  if (text) bits.push(`model ${oneLine(text).slice(0, 500)}`);
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause : null;
  if (cause && cause.message !== message) {
    bits.push(`cause ${cause.name}: ${oneLine(cause.message).slice(0, 300)}`);
  }
  if (context.sourceBytes != null) {
    bits.push(`source ${context.sourceBytes}b ${context.sourceType || "unknown"}`);
  }
  if (context.normalizedBytes) bits.push(`jpeg ${context.normalizedBytes}b`);
  return bits.join(" | ").slice(0, 2000);
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
  setCode: string | null;
  cardNumber: string | null;
  confidence: number;
  setConfidence: number;
  setCodeConfidence: number;
  numberConfidence: number;
};

export type RecognitionFresh = {
  title: string;
  category: Category | null;
  setName: string | null;
  setCode?: string | null;
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
  suggestedSetCode: string | null;
  suggestedCardNumber: string | null;
  title?: string;
  category?: Category | null;
  setName?: string | null;
  setCode?: string | null;
  cardNumber?: string | null;
  reviewStatus?: "needs_review";
};

export type ReadOutcome = "same" | "applied" | "review" | "unreadable";

export type RecognitionPlan =
  | { outcome: "unreadable"; note: string }
  | { outcome: Exclude<ReadOutcome, "unreadable">; write: RecognitionWrite };

export function titlesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  return left.length > 0 && left === right;
}

function normalizeTitle(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Stored on card_recognition_log so a "looks right" result can be audited later. */
export function formatParsedIdentity(
  identity: {
    title?: string | null;
    category?: string | null;
    setName?: string | null;
    setCode?: string | null;
    cardNumber?: string | null;
    confidence?: number | null;
    setConfidence?: number | null;
    setCodeConfidence?: number | null;
    numberConfidence?: number | null;
  },
  outcome: ReadOutcome,
): string {
  const clip = (value: string | null | undefined) => JSON.stringify((value ?? "").replace(/\s+/g, " ").trim().slice(0, 160));
  return [
    `outcome=${outcome}`,
    `title=${clip(identity.title)}`,
    `category=${clip(identity.category)}`,
    `set=${clip(identity.setName)}`,
    `setCode=${clip(identity.setCode)}`,
    `number=${clip(identity.cardNumber)}`,
    `confidence=${identity.confidence ?? "null"}`,
    `setConfidence=${identity.setConfidence ?? "null"}`,
    `setCodeConfidence=${identity.setCodeConfidence ?? "null"}`,
    `numberConfidence=${identity.numberConfidence ?? "null"}`,
  ].join(" ");
}

/** A missing per-field score falls back to the older combined set score. */
function fieldScore(specific: number, fallback: number): number {
  return specific > 0 ? specific : fallback;
}

/**
 * New snaps still auto-fill a confident placeholder title. A name the owner
 * already chose is kept until they pick the suggestion. A previously confirmed
 * card is sent back to review when this read's title is actually different.
 * An empty or very unsure title is not a match.
 */
export function planRecognitionUpdate(
  fresh: RecognitionFresh,
  identity: {
    title: string | null;
    category: string | null;
    setName: string | null;
    setCode?: string | null;
    cardNumber: string | null;
    confidence: number;
    setConfidence: number;
    setCodeConfidence?: number;
    numberConfidence?: number;
  },
): RecognitionPlan {
  const setCode = identity.setCode ?? null;
  const setCodeConfidence = identity.setCodeConfidence ?? 0;
  const numberConfidence = identity.numberConfidence ?? 0;
  const suggestedTitle =
    identity.confidence >= SUGGEST_CONFIDENCE ? cleanLabel(identity.title, 140) : null;
  const strongTitle = identity.confidence >= TITLE_CONFIDENCE ? suggestedTitle : null;
  const suggestedCategory =
    identity.confidence >= CATEGORY_CONFIDENCE ? parseCategory(identity.category) : null;
  const suggestedSetName =
    fieldScore(identity.setConfidence, 0) >= SET_NAME_CONFIDENCE ? cleanLabel(identity.setName, 120) : null;
  const suggestedSetCode =
    fieldScore(setCodeConfidence, identity.setConfidence) >= SET_CODE_CONFIDENCE ? cleanLabel(setCode, 16) : null;
  const suggestedCardNumber =
    fieldScore(numberConfidence, identity.setConfidence) >= NUMBER_CONFIDENCE
      ? cleanLabel(identity.cardNumber, 40)
      : null;

  if (!suggestedTitle) {
    return { outcome: "unreadable", note: AI_UNSURE_MESSAGE };
  }

  const write: RecognitionWrite = {
    recognitionStatus: "done",
    recognitionConfidence: identity.confidence,
    recognitionNote: null,
    suggestedTitle,
    suggestedCategory,
    suggestedSetName,
    suggestedSetCode,
    suggestedCardNumber,
  };

  const ownerNamedIt = fresh.detailsTouched || fresh.title !== CARD_PLACEHOLDER_TITLE;
  if (!ownerNamedIt) {
    if (strongTitle) {
      write.title = strongTitle;
      if (fresh.category == null && suggestedCategory) write.category = suggestedCategory;
      if (suggestedSetName) write.setName = suggestedSetName;
      if (suggestedSetCode) write.setCode = suggestedSetCode;
      if (suggestedCardNumber) write.cardNumber = suggestedCardNumber;
      return { outcome: "applied", write };
    }
    write.reviewStatus = "needs_review";
    return { outcome: "review", write };
  }

  const titleChanged = !titlesMatch(suggestedTitle, fresh.title);
  const categoryChanged = Boolean(suggestedCategory && suggestedCategory !== fresh.category);
  const setChanged = Boolean(suggestedSetName && !titlesMatch(suggestedSetName, fresh.setName));
  const codeChanged = Boolean(suggestedSetCode && !titlesMatch(suggestedSetCode, fresh.setCode));
  const numberChanged = Boolean(suggestedCardNumber && !titlesMatch(suggestedCardNumber, fresh.cardNumber));
  if (titleChanged || categoryChanged || setChanged || codeChanged || numberChanged) {
    write.reviewStatus = "needs_review";
    return { outcome: "review", write };
  }
  return { outcome: "same", write };
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
  setCode?: string | null;
  cardNumber: string | null;
  suggestedTitle: string | null;
  suggestedCategory: Category | null;
  suggestedSetName: string | null;
  suggestedSetCode?: string | null;
  suggestedCardNumber: string | null;
};

export function reviewDraft(card: SuggestionCard, prefer: "suggestion" | "current") {
  if (prefer === "current") {
    return {
      title: card.title,
      category: (card.category ?? "") as Category | "",
      setName: card.setName ?? "",
      setCode: card.setCode ?? "",
      cardNumber: card.cardNumber ?? "",
    };
  }
  return {
    title: card.suggestedTitle && !titlesMatch(card.suggestedTitle, card.title) ? card.suggestedTitle : card.title,
    category: (card.suggestedCategory && card.suggestedCategory !== card.category
      ? card.suggestedCategory
      : (card.category ?? "")) as Category | "",
    setName:
      card.suggestedSetName && !titlesMatch(card.suggestedSetName, card.setName)
        ? card.suggestedSetName
        : (card.setName ?? ""),
    setCode:
      card.suggestedSetCode && !titlesMatch(card.suggestedSetCode, card.setCode)
        ? card.suggestedSetCode
        : (card.setCode ?? ""),
    cardNumber:
      card.suggestedCardNumber && !titlesMatch(card.suggestedCardNumber, card.cardNumber)
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
    draft.setCode !== (card.setCode ?? "") ||
    draft.cardNumber !== (card.cardNumber ?? "")
  );
}
