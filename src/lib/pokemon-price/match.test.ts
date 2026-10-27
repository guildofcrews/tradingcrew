import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveMatch, type CatalogBrief, type CatalogCard, type MatchCatalog } from "./match";
import {
  isPocketSet,
  labelsNeedRematch,
  normalizeLocalId,
  normalizeName,
  splitCollectorNumber,
  tcgdexNameQuery,
} from "./normalize";
import { cronAuthorized } from "./cron-auth";
import { createTcgdexCatalog, tcgdexGet } from "./tcgdex";

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

  it("keeps hyphens and apostrophes when searching, and still folds EX and GX", () => {
    assert.equal(tcgdexNameQuery("Chi-Yu EX"), "chi-yu ex");
    assert.equal(tcgdexNameQuery("Blastoise EX"), "blastoise ex");
    assert.equal(tcgdexNameQuery("Charizard GX"), "charizard gx");
    assert.equal(tcgdexNameQuery("Charizard-GX"), "charizard gx");
    assert.equal(tcgdexNameQuery("Moltres & Zapdos & Articuno GX"), "moltres & zapdos & articuno gx");
    assert.equal(tcgdexNameQuery("Moltres & Zapdos & Articuno-GX"), "moltres & zapdos & articuno gx");
    assert.equal(
      normalizeName("Moltres & Zapdos & Articuno GX"),
      normalizeName("Moltres & Zapdos & Articuno-GX"),
    );
    assert.equal(tcgdexNameQuery("Galarian Sirfetch'd"), "galarian sirfetch'd");
    assert.equal(tcgdexNameQuery("Galarian Sirfetch’d"), "galarian sirfetch'd");
    assert.equal(tcgdexNameQuery("Toxapex"), "toxapex");
    assert.equal(tcgdexNameQuery("OkidogiEX"), "okidogi ex");
    assert.equal(normalizeName("Chi-Yu EX"), normalizeName("Chi-Yu ex"));
    assert.equal(normalizeName("Blastoise EX"), normalizeName("Blastoise ex"));
    assert.equal(normalizeName("Charizard GX"), normalizeName("Charizard-GX"));
    assert.equal(normalizeName("Galarian Sirfetch'd"), normalizeName("Galarian Sirfetch’d"));
  });

  it("asks TCGdex with the punctuation intact", async () => {
    const urls: string[] = [];
    const catalog = createTcgdexCatalog(async (url) => {
      urls.push(url);
      return { ok: true, status: 200, json: async () => [] };
    });
    await catalog.byName("Chi-Yu EX");
    await catalog.byName("Galarian Sirfetch'd");
    assert.equal(new URL(urls[0]).searchParams.get("name"), "like:chi-yu ex");
    assert.equal(new URL(urls[1]).searchParams.get("name"), "like:galarian sirfetch'd");
    assert.equal(urls[0].includes("%26"), false);
    await catalog.byName("Moltres & Zapdos & Articuno GX");
    assert.equal(new URL(urls[2]).searchParams.get("name"), "like:moltres & zapdos & articuno gx");
    assert.match(urls[2], /%26/);
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

/** Name-search rows recorded from TCGdex on 2026-10-27 for the live gallery labels. */
describe("gallery labels from the Pokémon wing", () => {
  const chiYu: CatalogBrief[] = [
    { id: "sv02-040", localId: "040", name: "Chi-Yu ex" },
    { id: "sv02-234", localId: "234", name: "Chi-Yu ex" },
    { id: "sv04.5-241", localId: "241", name: "Chi-Yu ex" },
    { id: "sv02-259", localId: "259", name: "Chi-Yu ex" },
  ];
  const sirfetch: CatalogBrief[] = [
    { id: "swsh6-79", localId: "79", name: "Galarian Sirfetch'd" },
    { id: "swsh2-95", localId: "95", name: "Galarian Sirfetch'd" },
    { id: "swsh3-98", localId: "98", name: "Galarian Sirfetch'd" },
    { id: "swsh4-174", localId: "174", name: "Galarian Sirfetch'd V" },
    { id: "swsh4.5sv-SV064", localId: "SV064", name: "Galarian Sirfetch'd" },
    { id: "swshp-SWSH043", localId: "SWSH043", name: "Galarian Sirfetch'd V" },
  ];
  const litleo: CatalogBrief[] = [
    { id: "xy4-11", localId: "11", name: "Litleo" },
    { id: "me04-014", localId: "014", name: "Litleo" },
    { id: "sv08.5-015", localId: "015", name: "Litleo" },
    { id: "sm6-18", localId: "18", name: "Litleo" },
    { id: "xy2-18", localId: "18", name: "Litleo" },
    { id: "xy2-19", localId: "19", name: "Litleo" },
    { id: "B2-020", localId: "020", name: "Litleo" },
    { id: "xy11-22", localId: "22", name: "Litleo" },
    { id: "swsh7-22", localId: "22", name: "Litleo" },
    { id: "me01-023", localId: "023", name: "Litleo" },
    { id: "swsh11-028", localId: "028", name: "Litleo" },
    { id: "sv02-031", localId: "031", name: "Litleo" },
    { id: "sm12-36", localId: "36", name: "Litleo" },
    { id: "B1-045", localId: "045", name: "Litleo" },
    { id: "sm8-50", localId: "50", name: "Litleo" },
    { id: "me01-139", localId: "139", name: "Litleo" },
  ];

  it("matches the uppercase EX and GX labels, and the apostrophe in Sirfetch'd", async () => {
    const blastoise = await resolveMatch(
      { name: "Blastoise EX", cardNumber: "184/165", setCode: null, setName: "Scarlet & Violet" },
      catalog({
        briefs: [
          { id: "B1a-020", localId: "020", name: "Mega Blastoise ex", image: "https://assets.tcgdex.net/en/tcgp/B1a/020" },
          { id: "sv03.5-184", localId: "184", name: "Blastoise ex" },
        ],
      }),
    );
    assert.equal(blastoise.tcgdexId, "sv03.5-184");

    const chi = await resolveMatch(
      { name: "Chi-Yu EX", cardNumber: "259/193", setCode: null, setName: "Paldean Fates" },
      catalog({ briefs: chiYu }),
    );
    assert.equal(chi.tcgdexId, "sv02-259");

    const charizard = await resolveMatch(
      { name: "Charizard GX", cardNumber: "20/147", setCode: null, setName: null },
      catalog({
        briefs: [
          { id: "sm10-20", localId: "20", name: "Reshiram & Charizard GX" },
          { id: "sm3-20", localId: "20", name: "Charizard GX" },
        ],
      }),
    );
    assert.equal(charizard.tcgdexId, "sm3-20");

    const dragonair = await resolveMatch(
      { name: "Dragonair", cardNumber: "151/217", setCode: null, setName: "Scarlet & Violet" },
      catalog({
        briefs: [
          { id: "sm1-95", localId: "95", name: "Dragonair" },
          { id: "me02.5-151", localId: "151", name: "Dragonair" },
        ],
      }),
    );
    assert.equal(dragonair.tcgdexId, "me02.5-151");

    const sir = await resolveMatch(
      { name: "Galarian Sirfetch'd", cardNumber: "095/192", setCode: null, setName: "Sword & Shield Base Set" },
      catalog({ briefs: sirfetch }),
    );
    assert.equal(sir.tcgdexId, "swsh2-95");
  });

  it("does not invent a Litleo 073/132: Mega Evolution 073 is Hariyama, and Litleo there is 023 or 139", async () => {
    const match = await resolveMatch(
      { name: "Litleo", cardNumber: "073/132", setCode: null, setName: "2025 Scarlet & Violet 151" },
      catalog({ briefs: litleo }),
    );
    assert.equal(match.confidence, "none");
    assert.equal(match.tcgdexId, null);
    assert.equal(match.candidates.length, 0);
  });

  it("matches Moltres & Zapdos & Articuno GX 210 to promo SM210, not Lost Thunder", async () => {
    const trio: CatalogBrief[] = [
      { id: "sm115-44", localId: "44", name: "Moltres & Zapdos & Articuno GX" },
      { id: "sm115-66", localId: "66", name: "Moltres & Zapdos & Articuno GX" },
      { id: "sm115-69", localId: "69", name: "Moltres & Zapdos & Articuno GX" },
      { id: "smp-SM210", localId: "SM210", name: "Moltres & Zapdos & Articuno GX" },
      { id: "sm8-210", localId: "210", name: "Kahili" },
    ];
    const match = await resolveMatch(
      {
        name: "Moltres & Zapdos & Articuno GX",
        cardNumber: "210/214",
        setCode: null,
        setName: "Lost Thunder",
      },
      catalog({ briefs: trio }),
    );
    assert.equal(match.confidence, "medium");
    assert.equal(match.tcgdexId, "smp-SM210");

    const hyphen = await resolveMatch(
      { name: "Moltres & Zapdos & Articuno-GX", cardNumber: "210/214", setCode: "LOT", setName: "Lost Thunder" },
      catalog({ briefs: trio, sets: { LOT: [] } }),
    );
    assert.equal(hyphen.tcgdexId, "smp-SM210");

    const exact = await resolveMatch(
      { name: "Moltres & Zapdos & Articuno GX", cardNumber: "210/214", setCode: null, setName: null },
      catalog({
        briefs: [
          { id: "sm8-210", localId: "210", name: "Moltres & Zapdos & Articuno GX" },
          { id: "smp-SM210", localId: "SM210", name: "Moltres & Zapdos & Articuno GX" },
        ],
      }),
    );
    assert.equal(exact.tcgdexId, "sm8-210");

    const ambiguous = await resolveMatch(
      { name: "Moltres & Zapdos & Articuno GX", cardNumber: "210", setCode: null, setName: null },
      catalog({
        briefs: [
          { id: "smp-SM210", localId: "SM210", name: "Moltres & Zapdos & Articuno GX" },
          { id: "svp-SV210", localId: "SV210", name: "Moltres & Zapdos & Articuno GX" },
        ],
      }),
    );
    assert.equal(ambiguous.confidence, "none");
    assert.equal(ambiguous.tcgdexId, null);
    assert.equal(ambiguous.candidates.length, 2);
  });
});
