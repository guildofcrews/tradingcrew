import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveMatch, type CatalogBrief, type CatalogCard, type MatchCatalog } from "./match";
import {
  isPocketSet,
  labelsNeedRematch,
  normalizeLocalId,
  normalizeName,
  splitCollectorNumber,
} from "./normalize";
import { cronAuthorized } from "./cron-auth";
import { tcgdexGet } from "./tcgdex";

/**
 * Name-search rows recorded from https://api.tcgdex.net/v2/en on 2026-10-27.
 * Okidogi ex, Sizzlipede, Melmetal, and Pikachu ex are the spec's four cards.
 */
const OKIDOGI: CatalogBrief[] = [
  { id: "sv06.5-036", localId: "036", name: "Okidogi ex" },
  { id: "sv06.5-082", localId: "082", name: "Okidogi ex" },
  { id: "sv06.5-090", localId: "090", name: "Okidogi ex" },
];

const SIZZLIPEDE: CatalogBrief[] = [
  { id: "me05-009", localId: "009", name: "Sizzlipede" },
  { id: "swsh3.5-9", localId: "9", name: "Sizzlipede" },
  { id: "sv08-027", localId: "027", name: "Sizzlipede" },
  { id: "me01-029", localId: "029", name: "Sizzlipede" },
  { id: "swsh5-29", localId: "29", name: "Sizzlipede" },
  { id: "sv05-036", localId: "036", name: "Sizzlipede" },
  { id: "swsh1-37", localId: "37", name: "Sizzlipede" },
  { id: "swsh1-38", localId: "38", name: "Sizzlipede" },
  { id: "swsh8-46", localId: "46", name: "Sizzlipede" },
  { id: "swsh8-47", localId: "47", name: "Sizzlipede" },
  { id: "A1-051", localId: "051", name: "Sizzlipede", image: "https://assets.tcgdex.net/en/tcgp/A1/051" },
  { id: "swsh4.5sv-SV018", localId: "SV018", name: "Sizzlipede" },
];

const MELMETAL: CatalogBrief[] = [
  { id: "swsh10.5-046", localId: "046", name: "Melmetal" },
  { id: "A3b-050", localId: "050", name: "Melmetal", image: "https://assets.tcgdex.net/en/tcgp/A3b/050" },
  { id: "sv07-104", localId: "104", name: "Melmetal" },
  { id: "sv05-117", localId: "117", name: "Melmetal" },
  { id: "sm10-129", localId: "129", name: "Melmetal" },
  { id: "swsh3-130", localId: "130", name: "Melmetal" },
  { id: "A1-182", localId: "182", name: "Melmetal", image: "https://assets.tcgdex.net/en/tcgp/A1/182" },
  { id: "swsh8-189", localId: "189", name: "Melmetal" },
  { id: "smp-SM181", localId: "SM181", name: "Melmetal" },
];

