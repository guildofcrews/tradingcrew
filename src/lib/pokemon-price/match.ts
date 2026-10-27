import {
  isPocketCard,
  normalizeLocalId,
  normalizeName,
  promoNumberTail,
  splitCollectorNumber,
} from "./normalize";

export type MatchInput = {
  name: string;
  cardNumber: string | null;
  setCode: string | null;
  setName: string | null;
};

export type CatalogBrief = {
  id: string;
  localId: string;
  name: string;
  setName?: string | null;
  image?: string | null;
};

export type CatalogCard = CatalogBrief & {
  setId: string;
  setName: string | null;
  officialCount: number | null;
  serieId: string | null;
};

export type MatchCatalog = {
  bySetCode: (code: string) => Promise<CatalogCard[]>;
  byName: (name: string) => Promise<CatalogBrief[]>;
  details: (ids: string[]) => Promise<CatalogCard[]>;
};

export type StoredCandidate = {
  id: string;
  name: string;
  localId: string;
  setName: string | null;
};

export type MatchOutcome = {
  confidence: "high" | "medium" | "none";
  tcgdexId: string | null;
  candidates: StoredCandidate[];
};

type Working = StoredCandidate & { officialCount: number | null };

const NONE: MatchOutcome = { confidence: "none", tcgdexId: null, candidates: [] };

function uniqueById(cards: Working[]): Working[] {
  const seen = new Set<string>();
  const unique: Working[] = [];
  for (const card of cards) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    unique.push(card);
  }
  return unique;
}

function stored(cards: Working[]): StoredCandidate[] {
  return cards.slice(0, 12).map(({ id, name, localId, setName }) => ({ id, name, localId, setName }));
}

/**
 * Match a Pokémon card to exactly one TCGdex id.
 * Name + number (leading zeros stripped) is the key. Printed set code wins
 * when it finds one card. Printed total, then set name, only break ties.
 * Zero or several remaining cards is not a match.
 */
export async function resolveMatch(input: MatchInput, catalog: MatchCatalog): Promise<MatchOutcome> {
  const name = input.name?.trim() ?? "";
  const { localId, total } = splitCollectorNumber(input.cardNumber);
  if (!name || !localId) return NONE;
  const wantedName = normalizeName(name);

  const code = input.setCode?.replace(/\s+/g, "").trim();
  if (code) {
    const inSet = await catalog.bySetCode(code);
    const hits = inSet.filter(
      (card) =>
        !isPocketCard(card) &&
        normalizeName(card.name) === wantedName &&
        normalizeLocalId(card.localId) === localId,
    );
    if (hits.length === 1) {
      return { confidence: "high", tcgdexId: hits[0].id, candidates: [] };
    }
  }

  const briefs = await catalog.byName(name);
  const named = briefs.filter((card) => normalizeName(card.name) === wantedName && !isPocketCard(card));
  const toWorking = (card: CatalogBrief): Working => ({
    id: card.id,
    name: card.name,
    localId: card.localId,
    setName: card.setName ?? null,
    officialCount: null,
  });
  // Exact number first. "210" must not lose to promo "SM210" when both exist.
  let working = uniqueById(
    named.filter((card) => normalizeLocalId(card.localId) === localId).map(toWorking),
  );
  if (working.length === 0 && /^\d+$/.test(localId)) {
    working = uniqueById(
      named.filter((card) => promoNumberTail(card.localId) === localId).map(toWorking),
    );
  }

  const setName = input.setName?.trim() ?? "";
  if (working.length > 1 && (total != null || setName)) {
    const details = await catalog.details(working.map((card) => card.id));
    const byId = new Map(details.map((card) => [card.id, card]));
    working = working
      .filter((card) => {
        const detail = byId.get(card.id);
        return !detail || !isPocketCard(detail);
      })
      .map((card) => {
        const detail = byId.get(card.id);
        return {
          ...card,
          setName: detail?.setName ?? card.setName,
          officialCount: detail?.officialCount ?? null,
        };
      });

    if (working.length > 1 && total != null) {
      const kept = working.filter((card) => card.officialCount === total);
      if (kept.length === 0) {
        return { confidence: "none", tcgdexId: null, candidates: stored(working) };
      }
      working = kept;
    }
    if (working.length > 1 && setName) {
      const wantedSet = normalizeName(setName);
      const preferred = working.filter((card) => card.setName && normalizeName(card.setName) === wantedSet);
      if (preferred.length > 0) working = preferred;
    }
  }

  if (working.length === 1) {
    return { confidence: "medium", tcgdexId: working[0].id, candidates: [] };
  }
  return { confidence: "none", tcgdexId: null, candidates: stored(working) };
}
