import assert from "node:assert/strict";
import { test } from "node:test";
import { CARD_PLACEHOLDER_TITLE, formatCardPrinting } from "./cards";
import {
  AI_BUSY_MESSAGE,
  AI_CREDITS_MESSAGE,
  AI_MISSED_MESSAGE,
  AI_UNSURE_MESSAGE,
  aiReadBannerCopy,
  canAskForAiRead,
  cardNeedsAiRead,
  classifyGatewayFailure,
  coerceCardIdentity,
  describeRecognitionError,
  editReadLabel,
  galleryReadLabel,
  formatParsedIdentity,
  hasSuggestionChoice,
  planRecognitionUpdate,
  reviewDraft,
  retryAfterToMs,
  titlesMatch,
  type RecognitionFresh,
} from "./recognition-plan";

function taken(plan: ReturnType<typeof planRecognitionUpdate>) {
  if (plan.outcome === "unreadable") throw new Error(plan.note);
  return plan.write;
}

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
  const write = taken(planRecognitionUpdate(fresh(), {
    title: "Charizard ex",
    category: "pokemon",
    setName: "Base Set",
    cardNumber: "4/102",
    confidence: 0.9,
    setConfidence: 0.9,
  }));
  assert.equal(write.title, undefined);
  assert.equal(write.category, undefined);
  assert.equal(write.setName, undefined);
  assert.equal(write.suggestedTitle, "Charizard ex");
  assert.equal(write.suggestedSetName, "Base Set");
  assert.equal(write.suggestedCardNumber, "4/102");
  assert.equal(write.reviewStatus, "needs_review");
});

test("a new snap still fills the placeholder title", () => {
  const write = taken(planRecognitionUpdate(fresh({ title: CARD_PLACEHOLDER_TITLE, category: null }), {
    title: "Moltres & Zapdos & Articuno GX",
    category: "pokemon",
    setName: null,
    cardNumber: null,
    confidence: 0.8,
    setConfidence: 0.2,
  }));
  assert.equal(write.title, "Moltres & Zapdos & Articuno GX");
  assert.equal(write.category, "pokemon");
  assert.equal(write.reviewStatus, undefined);
});

test("an edited card is not overwritten", () => {
  const write = taken(planRecognitionUpdate(
    fresh({ title: CARD_PLACEHOLDER_TITLE, detailsTouched: true, category: "baseball" }),
    {
      title: "LeBron James",
      category: "basketball",
      setName: null,
      cardNumber: null,
      confidence: 0.95,
      setConfidence: 0.1,
    },
  ));
  assert.equal(write.title, undefined);
  assert.equal(write.category, undefined);
  assert.equal(write.suggestedCategory, "basketball");
  assert.equal(write.reviewStatus, "needs_review");
});

