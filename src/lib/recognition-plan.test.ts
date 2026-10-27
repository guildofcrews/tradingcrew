import assert from "node:assert/strict";
import { test } from "node:test";
import { CARD_PLACEHOLDER_TITLE } from "./cards";
import {
  AI_BUSY_MESSAGE,
  AI_CREDITS_MESSAGE,
  AI_MISSED_MESSAGE,
  classifyGatewayFailure,
  coerceCardIdentity,
  describeRecognitionError,
  hasSuggestionChoice,
  planRecognitionUpdate,
  retryAfterToMs,
  type RecognitionFresh,
} from "./recognition-plan";

const fresh = (patch: Partial<RecognitionFresh> = {}): RecognitionFresh => ({
  title: "Charizard",
  category: "pokemon",
  setName: null,
  cardNumber: null,
  detailsTouched: false,
  reviewStatus: null,
  ...patch,
});

test("a typed title is kept and the AI name is only a suggestion", () => {
  const write = planRecognitionUpdate(fresh(), {
    title: "Charizard ex",
    category: "pokemon",
    setName: "Base Set",
    cardNumber: "4/102",
    confidence: 0.9,
    setConfidence: 0.9,
  });
  assert.equal(write.title, undefined);
  assert.equal(write.category, undefined);
  assert.equal(write.setName, undefined);
  assert.equal(write.suggestedTitle, "Charizard ex");
  assert.equal(write.suggestedSetName, "Base Set");
  assert.equal(write.suggestedCardNumber, "4/102");
  assert.equal(write.reviewStatus, "needs_review");
});

test("a new snap still fills the placeholder title", () => {
  const write = planRecognitionUpdate(fresh({ title: CARD_PLACEHOLDER_TITLE, category: null }), {
    title: "Moltres & Zapdos & Articuno GX",
    category: "pokemon",
    setName: null,
    cardNumber: null,
    confidence: 0.8,
    setConfidence: 0.2,
  });
  assert.equal(write.title, "Moltres & Zapdos & Articuno GX");
  assert.equal(write.category, "pokemon");
  assert.equal(write.reviewStatus, undefined);
});

test("an edited card is not overwritten", () => {
  const write = planRecognitionUpdate(
    fresh({ title: CARD_PLACEHOLDER_TITLE, detailsTouched: true, category: "baseball" }),
    {
      title: "LeBron James",
      category: "basketball",
      setName: null,
      cardNumber: null,
      confidence: 0.95,
      setConfidence: 0.1,
    },
  );
  assert.equal(write.title, undefined);
  assert.equal(write.category, undefined);
  assert.equal(write.suggestedCategory, "basketball");
  assert.equal(write.reviewStatus, "needs_review");
});

test("a matching read does not ask for review", () => {
  const write = planRecognitionUpdate(fresh(), {
    title: "Charizard",
    category: "pokemon",
    setName: null,
    cardNumber: null,
    confidence: 0.9,
    setConfidence: 0.1,
  });
  assert.equal(write.reviewStatus, undefined);
  assert.equal(
    hasSuggestionChoice({
      ...fresh(),
      suggestedTitle: write.suggestedTitle,
      suggestedCategory: write.suggestedCategory,
      suggestedSetName: write.suggestedSetName,
      suggestedCardNumber: write.suggestedCardNumber,
    }),
    false,
  );
});

test("rate limits and empty credits get different kid-facing messages", () => {
  const limited = classifyGatewayFailure({
    statusCode: 429,
    message: "Rate limit exceeded",
    responseBody: '{"error":{"type":"rate_limit_exceeded"}}',
    retryAfter: "3",
  });
  assert.equal(limited.kind, "rate_limit");
  assert.equal(limited.kidMessage, AI_BUSY_MESSAGE);
  assert.equal(limited.retryAfterMs, 3000);

  const broke = classifyGatewayFailure({
    statusCode: 402,
    message: "Insufficient funds",
    responseBody: "insufficient_funds",
  });
  assert.equal(broke.kind, "credits");
  assert.equal(broke.kidMessage, AI_CREDITS_MESSAGE);
});

test("retry-after accepts seconds", () => {
  assert.equal(retryAfterToMs("2"), 2000);
  assert.equal(retryAfterToMs("nope"), null);
});

test("an unexpected category and a percent score still count as a read", () => {
  const identity = coerceCardIdentity({
    title: "Litleo",
    category: "fire",
    setName: "Flashfire",
    cardNumber: "18/106",
    confidence: 92,
    setConfidence: 0.8,
  });
  assert.equal(identity.confidence, 0.92);
  const write = planRecognitionUpdate(fresh({ title: CARD_PLACEHOLDER_TITLE, category: null }), identity);
  assert.equal(write.recognitionStatus, "done");
  assert.equal(write.title, "Litleo");
  assert.equal(write.suggestedCategory, null);
  assert.equal(write.category, undefined);
});

test("failure details keep the error class, HTTP status, and photo size", () => {
  const cause = Object.assign(new Error("payload too large"), {
    name: "APICallError",
    statusCode: 413,
    responseBody: '{"error":"request entity too large"}',
  });
  const error = Object.assign(new Error("No object generated"), {
    name: "NoObjectGeneratedError",
    text: '{"category":"trainer"}',
    cause,
  });
  const detail = describeRecognitionError(error, {
    sourceBytes: 4_800_000,
    sourceType: "image/jpeg",
    normalizedBytes: 180_000,
  });
  assert.match(detail, /NoObjectGeneratedError/);
  assert.match(detail, /HTTP 413/);
  assert.match(detail, /payload too large/);
  assert.match(detail, /source 4800000b image\/jpeg/);
  assert.match(detail, /jpeg 180000b/);
  const failure = classifyGatewayFailure({ statusCode: 413, message: error.message });
  assert.equal(failure.kidMessage, AI_MISSED_MESSAGE);
});
