import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRICE_CREDIT, VALUE_UNAVAILABLE, collectionTotal, presentCardValue } from "./display";
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
    assert.equal(empty.marketUsd, null);
  });

  it("sums the same market prices the tiles use", () => {
    const pikachu = presentCardValue(pricesOf(PIKACHU), null, NOW);
    const okidogi = presentCardValue(pricesOf(OKIDOGI), null, NOW);
    const reverse = presentCardValue(pricesOf(SIZZLIPEDE), "reverse-holofoil", NOW);
    const missing = presentCardValue([], null, NOW);
    assert.equal(pikachu.marketUsd, 73.22);
    assert.equal(okidogi.marketUsd, 0.6);
    assert.equal(reverse.marketUsd, 0.23);
    assert.equal(reverse.selectedVariant, "reverse-holofoil");

    const mixed = collectionTotal(
      [
        { marketUsd: pikachu.marketUsd, sourceUpdatedAt: pikachu.sourceUpdatedAt },
        { marketUsd: okidogi.marketUsd, sourceUpdatedAt: "2026-10-01T00:00:00.000Z" },
        { marketUsd: missing.marketUsd, sourceUpdatedAt: null },
        { marketUsd: 0, sourceUpdatedAt: "2026-10-14T00:00:00.000Z" },
      ],
      NOW,
    );
    assert.equal(mixed.headline, "Approx. collection value $73.82");
    assert.equal(mixed.short, "Approx. $73.82");
    assert.equal(mixed.priced, 2);
    assert.equal(mixed.cards, 4);
    assert.equal(mixed.asOf, "Oct 1");
    assert.equal(mixed.headline?.includes("999"), false);

    const small = collectionTotal(
      [
        { marketUsd: reverse.marketUsd, sourceUpdatedAt: reverse.sourceUpdatedAt },
        { marketUsd: 0.21, sourceUpdatedAt: "2026-10-14T00:00:00.000Z" },
      ],
      NOW,
    );
    assert.equal(small.headline, "Under $1");
    assert.equal(small.amount, 0.44);

    const none = collectionTotal([{ marketUsd: null }, { marketUsd: 0 }], NOW);
    assert.equal(none.headline, null);
    assert.equal(none.priced, 0);
    assert.equal(none.cards, 2);
  });
});
