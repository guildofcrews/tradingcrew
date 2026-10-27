export type TcgplayerVariant = {
  variant: string;
  market: number | null;
  low: number | null;
  mid: number | null;
};

export type TcgplayerSnapshot = {
  updated: string | null;
  variants: TcgplayerVariant[];
};

const META_KEYS = new Set(["updated", "unit"]);

function money(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Pull TCGplayer variant rows off a TCGdex card. Null when `pricing.tcgplayer`
 * is missing so callers keep the last cached price. `highPrice` is ignored.
 */
export function readTcgplayerPrices(card: unknown): TcgplayerSnapshot | null {
  if (!card || typeof card !== "object") return null;
  const pricing = (card as { pricing?: unknown }).pricing;
  if (!pricing || typeof pricing !== "object") return null;
  const tcgplayer = (pricing as { tcgplayer?: unknown }).tcgplayer;
  if (!tcgplayer || typeof tcgplayer !== "object") return null;

  const source = tcgplayer as Record<string, unknown>;
  const variants: TcgplayerVariant[] = [];
  for (const [key, value] of Object.entries(source)) {
    if (META_KEYS.has(key) || !value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    if (!("marketPrice" in row) && !("lowPrice" in row) && !("midPrice" in row)) continue;
    variants.push({
      variant: key,
      market: money(row.marketPrice),
      low: money(row.lowPrice),
      mid: money(row.midPrice),
    });
  }

  return {
    updated: typeof source.updated === "string" ? source.updated : null,
    variants,
  };
}
