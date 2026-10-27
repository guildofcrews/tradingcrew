/** Leading zeros come off. Letters stay, so "036" is "36" and "tg05" is "TG05". */
export function normalizeLocalId(value: string): string {
  const compact = value.toUpperCase().replace(/\s+/g, "");
  const stripped = compact.replace(/^0+(?=\d)/, "");
  return stripped || "0";
}

/**
 * Digit tail of a promo code such as "SM210" or "SWSH043".
 * Null when the id is already just digits, so "210" does not alias itself.
 */
export function promoNumberTail(localId: string): string | null {
  const compact = normalizeLocalId(localId);
  const match = compact.match(/^[A-Z]+(\d+)$/);
  if (!match?.[1]) return null;
  return normalizeLocalId(match[1]);
}

const NAME_SUFFIXES = ["vmax", "vstar", "gx", "ex", "v"] as const;

/**
 * TCGdex `like` search string. Keeps hyphens and apostrophes (Chi-Yu, Sirfetch'd)
 * and spaces a separated or uppercase suffix so "Blastoise EX" and "Charizard-GX" match.
 * A lowercase ending such as "Toxapex" stays intact.
 */
export function tcgdexNameQuery(value: string): string {
  const straight = value.replace(/[’‘ʼ]/g, "'").replace(/\s+/g, " ").trim();
  const text = straight.toLowerCase();
  const separated = text.match(/^(.*?)[\s_-]+(vmax|vstar|gx|ex|v)$/);
  if (separated?.[1]) return `${separated[1]} ${separated[2]}`.replace(/\s+/g, " ").trim();
  const glued = straight.match(/^(.*?)(VMAX|VSTAR|GX|EX|V)$/);
  if (glued?.[1] && /[a-z0-9]$/i.test(glued[1])) return `${glued[1].toLowerCase()} ${glued[2].toLowerCase()}`;
  return text;
}

/**
 * Case-insensitive exact name. Punctuation becomes a space, and a glued
 * suffix such as "PikachuEX" matches "Pikachu ex". Not a fuzzy match.
 */
export function normalizeName(value: string): string {
  let text = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const suffix of NAME_SUFFIXES) {
    if (text.endsWith(suffix) && !text.endsWith(` ${suffix}`)) {
      const head = text.slice(0, -suffix.length).trim();
      if (head) text = `${head} ${suffix}`;
      break;
    }
  }
  return text;
}

export function splitCollectorNumber(value: string | null | undefined): {
  localId: string | null;
  total: number | null;
} {
  if (!value) return { localId: null, total: null };
  const text = value.replace(/\s+/g, " ").trim();
  const match = text.match(/^([^/]+?)(?:\s*\/\s*(\d+))?$/);
  if (!match) return { localId: null, total: null };
  const localId = normalizeLocalId(match[1] ?? "");
  const total = match[2] ? Number(match[2]) : null;
  return {
    localId: localId || null,
    total: total && Number.isInteger(total) && total > 0 ? total : null,
  };
}

/**
 * Digital-only Pokémon TCG Pocket. Serie `tcgp`, or set ids like A1, A2b, B1, P-A
 * (one letter, then digits). Physical set ids are longer, such as sv08 or swsh8.
 */
export function isPocketSet(setId: string | null | undefined, serieId?: string | null): boolean {
  if (serieId === "tcgp") return true;
  if (!setId) return false;
  return /^(?:P-A|[A-Z]\d+[a-z]*)$/i.test(setId);
}

export function isPocketCard(card: {
  id: string;
  image?: string | null;
  setId?: string | null;
  serieId?: string | null;
}): boolean {
  if (card.image?.includes("/tcgp/")) return true;
  return isPocketSet(card.setId || setIdFromCardId(card.id), card.serieId);
}

/** TCGdex card ids are `{setId}-{localId}`. The set id can itself contain hyphens. */
export function setIdFromCardId(cardId: string): string {
  const dash = cardId.lastIndexOf("-");
  return dash === -1 ? cardId : cardId.slice(0, dash);
}

export type PriceLabel = {
  name: string;
  cardNumber: string | null;
  setCode: string | null;
  setName: string | null;
  category: string | null;
  matchConfidence: "high" | "medium" | "manual" | "none" | null;
};

function codeKey(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, "").toUpperCase();
}

function collectorKey(value: string | null | undefined): string {
  const split = splitCollectorNumber(value);
  return `${split.localId ?? ""}/${split.total ?? ""}`;
}

/** True when a Pokémon label changed, or a Pokémon card has never been matched. */
export function labelsNeedRematch(before: PriceLabel, after: PriceLabel): boolean {
  if (before.category !== "pokemon" && after.category !== "pokemon") return false;
  if (before.category !== after.category) return true;
  const changed =
    normalizeName(before.name) !== normalizeName(after.name) ||
    collectorKey(before.cardNumber) !== collectorKey(after.cardNumber) ||
    codeKey(before.setCode) !== codeKey(after.setCode) ||
    normalizeName(before.setName ?? "") !== normalizeName(after.setName ?? "");
  if (changed) return true;
  return before.matchConfidence == null;
}
