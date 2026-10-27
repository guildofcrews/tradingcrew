import { getImageUrl } from "@/lib/images";

/** TCGdex serves the scan at `{image}/high.webp`. WebP is the small high-res file. */
export const IMAGE_CREDIT = "Images via TCGdex";

const ASSET_ORIGIN = "https://assets.tcgdex.net";

export type ArtCard = {
  category?: string | null;
  imageUrl?: string | null;
  officialImageUrl?: string | null;
  preferKidPhoto?: boolean | null;
  tcgdexId?: string | null;
};

/**
 * Turn a TCGdex card `image` base (or an already-sized asset URL) into high.webp.
 * Anything that is not on the TCGdex asset host is rejected.
 */
export function officialArtUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const image = (payload as { image?: unknown }).image;
  if (typeof image !== "string") return null;
  return highWebp(image);
}

export function highWebp(image: string): string | null {
  const trimmed = image.trim();
  if (!trimmed.startsWith(`${ASSET_ORIGIN}/`)) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "assets.tcgdex.net") return null;
  const path = url.pathname.replace(/\/(?:low|high)\.(?:webp|png|jpe?g)$/i, "").replace(/\/+$/, "");
  if (!path || path === "/") return null;
  return `${ASSET_ORIGIN}${path}/high.webp`;
}

/** Official URL we are willing to put in an <img>, or null. */
export function resolvedOfficialUrl(card: ArtCard): string | null {
  if (card.category !== "pokemon" || !card.tcgdexId || !card.officialImageUrl) return null;
  return highWebp(card.officialImageUrl);
}

export function canChooseOfficialArt(card: ArtCard): boolean {
  return resolvedOfficialUrl(card) != null;
}

/** Default is official art. The kid's photo wins only after they opt in. */
export function showingOfficialArt(card: ArtCard): boolean {
  return canChooseOfficialArt(card) && card.preferKidPhoto !== true;
}

/** Price credit, image credit, or both. Null when neither applies. */
export function artCreditLine(priceCredit: string | null | undefined, card: ArtCard): string | null {
  const image = showingOfficialArt(card) ? IMAGE_CREDIT : null;
  if (priceCredit && image) return `${priceCredit} · ${image}`;
  return priceCredit || image;
}

/** URL to render before any load-error fallback. Official art loads directly. */
export function displayImageSrc(card: ArtCard): string {
  const official = showingOfficialArt(card) ? resolvedOfficialUrl(card) : null;
  if (official) return official;
  return card.imageUrl ? getImageUrl(card.imageUrl) : "";
}
