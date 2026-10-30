import type { NftPlatform, SportsCategory } from "./allowlist";
import { PLATFORM_CATEGORY, PLATFORM_LABEL } from "./allowlist";
import { mentionsPokemon, sanitizeText } from "./sanitize";

export interface NftDraft {
  platform: NftPlatform;
  collection: string;
  category: SportsCategory;
  title: string;
  setName: string;
  serial: string | null;
  tokenId: string;
  sourceUrl: string;
  imageUrl: string;
}

export interface MomentPageInput {
  platform: Exclude<NftPlatform, "sorare">;
  tokenId: string;
  sourceUrl: string;
  html: string;
}

function metaContent(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function editionTag(html: string): string | null {
  const match = html.match(
    /aria-label="Edition tags"[\s\S]{0,1200}?href="\/sets\/\d+[^"]*"[\s\S]{0,800}?>([^<]{1,80})<\/span>/i,
  );
  return sanitizeText(match?.[1], 80);
}

function serialFrom(title: string, description: string): string | null {
  const numbered = title.match(/#\s*([\d,]+)\s*\/\s*([\d,]+)/) ?? description.match(/serial\s*#\s*([\d,]+)\s*of\s*([\d,]+)/i);
  if (numbered) {
    const left = numbered[1].replace(/,/g, "");
    const right = numbered[2].replace(/,/g, "");
    return `#${left}/${right}`;
  }
  const supply = description.match(/([\d,]+)\s+total supply/i);
  if (supply) return `Edition of ${supply[1].replace(/,/g, "")}`;
  return null;
}

function playTitle(ogTitle: string): string | null {
  const withoutSerial = ogTitle.replace(/\s+-\s+.*$/, "").trim();
  return sanitizeText(withoutSerial || ogTitle, 80);
}

function momentImage(platform: Exclude<NftPlatform, "sorare">, tokenId: string, html: string): string | null {
  if (platform === "nba_top_shot") {
    const own = new RegExp(`https://assets\\.nbatopshot\\.com/media/${tokenId}(?:\\?[^"'\\s]*)?`, "i");
    if (own.test(html) || html.includes(`/media/${tokenId}`)) {
      return `https://assets.nbatopshot.com/media/${tokenId}?type=player&format=webp&width=720&quality=85`;
    }
    const any = html.match(/https:\/\/assets\.nbatopshot\.com\/media\/(\d+)\?type=player/i);
    if (!any) return null;
    return `https://assets.nbatopshot.com/media/${any[1]}?type=player&format=webp&width=720&quality=85`;
  }
  const edition = html.match(/https:\/\/media\.nflallday\.com\/editions\/(\d+)\/media\/image/i);
  const id = edition?.[1] ?? (html.includes(`/editions/${tokenId}/`) ? tokenId : null);
  if (!id) return null;
  return `https://media.nflallday.com/editions/${id}/media/image?format=webp&width=720&quality=85`;
}

/** Read a Top Shot or ALL DAY product page. Returns null when the page has no card. */
export function draftFromMomentPage(input: MomentPageInput): NftDraft | null {
  const ogTitle = sanitizeText(metaContent(input.html, "og:title"), 120);
  const description = sanitizeText(metaContent(input.html, "description") ?? metaContent(input.html, "og:description"), 240);
  if (!ogTitle || !description) return null;
  if (/^moment #\d+$/i.test(ogTitle)) return null;
  if (mentionsPokemon(`${ogTitle} ${description}`)) return null;

  const title = playTitle(ogTitle);
  const setName = editionTag(input.html) ?? sanitizeText(ogTitle.split(" - ")[1]?.replace(/#\s*[\d,]+.*/, ""), 40);
  const category = PLATFORM_CATEGORY[input.platform];
  const imageUrl = momentImage(input.platform, input.tokenId, input.html);
  if (!title || !setName || !category || !imageUrl) return null;

  return {
    platform: input.platform,
    collection: PLATFORM_LABEL[input.platform],
    category,
    title,
    setName,
    serial: serialFrom(ogTitle, description),
    tokenId: input.tokenId,
    sourceUrl: input.sourceUrl,
    imageUrl,
  };
}

export interface SorareCardPayload {
  slug?: string | null;
  sport?: string | null;
  name?: string | null;
  pictureUrl?: string | null;
  rarityTyped?: string | null;
  serialNumber?: number | null;
  supply?: number | null;
  seasonYear?: number | null;
  cardEditionName?: string | null;
  assetId?: string | null;
  anyPlayer?: { displayName?: string | null } | null;
}

const SORARE_SPORT: Record<string, SportsCategory> = {
  FOOTBALL: "football",
  BASEBALL: "baseball",
  NBA: "basketball",
};

/** Map a Sorare `anyCard` payload. Soccer shares the Football wing. */
export function draftFromSorare(card: SorareCardPayload, sourceUrl: string): NftDraft | null {
  const sport = card.sport ? SORARE_SPORT[card.sport] : undefined;
  const player = sanitizeText(card.anyPlayer?.displayName, 80);
  const title = player ?? sanitizeText(card.name, 80);
  const edition = sanitizeText(card.cardEditionName, 40);
  const year = card.seasonYear;
  const setName =
    year && edition ? `${year - 1}-${String(year).slice(-2)} · ${edition}` : edition ?? (year ? String(year) : null);
  const imageUrl = card.pictureUrl ?? null;
  const tokenId = sanitizeText(card.assetId, 80) ?? sanitizeText(card.slug, 120);
  if (!sport || !title || !setName || !imageUrl || !tokenId) return null;
  if (mentionsPokemon(`${title} ${setName}`)) return null;
  if (!imageUrl.startsWith("https://assets.sorare.com/")) return null;

  const serial =
    card.serialNumber && card.supply ? `#${card.serialNumber}/${card.supply}` : null;

  return {
    platform: "sorare",
    collection: "Sorare",
    category: sport,
    title,
    setName,
    serial,
    tokenId,
    sourceUrl,
    imageUrl,
  };
}
