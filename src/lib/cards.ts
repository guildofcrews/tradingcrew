/* ─────────────────────────────────────────────────────────────
 * Data model + wing config for the My Cards gallery.
 * REAL fields: title, imageUrl, category, createdAt.
 * `id` is assumed (needed for React keys / future card links) —
 * map it to whatever primary key the backend uses.
 * ───────────────────────────────────────────────────────────── */

import type { CardValue } from "@/lib/pokemon-price/display";

export type { CardValue };

export type Category = "pokemon" | "basketball" | "baseball" | "football";

export const CARD_PLACEHOLDER_TITLE = "New card";

export function parseCategory(value: string | null | undefined): Category | null {
  if (value === "pokemon" || value === "basketball" || value === "baseball" || value === "football") {
    return value;
  }
  return null;
}

/** "Fusion Strike · 046/264", the set code when the name is unknown, or just the number. */
export function formatCardPrinting(card: {
  setName?: string | null;
  setCode?: string | null;
  cardNumber?: string | null;
}): string | null {
  const set = tidyPrinting(card.setName) || tidyPrinting(card.setCode);
  const number = tidyPrinting(card.cardNumber);
  if (set && number) return `${set} · ${number}`;
  return set || number;
}

function tidyPrinting(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text || null;
}

export type WingSlug = Category | "uncategorized";

export interface Card {
  id: string;
  title: string;
  imageUrl: string;
  category: Category | null;
  setName?: string | null;
  setCode?: string | null;
  cardNumber?: string | null;
  createdAt: string;
  /** True when the card is locked in an accepted trade. */
  locked?: boolean;
  /** Batch capture is waiting for a quick "looks right". */
  needsReview?: boolean;
  /** Null means this photo has never been sent to the AI reader. */
  recognitionStatus?: "pending" | "running" | "done" | "failed" | null;
  recognitionNote?: string | null;
  /** Pokémon market value from our price cache. Sports cards leave this unset. */
  price?: CardValue | null;
  /** TCGdex high-res scan. Null until a Pokémon match is priced. */
  officialImageUrl?: string | null;
  /** True when the owner wants their photo instead of official art. */
  preferKidPhoto?: boolean;
  /** TCGdex card id. Official art follows this match. */
  tcgdexId?: string | null;
}

export interface Wing {
  slug: WingSlug;
  name: string;
  tagline: string;
  accent: string;
}

export const CATEGORY_WINGS: readonly Wing[] = [
  { slug: "pokemon", name: "Pokémon", tagline: "Trainers & monsters", accent: "var(--tc-wing-pokemon)" },
  { slug: "basketball", name: "Basketball", tagline: "Courtside legends", accent: "var(--tc-wing-basketball)" },
  { slug: "football", name: "Football", tagline: "Gridiron greats", accent: "var(--tc-wing-football)" },
  { slug: "baseball", name: "Baseball", tagline: "Diamond classics", accent: "var(--tc-wing-baseball)" },
];

export const UNCATEGORIZED_WING: Wing = {
  slug: "uncategorized",
  name: "Uncategorized",
  tagline: "Waiting for a wing",
  accent: "var(--tc-wing-uncategorized)",
};

export const ALL_WINGS: readonly Wing[] = [...CATEGORY_WINGS, UNCATEGORIZED_WING];

export const FEATURES = {
  openToTrade: false,
  rarity: false,
  tradeCounts: true,
} as const;

export function toViewCard(card: {
  id: string;
  title: string;
  imageUrl: string;
  category: Category | null;
  setName?: string | null;
  setCode?: string | null;
  cardNumber?: string | null;
  createdAt: Date | string;
  lockedTradeId?: string | null;
  reviewStatus?: "needs_review" | "confirmed" | null;
  recognitionStatus?: "pending" | "running" | "done" | "failed" | null;
  recognitionNote?: string | null;
  officialImageUrl?: string | null;
  preferKidPhoto?: boolean | null;
  tcgdexId?: string | null;
}): Card {
  return {
    id: card.id,
    title: card.title,
    imageUrl: card.imageUrl,
    category: card.category,
    setName: card.setName ?? null,
    setCode: card.setCode ?? null,
    cardNumber: card.cardNumber ?? null,
    createdAt: card.createdAt instanceof Date ? card.createdAt.toISOString() : card.createdAt,
    locked: Boolean(card.lockedTradeId),
    needsReview: card.reviewStatus === "needs_review",
    recognitionStatus: card.recognitionStatus ?? null,
    recognitionNote: card.recognitionNote ?? null,
    officialImageUrl: card.officialImageUrl ?? null,
    preferKidPhoto: card.preferKidPhoto === true,
    tcgdexId: card.tcgdexId ?? null,
  };
}

export function getWing(slug: string): Wing | undefined {
  return ALL_WINGS.find((w) => w.slug === slug);
}

export function wingFor(card: Card): Wing {
  return getWing(card.category ?? "uncategorized") ?? UNCATEGORIZED_WING;
}

export function cardsInWing(cards: Card[], slug: WingSlug): Card[] {
  return slug === "uncategorized"
    ? cards.filter((c) => c.category === null)
    : cards.filter((c) => c.category === slug);
}

export function countByWing(cards: Card[]): Record<WingSlug, number> {
  const counts: Record<WingSlug, number> = {
    pokemon: 0,
    basketball: 0,
    football: 0,
    baseball: 0,
    uncategorized: 0,
  };
  for (const c of cards) counts[c.category ?? "uncategorized"] += 1;
  return counts;
}

export type SortKey = "newest" | "oldest" | "az";

export const SORTS: readonly { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "az", label: "A–Z" },
];

export function parseSort(value: string | undefined): SortKey {
  return value === "oldest" || value === "az" ? value : "newest";
}

export function sortCards(cards: Card[], sort: SortKey): Card[] {
  const copy = [...cards];
  if (sort === "az") return copy.sort((a, b) => a.title.localeCompare(b.title));
  copy.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return sort === "oldest" ? copy.reverse() : copy;
}

export function recentCards(cards: Card[], n = 6): Card[] {
  return sortCards(cards, "newest").slice(0, n);
}

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function formatAdded(iso: string): string {
  return `Added ${dateFmt.format(new Date(iso))}`;
}