test("a matching read does not ask for review", () => {
  const write = taken(planRecognitionUpdate(fresh(), {
    title: "Charizard",
    category: "pokemon",
    setName: null,
    cardNumber: null,
    confidence: 0.9,
    setConfidence: 0.1,
  }));
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

test("a confirmed nickname is not treated as a match for a different card", () => {
  const plan = planRecognitionUpdate(
    fresh({ title: "Pikemon25", detailsTouched: true, reviewStatus: "confirmed" }),
    {
      title: "Okidogi ex",
      category: "pokemon",
      setName: "Shrouded Fable",
      cardNumber: "130/064",
      confidence: 0.82,
      setConfidence: 0.7,
    },
  );
  assert.equal(plan.outcome, "review");
  if (plan.outcome !== "review") return;
  assert.equal(plan.write.title, undefined);
  assert.equal(plan.write.suggestedTitle, "Okidogi ex");
  assert.equal(plan.write.reviewStatus, "needs_review");
  assert.equal(
    hasSuggestionChoice({
      title: "Pikemon25",
      category: "pokemon",
      setName: null,
      cardNumber: null,
      suggestedTitle: plan.write.suggestedTitle,
      suggestedCategory: plan.write.suggestedCategory,
      suggestedSetName: plan.write.suggestedSetName,
      suggestedCardNumber: plan.write.suggestedCardNumber,
    }),
    true,
  );
});

test("a moderate-confidence title is still a suggestion", () => {
  const plan = planRecognitionUpdate(fresh({ title: "Pokemon26", detailsTouched: true, reviewStatus: "confirmed" }), {
    title: "Okidogi ex",
    category: "pokemon",
    setName: null,
    cardNumber: null,
    confidence: 0.32,
    setConfidence: 0.1,
  });
  assert.equal(plan.outcome, "review");
  if (plan.outcome !== "review") return;
  assert.equal(plan.write.suggestedTitle, "Okidogi ex");
  assert.equal(plan.write.title, undefined);
});

test("an empty or very unsure read is not a match", () => {
  const empty = planRecognitionUpdate(fresh({ title: "Pikemon25", detailsTouched: true }), {
    title: "",
    category: null,
    setName: null,
    cardNumber: null,
    confidence: 0.9,
    setConfidence: 0,
  });
  assert.equal(empty.outcome, "unreadable");
  if (empty.outcome === "unreadable") assert.equal(empty.note, AI_UNSURE_MESSAGE);

  const unsure = planRecognitionUpdate(fresh({ title: "Pikemon25" }), {
    title: "Okidogi ex",
    category: "pokemon",
    setName: null,
    cardNumber: null,
    confidence: 0.1,
    setConfidence: 0,
  });
  assert.equal(unsure.outcome, "unreadable");
});

test("the same name ignores case and extra spaces", () => {
  assert.equal(titlesMatch("Okidogi ex", "  okidogi   ex "), true);
  assert.equal(titlesMatch("Pikemon25", "Okidogi ex"), false);
  assert.equal(titlesMatch("", "Okidogi ex"), false);
  const plan = planRecognitionUpdate(fresh({ title: "okidogi ex", detailsTouched: true, reviewStatus: "confirmed" }), {
    title: "Okidogi ex",
    category: "pokemon",
    setName: null,
    cardNumber: null,
    confidence: 0.9,
    setConfidence: 0.2,
  });
  assert.equal(plan.outcome, "same");
  const detail = formatParsedIdentity(
    { title: "Okidogi ex", category: "pokemon", setName: null, cardNumber: "130/064", confidence: 0.82, setConfidence: 0.4 },
    "review",
  );
  assert.match(detail, /outcome=review/);
  assert.match(detail, /title="Okidogi ex"/);
  assert.match(detail, /number="130\/064"/);
  assert.match(detail, /confidence=0.82/);
});

test("a sure number is kept when the set name is missing", () => {
  const plan = planRecognitionUpdate(fresh({ title: "Sizzlipede", detailsTouched: true, reviewStatus: "confirmed" }), {
    title: "Sizzlipede",
    category: "pokemon",
    setName: null,
    setCode: "FST",
    cardNumber: "046/264",
    confidence: 0.9,
    setConfidence: 0.1,
    setCodeConfidence: 0.8,
    numberConfidence: 0.9,
  });
  assert.equal(plan.outcome, "review");
  if (plan.outcome !== "review") return;
  assert.equal(plan.write.suggestedSetName, null);
  assert.equal(plan.write.suggestedSetCode, "FST");
  assert.equal(plan.write.suggestedCardNumber, "046/264");
  assert.equal(plan.write.setName, undefined);
  const draft = reviewDraft(
    {
      title: "Sizzlipede",
      category: "pokemon",
      setName: null,
      setCode: null,
      cardNumber: null,
      suggestedTitle: plan.write.suggestedTitle,
      suggestedCategory: plan.write.suggestedCategory,
      suggestedSetName: plan.write.suggestedSetName,
      suggestedSetCode: plan.write.suggestedSetCode,
      suggestedCardNumber: plan.write.suggestedCardNumber,
    },
    "suggestion",
  );
  assert.equal(draft.setName, "");
  assert.equal(draft.setCode, "FST");
  assert.equal(draft.cardNumber, "046/264");
  assert.equal(formatCardPrinting({ setName: "Fusion Strike", cardNumber: "046/264" }), "Fusion Strike · 046/264");
  assert.equal(formatCardPrinting({ setCode: "FST", cardNumber: "046/264" }), "FST · 046/264");
  assert.equal(formatCardPrinting({ cardNumber: "189/264" }), "189/264");
  assert.equal(formatCardPrinting({}), null);
});

test("a low-confidence set name is not stored", () => {
  const plan = planRecognitionUpdate(fresh(), {
    title: "Melmetal",
    category: "pokemon",
    setName: "Definitely Not A Set",
    cardNumber: "189/264",
    confidence: 0.9,
    setConfidence: 0.2,
    numberConfidence: 0.9,
  });
  assert.notEqual(plan.outcome, "unreadable");
  if (plan.outcome === "unreadable") return;
  assert.equal(plan.write.suggestedSetName, null);
  assert.equal(plan.write.suggestedCardNumber, "189/264");
});

test("failed and stuck cards stay in the read set, finished ones only from edit", () => {
  for (const recognitionStatus of [null, "failed", "pending", "running"] as const) {
    assert.equal(cardNeedsAiRead({ recognitionStatus }), true);
  }
  assert.equal(cardNeedsAiRead({ recognitionStatus: "done" }), false);
  assert.equal(cardNeedsAiRead({ recognitionStatus: null, kind: "digital" }), false);
  assert.equal(cardNeedsAiRead({ recognitionStatus: "failed", locked: true }), false);
  assert.equal(canAskForAiRead({ recognitionStatus: "done", lockedTradeId: "trade" }), false);
  assert.equal(canAskForAiRead({ recognitionStatus: "done" }), true);
  assert.equal(galleryReadLabel(null), "Let AI read this card");
  assert.equal(galleryReadLabel("failed"), "Try reading again");
  assert.equal(galleryReadLabel("running"), "Try reading again");
  assert.equal(editReadLabel("done"), "Read again");
  assert.equal(editReadLabel("failed"), "Try reading again");
  assert.equal(aiReadBannerCopy(1), "1 card needs an AI read.");
  assert.equal(aiReadBannerCopy(4), "4 cards need an AI read.");
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
  const write = taken(planRecognitionUpdate(fresh({ title: CARD_PLACEHOLDER_TITLE, category: null }), identity));
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
