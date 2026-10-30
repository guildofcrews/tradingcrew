import type { Category } from "@/lib/cards";

/** Officially licensed sports collections. Pokémon NFTs are never on this list. */
export const NFT_PLATFORMS = ["nba_top_shot", "nfl_all_day", "sorare"] as const;
export type NftPlatform = (typeof NFT_PLATFORMS)[number];

export type SportsCategory = Exclude<Category, "pokemon">;

export const PLATFORM_LABEL: Record<NftPlatform, string> = {
  nba_top_shot: "NBA Top Shot",
  nfl_all_day: "NFL ALL DAY",
  sorare: "Sorare",
};

export const PLATFORM_CATEGORY: Record<NftPlatform, SportsCategory | null> = {
  nba_top_shot: "basketball",
  nfl_all_day: "football",
  sorare: null,
};

const PAGE_HOSTS: Record<NftPlatform, readonly string[]> = {
  nba_top_shot: ["nbatopshot.com"],
  nfl_all_day: ["nflallday.com"],
  sorare: ["sorare.com"],
};

/** Picture hosts we will fetch and store. Nothing else may become an img src. */
export const IMAGE_HOSTS = [
  "assets.nbatopshot.com",
  "media.nflallday.com",
  "assets.sorare.com",
] as const;

const REJECTED =
  "That link isn't one we can add. Use an NBA Top Shot, NFL ALL DAY, or Sorare page.";
const POKEMON =
  "Pokémon digital cards aren't official, so they can't be added.";

export interface ParsedNftUrl {
  platform: NftPlatform;
  /** Moment id, edition id, or Sorare card slug. */
  tokenId: string;
  sourceUrl: string;
  /** Sorare sport segment, when the link has one. */
  sorareSport: string | null;
}

export type ParseNftUrlResult =
  | { ok: true; link: ParsedNftUrl }
  | { ok: false; message: string };

function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function isImageHost(hostname: string): boolean {
  return (IMAGE_HOSTS as readonly string[]).includes(bareHost(hostname));
}

/** https URL on an allowlisted picture host, with no userinfo. */
export function allowlistedImageUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (!isImageHost(url.hostname)) return null;
  if (/pokemon|pokémon/i.test(url.pathname)) return null;
  return url.toString();
}

function platformForHost(hostname: string): NftPlatform | null {
  const host = bareHost(hostname);
  for (const platform of NFT_PLATFORMS) {
    if (PAGE_HOSTS[platform].includes(host)) return platform;
  }
  return null;
}

/**
 * Turn a pasted marketplace link into a collection and an id.
 * Query strings are dropped. Any other site is rejected.
 */
export function parseNftUrl(raw: string): ParseNftUrlResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, message: "Paste the link to the digital card." };
  if (/pokemon|pokémon/i.test(trimmed)) return { ok: false, message: POKEMON };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, message: REJECTED };
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    return { ok: false, message: REJECTED };
  }

  const platform = platformForHost(url.hostname);
  if (!platform) return { ok: false, message: REJECTED };

  const parts = url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
  const host = bareHost(url.hostname);

  if (platform === "sorare") {
    const cardsAt = parts.indexOf("cards");
    const slug = cardsAt >= 0 ? parts[cardsAt + 1] : null;
    if (!slug || !/^[a-z0-9-]{3,120}$/.test(slug)) return { ok: false, message: REJECTED };
    const sport = cardsAt > 0 ? parts[cardsAt - 1].toLowerCase() : null;
    if (sport && !["football", "nba", "baseball", "mlb"].includes(sport)) {
      return { ok: false, message: "That Sorare sport isn't in the gallery yet." };
    }
    return {
      ok: true,
      link: {
        platform,
        tokenId: slug,
        sourceUrl: `https://${host}/${sport ? `${sport}/` : ""}cards/${slug}`,
        sorareSport: sport,
      },
    };
  }

  const kind = parts[0];
  if (platform === "nfl_all_day" && kind === "listing" && parts[1] === "moment" && /^\d{1,20}$/.test(parts[2] ?? "")) {
    const editionId = parts[2];
    return {
      ok: true,
      link: {
        platform,
        tokenId: editionId,
        sourceUrl: `https://nflallday.com/edition/${editionId}`,
        sorareSport: null,
      },
    };
  }

  const id = parts[1];
  if (!id || !/^\d{1,20}$/.test(id)) return { ok: false, message: REJECTED };

  if (platform === "nba_top_shot" && (kind === "moment" || kind === "edition")) {
    return {
      ok: true,
      link: { platform, tokenId: id, sourceUrl: `https://nbatopshot.com/${kind}/${id}`, sorareSport: null },
    };
  }

  if (platform === "nfl_all_day" && (kind === "edition" || kind === "moment")) {
    return {
      ok: true,
      link: { platform, tokenId: id, sourceUrl: `https://nflallday.com/${kind}/${id}`, sorareSport: null },
    };
  }

  return { ok: false, message: REJECTED };
}

export const NFT_REJECTED_MESSAGE = REJECTED;
export const POKEMON_NFT_MESSAGE = POKEMON;
