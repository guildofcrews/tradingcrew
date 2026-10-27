export const PRICE_CREDIT = "Prices via TCGdex / TCGplayer";
export const VALUE_UNAVAILABLE = "Value not available";

export type CardValue = {
  headline: string;
  detail: string | null;
  secondary: string | null;
  credit: string | null;
  choices: { id: string; label: string }[];
  selectedVariant: string | null;
  /** Market price behind the headline. Null when the card is not priced. */
  marketUsd: number | null;
  sourceUpdatedAt: string | null;
};

export type StoredVariantPrice = {
  variant: string;
  marketUsd: number | string | null;
  sourceUpdatedAt?: Date | string | null;
};

const VARIANT_LABELS: Record<string, string> = {
  normal: "Normal",
  holofoil: "Holofoil",
  "reverse-holofoil": "Reverse holo",
  "1stEdition": "1st edition",
  "1stEditionHolofoil": "1st edition holo",
  unlimited: "Unlimited",
  unlimitedHolofoil: "Unlimited holo",
};

const VARIANT_RANK = ["normal", "holofoil", "reverse-holofoil"];

export function variantLabel(id: string): string {
  const known = VARIANT_LABELS[id];
  if (known) return known;
  const words = id
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  if (!words) return id;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function asMoney(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function positive(price: StoredVariantPrice): number | null {
  const market = asMoney(price.marketUsd);
  if (market == null || market <= 0) return null;
  return market;
}

function variantRank(id: string): number {
  const index = VARIANT_RANK.indexOf(id);
  return index === -1 ? VARIANT_RANK.length : index;
}

export function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatAsOf(value: Date | string | null | undefined, now = new Date()): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const sameYear = date.getUTCFullYear() === now.getUTCFullYear();
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

function headlineFor(amount: number): string {
  if (amount < 1) return "Under $1";
  return `Approx. value ${formatUsd(amount)}`;
}

function isoStamp(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function usableMarkets(prices: StoredVariantPrice[]) {
  return prices
    .map((price) => ({ price, market: positive(price) }))
    .filter((row): row is { price: StoredVariantPrice; market: number } => row.market != null)
    .sort(
      (a, b) =>
        variantRank(a.price.variant) - variantRank(b.price.variant) ||
        a.price.variant.localeCompare(b.price.variant),
    );
}

export type CollectionTotal = {
  /** Null when nothing is priced, so a total is never shown as $0. */
  headline: string | null;
  /** Shorter label for a wing door. */
  short: string | null;
  /** Oldest price date in the total. */
  asOf: string | null;
  priced: number;
  cards: number;
  amount: number | null;
};

function cents(amount: number): number {
  return Math.round(amount * 100);
}

/** Sum the same market prices the tiles show. Unpriced cards stay in the count only. */
export function collectionTotal(
  entries: readonly { marketUsd: number | null; sourceUpdatedAt?: Date | string | null }[],
  now = new Date(),
): CollectionTotal {
  const priced = entries.filter(
    (entry): entry is { marketUsd: number; sourceUpdatedAt?: Date | string | null } =>
      entry.marketUsd != null && entry.marketUsd > 0,
  );
  const empty: CollectionTotal = {
    headline: null,
    short: null,
    asOf: null,
    priced: 0,
    cards: entries.length,
    amount: null,
  };
  if (priced.length === 0) return empty;

  const amount = priced.reduce((sum, entry) => sum + cents(entry.marketUsd), 0) / 100;
  let oldest: Date | null = null;
  for (const entry of priced) {
    const stamp = isoStamp(entry.sourceUpdatedAt);
    if (!stamp) continue;
    const date = new Date(stamp);
    if (!oldest || date.getTime() < oldest.getTime()) oldest = date;
  }
  const under = amount < 1;
  return {
    headline: under ? "Under $1" : `Approx. collection value ${formatUsd(amount)}`,
    short: under ? "Under $1" : `Approx. ${formatUsd(amount)}`,
    asOf: oldest ? formatAsOf(oldest, now) : null,
    priced: priced.length,
    cards: entries.length,
    amount,
  };
}

export function collectionTotalFromCards(
  cards: readonly { price?: Pick<CardValue, "marketUsd" | "sourceUpdatedAt"> | null }[],
  now = new Date(),
): CollectionTotal {
  return collectionTotal(
    cards.map((card) => ({
      marketUsd: card.price?.marketUsd ?? null,
      sourceUpdatedAt: card.price?.sourceUpdatedAt ?? null,
    })),
    now,
  );
}

/**
 * TCGplayer market price only. Normal, then holofoil, then the first priced
 * variant. The owner's pick wins when that variant has a market price.
 * Missing, zero, and empty caches all say the value isn't available.
 */
export function presentCardValue(
  prices: StoredVariantPrice[],
  preferredVariant: string | null | undefined,
  now = new Date(),
): CardValue {
  const usable = usableMarkets(prices);

  const unavailable: CardValue = {
    headline: VALUE_UNAVAILABLE,
    detail: null,
    secondary: null,
    credit: null,
    choices: usable.map((row) => ({ id: row.price.variant, label: variantLabel(row.price.variant) })),
    selectedVariant: null,
    marketUsd: null,
    sourceUpdatedAt: null,
  };
  if (usable.length === 0) return unavailable;

  const preferred = preferredVariant
    ? usable.find((row) => row.price.variant === preferredVariant)
    : undefined;
  const chosen = preferred ?? usable[0];
  const asOf = formatAsOf(chosen.price.sourceUpdatedAt, now);
  const secondary = usable
    .filter((row) => row.price.variant !== chosen.price.variant)
    .map((row) => `${variantLabel(row.price.variant)}: ${formatUsd(row.market)}`)
    .join(" · ");

  return {
    headline: headlineFor(chosen.market),
    detail: asOf ? `TCGplayer market price as of ${asOf}` : "TCGplayer market price",
    secondary: secondary || null,
    credit: PRICE_CREDIT,
    choices: usable.map((row) => ({ id: row.price.variant, label: variantLabel(row.price.variant) })),
    selectedVariant: chosen.price.variant,
    marketUsd: chosen.market,
    sourceUpdatedAt: isoStamp(chosen.price.sourceUpdatedAt),
  };
}
