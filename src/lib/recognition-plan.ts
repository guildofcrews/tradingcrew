import { CARD_PLACEHOLDER_TITLE, parseCategory, type Category } from "@/lib/cards";

const TITLE_CONFIDENCE = 0.45;
const CATEGORY_CONFIDENCE = 0.55;
const SET_CONFIDENCE = 0.75;

export const AI_BUSY_MESSAGE = "The AI reader is busy. Wait a moment, then try again.";
export const AI_CREDITS_MESSAGE = "The AI reader is out of credits for now. Try again later.";
export const AI_UNAVAILABLE_MESSAGE = "The AI reader isn't available right now. Try again later.";
export const AI_MISSED_MESSAGE = "I couldn't read this one. You can type the name.";
export const AI_SAME_MESSAGE = "I read it, and your name already looks right.";

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
  cardNumber?: string | null;
  confidence?: number | null;
  setConfidence?: number | null;
}): Identity {
  return {
    title: raw.title ?? "",
    category: raw.category ?? null,
    setName: raw.setName ?? null,
    cardNumber: raw.cardNumber ?? null,
    confidence: clampConfidence(raw.confidence),
    setConfidence: clampConfidence(raw.setConfidence),
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
