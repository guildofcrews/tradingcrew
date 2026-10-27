import { isPocketCard, tcgdexNameQuery } from "./normalize";
import type { CatalogBrief, CatalogCard, MatchCatalog } from "./match";

const BASE = "https://api.tcgdex.net/v2/en";
const CONCURRENCY = 3;

type FetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

export type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<FetchResponse>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Retry 5xx and 429 with backoff. A 404 is an empty result, not an outage. */
export async function tcgdexGet(path: string, fetchImpl: FetchLike = fetch, attempt = 0): Promise<unknown> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  let response: FetchResponse;
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(12_000) });
  } catch (error) {
    if (attempt < 2) {
      await sleep(400 * 2 ** attempt);
      return tcgdexGet(path, fetchImpl, attempt + 1);
    }
    throw error;
  }
  if ((response.status === 429 || response.status >= 500) && attempt < 2) {
    await sleep(400 * 2 ** attempt);
    return tcgdexGet(path, fetchImpl, attempt + 1);
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`TCGdex ${response.status} for ${path}`);
  }
  return response.json();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function cardsFromSetPayload(payload: unknown): CatalogCard[] {
  const set = asRecord(payload);
  if (!set) return [];
  const serie = asRecord(set.serie);
  const count = asRecord(set.cardCount);
  const setId = typeof set.id === "string" ? set.id : "";
  const setName = typeof set.name === "string" ? set.name : null;
  const official = typeof count?.official === "number" ? count.official : null;
  const serieId = typeof serie?.id === "string" ? serie.id : null;
  if (!Array.isArray(set.cards)) return [];
  const cards: CatalogCard[] = [];
  for (const item of set.cards) {
    const card = asRecord(item);
    if (!card || typeof card.id !== "string" || typeof card.localId !== "string" || typeof card.name !== "string") {
      continue;
    }
    cards.push({
      id: card.id,
      localId: card.localId,
      name: card.name,
      setId,
      setName,
      officialCount: official,
      serieId,
    });
  }
  return cards;
}

export function cardFromDetailPayload(payload: unknown): CatalogCard | null {
  const card = asRecord(payload);
  if (!card || typeof card.id !== "string" || typeof card.localId !== "string" || typeof card.name !== "string") {
    return null;
  }
  const set = asRecord(card.set);
  const count = asRecord(set?.cardCount);
  const serie = asRecord(set?.serie);
  return {
    id: card.id,
    localId: card.localId,
    name: card.name,
    setId: typeof set?.id === "string" ? set.id : "",
    setName: typeof set?.name === "string" ? set.name : null,
    officialCount: typeof count?.official === "number" ? count.official : null,
    serieId: typeof serie?.id === "string" ? serie.id : null,
  };
}

async function setIdsForCode(code: string, get: (path: string) => Promise<unknown>): Promise<string[]> {
  const payload = await get(`/sets?${new URLSearchParams({ "abbreviation.official": `eq:${code}` })}`);
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((item) => {
    const set = asRecord(item);
    return set && typeof set.id === "string" ? [set.id] : [];
  });
}

export function createTcgdexCatalog(fetchImpl: FetchLike = fetch): MatchCatalog {
  const get = (path: string) => tcgdexGet(path, fetchImpl);
  return {
    async bySetCode(code) {
      const trimmed = code.trim();
      const upper = trimmed.toUpperCase();
      let ids = await setIdsForCode(upper, get);
      if (ids.length === 0 && upper !== trimmed) ids = await setIdsForCode(trimmed, get);
      const cards: CatalogCard[] = [];
      for (const id of ids) {
        cards.push(...cardsFromSetPayload(await get(`/sets/${encodeURIComponent(id)}`)));
      }
      return cards.filter((card) => !isPocketCard(card));
    },
    async byName(name) {
      const query = tcgdexNameQuery(name);
      if (!query) return [];
      const payload = await get(`/cards?${new URLSearchParams({ name: `like:${query}` })}`);
      if (!Array.isArray(payload)) return [];
      const briefs: CatalogBrief[] = [];
      for (const item of payload) {
        const card = asRecord(item);
        if (!card || typeof card.id !== "string" || typeof card.localId !== "string" || typeof card.name !== "string") {
          continue;
        }
        briefs.push({
          id: card.id,
          localId: card.localId,
          name: card.name,
          image: typeof card.image === "string" ? card.image : null,
        });
      }
      return briefs;
    },
    async details(ids) {
      const rows = await mapPool(ids, CONCURRENCY, async (id) =>
        cardFromDetailPayload(await get(`/cards/${encodeURIComponent(id)}`)),
      );
      return rows.filter((row): row is CatalogCard => row != null);
    },
  };
}

export function fetchTcgdexCard(id: string, fetchImpl: FetchLike = fetch): Promise<unknown> {
  return tcgdexGet(`/cards/${encodeURIComponent(id)}`, fetchImpl);
}