const PIKACHU_EX: CatalogBrief[] = [
  { id: "A2b-022", localId: "022", name: "Pikachu ex", image: "https://assets.tcgdex.net/en/tcgp/A2b/022" },
  { id: "sv08.5-028", localId: "028", name: "Pikachu ex" },
  { id: "30th-053", localId: "053", name: "Pikachu ex" },
  { id: "30th-054", localId: "054", name: "Pikachu ex" },
  { id: "me02.5-057", localId: "057", name: "Pikachu ex" },
  { id: "sv08-057", localId: "057", name: "Pikachu ex" },
  { id: "sv02-063", localId: "063", name: "Pikachu ex" },
  { id: "A2b-082", localId: "082", name: "Pikachu ex", image: "https://assets.tcgdex.net/en/tcgp/A2b/082" },
  { id: "A2b-092", localId: "092", name: "Pikachu ex", image: "https://assets.tcgdex.net/en/tcgp/A2b/092" },
  { id: "A1-096", localId: "096", name: "Pikachu ex", image: "https://assets.tcgdex.net/en/tcgp/A1/096" },
  { id: "svp-106", localId: "106", name: "Pikachu ex" },
  { id: "30th-149", localId: "149", name: "Pikachu ex" },
  { id: "30th-150", localId: "150", name: "Pikachu ex" },
  { id: "sv08.5-179", localId: "179", name: "Pikachu ex" },
  { id: "sv08-219", localId: "219", name: "Pikachu ex" },
  { id: "sv08-238", localId: "238", name: "Pikachu ex" },
  { id: "sv08-247", localId: "247", name: "Pikachu ex" },
  { id: "A1-259", localId: "259", name: "Pikachu ex", image: "https://assets.tcgdex.net/en/tcgp/A1/259" },
  { id: "me02.5-276", localId: "276", name: "Pikachu ex" },
  { id: "me02.5-277", localId: "277", name: "Pikachu ex" },
  { id: "A1-281", localId: "281", name: "Pikachu ex", image: "https://assets.tcgdex.net/en/tcgp/A1/281" },
  { id: "A1-285", localId: "285", name: "Pikachu ex", image: "https://assets.tcgdex.net/en/tcgp/A1/285" },
  { id: "B1-321", localId: "321", name: "Pikachu ex", image: "https://assets.tcgdex.net/en/tcgp/B1/321" },
];

const RECORDED = [...OKIDOGI, ...SIZZLIPEDE, ...MELMETAL, ...PIKACHU_EX];

function detail(partial: CatalogCard): CatalogCard {
  return partial;
}

function catalog(options: {
  briefs?: CatalogBrief[];
  sets?: Record<string, CatalogCard[]>;
  details?: CatalogCard[];
  onName?: () => void;
}): MatchCatalog {
  const known = new Map((options.details ?? []).map((card) => [card.id, card]));
  return {
    bySetCode: async (code) => options.sets?.[code] ?? [],
    byName: async () => {
      options.onName?.();
      return options.briefs ?? RECORDED;
    },
    details: async (ids) => ids.flatMap((id) => (known.has(id) ? [known.get(id)!] : [])),
  };
}

const shroudedFable = (localId: string, id: string, name: string): CatalogCard =>
  detail({
    id,
    localId,
    name,
    setId: "sv06.5",
    setName: "Shrouded Fable",
    officialCount: 64,
    serieId: "sv",
  });

describe("collector numbers", () => {
  it("strips leading zeros and keeps letter prefixes", () => {
    assert.equal(normalizeLocalId("036"), "36");
    assert.equal(normalizeLocalId("tg05"), "TG05");
    assert.equal(normalizeLocalId("SVP 050"), "SVP050");
    assert.equal(normalizeLocalId("46"), "46");
    assert.deepEqual(splitCollectorNumber("046/264"), { localId: "46", total: 264 });
    assert.deepEqual(splitCollectorNumber("247/191"), { localId: "247", total: 191 });
    assert.deepEqual(splitCollectorNumber("036"), { localId: "36", total: null });
  });

  it("normalizes EX spacing without fuzzy matching", () => {
    assert.equal(normalizeName("Okidogi EX"), normalizeName("Okidogi ex"));
    assert.equal(normalizeName("OkidogiEX"), normalizeName("Okidogi ex"));
    assert.notEqual(normalizeName("Okidogi"), normalizeName("Okidogi ex"));
    assert.equal(normalizeName("Pikachu VMAX"), normalizeName("PikachuVMAX"));
  });

  it("recognizes TCG Pocket set ids including B1", () => {
    assert.equal(isPocketSet("A1"), true);
    assert.equal(isPocketSet("A2b"), true);
    assert.equal(isPocketSet("B1"), true);
    assert.equal(isPocketSet("P-A"), true);
    assert.equal(isPocketSet("swsh8"), false);
    assert.equal(isPocketSet("sv06.5"), false);
    assert.equal(isPocketSet("sv08", "tcgp"), true);
  });
});

