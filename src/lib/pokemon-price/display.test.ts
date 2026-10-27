import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRICE_CREDIT, VALUE_UNAVAILABLE, presentCardValue } from "./display";
import { readTcgplayerPrices } from "./tcgplayer";

const NOW = new Date("2026-10-27T12:00:00Z");

/** Pricing objects recorded from TCGdex card payloads on 2026-10-27. highPrice is present and must stay hidden. */
const OKIDOGI = {
  pricing: {
    tcgplayer: {
      unit: "USD",
      updated: "2026-10-14T22:55:10.873Z",
      holofoil: { lowPrice: 0.2, midPrice: 0.88, highPrice: 999, marketPrice: 0.6 },
    },
  },
};

const SIZZLIPEDE = {
  pricing: {
    tcgplayer: {
      unit: "USD",
      updated: "2026-10-14T22:55:07.101Z",
      "reverse-holofoil": { lowPrice: 0.05, midPrice: 0.25, highPrice: 19.8, marketPrice: 0.23 },
      normal: { lowPrice: 0.01, midPrice: 0.16, highPrice: 19.8, marketPrice: 0.03 },
    },
  },
};

const MELMETAL = {
  pricing: {
    tcgplayer: {
      unit: "USD",
      updated: "2026-10-14T22:55:07.101Z",
      "reverse-holofoil": { lowPrice: 0.1, midPrice: 0.27, highPrice: 3.53, marketPrice: 0.25 },
      holofoil: { lowPrice: 0.01, midPrice: 0.25, highPrice: 14.92, marketPrice: 0.21 },
    },
  },
};

const PIKACHU = {
  pricing: {
    tcgplayer: {
      unit: "USD",
      updated: "2026-10-14T22:55:11.368Z",
      holofoil: { lowPrice: 64, midPrice: 80.54, highPrice: 568.52, marketPrice: 73.22 },
    },
  },
};

function pricesOf(card: unknown) {
  const snapshot = readTcgplayerPrices(card);
  assert.ok(snapshot);
  return snapshot.variants.map((variant) => ({
    variant: variant.variant,
    marketUsd: variant.market,
    sourceUpdatedAt: snapshot.updated,
  }));
}

function visible(card: ReturnType<typeof presentCardValue>): string {
  return [card.headline, card.detail, card.secondary, card.credit].filter(Boolean).join(" ");
}

describe("price display", () => {
  it("shows Under $1 for the spec's small cards and hides highPrice", () => {
    const okidogi = presentCardValue(pricesOf(OKIDOGI), null, NOW);
    assert.equal(okidogi.headline, "Under $1");
    assert.equal(okidogi.detail, "TCGplayer market price as of Oct 14");
    assert.equal(okidogi.secondary, null);
    assert.equal(okidogi.credit, PRICE_CREDIT);
    assert.equal(visible(okidogi).includes("999"), false);

    const sizzlipede = presentCardValue(pricesOf(SIZZLIPEDE), null, NOW);
    assert.equal(sizzlipede.headline, "Under $1");
    assert.equal(sizzlipede.selectedVariant, "normal");
    assert.equal(sizzlipede.secondary, "Reverse holo: $0.23");
    assert.equal(visible(sizzlipede).includes("19.8"), false);
    assert.equal(sizzlipede.choices.length, 2);

    const melmetal = presentCardValue(pricesOf(MELMETAL), null, NOW);
    assert.equal(melmetal.headline, "Under $1");
    assert.equal(melmetal.selectedVariant, "holofoil");
    assert.equal(melmetal.secondary, "Reverse holo: $0.25");
    assert.equal(visible(melmetal).includes("14.92"), false);
  });

  it("shows the Pikachu ex market price in dollars", () => {
    const pikachu = presentCardValue(pricesOf(PIKACHU), null, NOW);
    assert.equal(pikachu.headline, "Approx. value $73.22");
    assert.equal(pikachu.detail, "TCGplayer market price as of Oct 14");
    assert.equal(pikachu.credit, PRICE_CREDIT);
    assert.equal(pikachu.secondary, null);
    assert.equal(visible(pikachu).includes("568"), false);
    assert.equal(visible(pikachu).includes("high"), false);
  });

  it("lets the owner pick a variant and never prints $0", () => {
    const reverse = presentCardValue(pricesOf(SIZZLIPEDE), "reverse-holofoil", NOW);
    assert.equal(reverse.selectedVariant, "reverse-holofoil");
    assert.equal(reverse.headline, "Under $1");
    assert.equal(reverse.secondary, "Normal: $0.03");

    const zero = presentCardValue(
      [{ variant: "normal", marketUsd: 0, sourceUpdatedAt: "2026-10-14T00:00:00Z" }],
      null,
      NOW,
    );
    assert.equal(zero.headline, VALUE_UNAVAILABLE);
    assert.equal(zero.credit, null);
    assert.equal(zero.detail, null);

    assert.equal(readTcgplayerPrices({ pricing: { cardmarket: { unit: "EUR" } } }), null);
    assert.equal(readTcgplayerPrices({ name: "Okidogi ex" }), null);
    const empty = presentCardValue([], null, NOW);
    assert.equal(empty.headline, VALUE_UNAVAILABLE);
  });
});