describe("spec cards", () => {
  it("matches Okidogi ex 036 to sv06.5-036 even with the wrong set name and total", async () => {
    const match = await resolveMatch(
      { name: "Okidogi ex", cardNumber: "036", setCode: null, setName: "Paradox Rift" },
      catalog({}),
    );
    assert.equal(match.confidence, "medium");
    assert.equal(match.tcgdexId, "sv06.5-036");

    const wrongTotal = await resolveMatch(
      { name: "Okidogi ex", cardNumber: "036/182", setCode: null, setName: "Paradox Rift" },
      catalog({}),
    );
    assert.equal(wrongTotal.tcgdexId, "sv06.5-036");
  });

  it("matches Sizzlipede 046/264 to swsh8-46", async () => {
    const match = await resolveMatch(
      { name: "Sizzlipede", cardNumber: "046/264", setCode: null, setName: "Sword & Shield" },
      catalog({}),
    );
    assert.equal(match.confidence, "medium");
    assert.equal(match.tcgdexId, "swsh8-46");
  });

  it("matches Melmetal 189/264 to Fusion Strike swsh8-189", async () => {
    const match = await resolveMatch(
      { name: "Melmetal", cardNumber: "189/264", setCode: null, setName: "Brilliant Stars" },
      catalog({}),
    );
    assert.equal(match.confidence, "medium");
    assert.equal(match.tcgdexId, "swsh8-189");
  });

  it("matches secret rare Pikachu ex 247/191 to sv08-247", async () => {
    let detailsCalled = false;
    const match = await resolveMatch(
      { name: "Pikachu ex", cardNumber: "247/191", setCode: null, setName: "SV 151" },
      catalog({
        details: [],
        onName: () => {
          detailsCalled = false;
        },
      }),
    );
    assert.equal(detailsCalled, false);
    assert.equal(match.confidence, "medium");
    assert.equal(match.tcgdexId, "sv08-247");
  });

  it("uses a printed set code as a high-confidence match and ignores a wrong code", async () => {
    let nameSearches = 0;
    const high = await resolveMatch(
      { name: "Okidogi ex", cardNumber: "036/064", setCode: "sfa", setName: "Paradox Rift" },
      catalog({
        sets: {
          sfa: [
            shroudedFable("036", "sv06.5-036", "Okidogi ex"),
            shroudedFable("082", "sv06.5-082", "Okidogi ex"),
          ],
        },
        onName: () => {
          nameSearches += 1;
        },
      }),
    );
    assert.equal(high.confidence, "high");
    assert.equal(high.tcgdexId, "sv06.5-036");
    assert.equal(nameSearches, 0);

    const fallback = await resolveMatch(
      { name: "Okidogi ex", cardNumber: "036", setCode: "PAR", setName: null },
      catalog({ sets: {} }),
    );
    assert.equal(fallback.confidence, "medium");
    assert.equal(fallback.tcgdexId, "sv06.5-036");
  });
});

describe("when more than one card fits", () => {
  const twins: CatalogBrief[] = [
    { id: "base1-25", localId: "25", name: "Pikachu" },
    { id: "jungle-25", localId: "025", name: "Pikachu" },
  ];
  const twinDetails: CatalogCard[] = [
    detail({
      id: "base1-25",
      localId: "25",
      name: "Pikachu",
      setId: "base1",
      setName: "Base",
      officialCount: 102,
      serieId: "base",
    }),
    detail({
      id: "jungle-25",
      localId: "025",
      name: "Pikachu",
      setId: "jungle",
      setName: "Jungle",
      officialCount: 64,
      serieId: "base",
    }),
  ];

  it("does not guess, then lets the printed total and set name break the tie", async () => {
    const ambiguous = await resolveMatch(
      { name: "Pikachu", cardNumber: "25", setCode: null, setName: null },
      catalog({ briefs: twins, details: twinDetails }),
    );
    assert.equal(ambiguous.confidence, "none");
    assert.equal(ambiguous.tcgdexId, null);
    assert.deepEqual(
      ambiguous.candidates.map((card) => card.id),
      ["base1-25", "jungle-25"],
    );

    const byTotal = await resolveMatch(
      { name: "Pikachu", cardNumber: "25/64", setCode: null, setName: "Base" },
      catalog({ briefs: twins, details: twinDetails }),
    );
    assert.equal(byTotal.tcgdexId, "jungle-25");
    assert.equal(byTotal.confidence, "medium");

    const sameTotal: CatalogCard[] = twinDetails.map((card) => ({ ...card, officialCount: 102 }));
    const byName = await resolveMatch(
      { name: "Pikachu", cardNumber: "25/102", setCode: null, setName: "Jungle" },
      catalog({ briefs: twins, details: sameTotal }),
    );
    assert.equal(byName.tcgdexId, "jungle-25");

    const wrongName = await resolveMatch(
      { name: "Pikachu", cardNumber: "25/102", setCode: null, setName: "Paradox Rift" },
      catalog({ briefs: twins, details: sameTotal }),
    );
    assert.equal(wrongName.confidence, "none");
    assert.equal(wrongName.candidates.length, 2);
  });

  it("drops TCG Pocket cards, including B1, instead of matching them", async () => {
    const pocket = await resolveMatch(
      { name: "Pikachu ex", cardNumber: "321", setCode: null, setName: null },
      catalog({}),
    );
    assert.equal(pocket.confidence, "none");
    assert.equal(pocket.tcgdexId, null);

    const kept = await resolveMatch(
      { name: "Pikachu ex", cardNumber: "096", setCode: null, setName: null },
      catalog({
        briefs: [
          { id: "A1-096", localId: "096", name: "Pikachu ex", image: "https://assets.tcgdex.net/en/tcgp/A1/096" },
          { id: "sv03-096", localId: "096", name: "Pikachu ex" },
        ],
      }),
    );
    assert.equal(kept.tcgdexId, "sv03-096");
  });
});

describe("rematch and cron auth", () => {
  const pokemon = {
    name: "Okidogi ex",
    cardNumber: "036/064",
    setCode: "SFA",
    setName: "Shrouded Fable",
    category: "pokemon",
    matchConfidence: "medium" as const,
  };

  it("rematches when the name, number, set code, or total changes", () => {
    assert.equal(labelsNeedRematch(pokemon, pokemon), false);
    assert.equal(labelsNeedRematch(pokemon, { ...pokemon, cardNumber: "036/182" }), true);
    assert.equal(labelsNeedRematch(pokemon, { ...pokemon, cardNumber: "36/64" }), false);
    assert.equal(labelsNeedRematch(pokemon, { ...pokemon, setCode: "PAR" }), true);
    assert.equal(labelsNeedRematch(pokemon, { ...pokemon, name: "Okidogi EX" }), false);
    assert.equal(labelsNeedRematch(pokemon, { ...pokemon, category: "basketball" }), true);
    assert.equal(
      labelsNeedRematch({ ...pokemon, matchConfidence: null }, pokemon),
      true,
    );
    assert.equal(
      labelsNeedRematch(
        { ...pokemon, category: "baseball", matchConfidence: null },
        { ...pokemon, category: "baseball", name: "Shohei" },
      ),
      false,
    );
  });

  it("rejects a cron call unless the bearer secret matches", () => {
    assert.equal(cronAuthorized("Bearer secret", undefined), false);
    assert.equal(cronAuthorized("Bearer secret", ""), false);
    assert.equal(cronAuthorized("Bearer no", "secret"), false);
    assert.equal(cronAuthorized(null, "secret"), false);
    assert.equal(cronAuthorized("Bearer secret", "secret"), true);
  });

  it("retries a 503 and then returns the body", async () => {
    let calls = 0;
    const body = await tcgdexGet("/cards/sv08-247", async () => {
      calls += 1;
      if (calls === 1) return { ok: false, status: 503, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ id: "sv08-247" }) };
    });
    assert.equal(calls, 2);
    assert.deepEqual(body, { id: "sv08-247" });
  });
});
