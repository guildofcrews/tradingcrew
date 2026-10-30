import { allowlistedImageUrl, parseNftUrl, type NftPlatform } from "./allowlist";
import { draftFromMomentPage, draftFromSorare, type NftDraft, type SorareCardPayload } from "./page";

const USER_AGENT = "TradingCrew/1.0 (display-only kids gallery; no wallet)";
const PAGE_LIMIT = 1_500_000;

export type LookupResult =
  | { ok: true; draft: NftDraft }
  | { ok: false; message: string; platform: NftPlatform | null };

async function readText(url: string, hosts: readonly string[]): Promise<string | null> {
  const response = await fetch(url, {
    headers: { accept: "text/html,application/json", "user-agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  let finalHost: string;
  try {
    finalHost = new URL(response.url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  if (!hosts.includes(finalHost)) return null;
  const length = Number(response.headers.get("content-length") ?? "0");
  if (length > PAGE_LIMIT) return null;
  const text = await response.text();
  return text.length > PAGE_LIMIT ? text.slice(0, PAGE_LIMIT) : text;
}

async function lookupMoment(draftUrl: string, platform: "nba_top_shot" | "nfl_all_day", tokenId: string): Promise<NftDraft | null> {
  const host = platform === "nba_top_shot" ? "nbatopshot.com" : "nflallday.com";
  const html = await readText(draftUrl, [host]);
  if (!html) return null;
  const draft = draftFromMomentPage({ platform, tokenId, sourceUrl: draftUrl, html });
  if (!draft || !allowlistedImageUrl(draft.imageUrl)) return null;
  return draft;
}

async function lookupSorare(slug: string, sourceUrl: string): Promise<NftDraft | null> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    "user-agent": USER_AGENT,
  };
  const apiKey = process.env.SORARE_API_KEY?.trim();
  if (apiKey) headers.APIKEY = apiKey;

  const response = await fetch("https://api.sorare.com/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: `query TradingCrewCard($slug: String!) {
        anyCard(slug: $slug) {
          slug
          sport
          name
          pictureUrl
          rarityTyped
          serialNumber
          supply
          seasonYear
          cardEditionName
          assetId
          anyPlayer { displayName }
        }
      }`,
      variables: { slug },
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { data?: { anyCard?: SorareCardPayload | null } };
  const card = body.data?.anyCard;
  if (!card) return null;
  const draft = draftFromSorare(card, sourceUrl);
  if (!draft || !allowlistedImageUrl(draft.imageUrl)) return null;
  return draft;
}

/**
 * Read public metadata for an allowlisted link. No wallet, no key required.
 * Sorare uses its public GraphQL API. Top Shot and ALL DAY use their public product pages.
 */
export async function lookupNft(rawUrl: string): Promise<LookupResult> {
  const parsed = parseNftUrl(rawUrl);
  if (!parsed.ok) return { ok: false, message: parsed.message, platform: null };

  try {
    const draft =
      parsed.link.platform === "sorare"
        ? await lookupSorare(parsed.link.tokenId, parsed.link.sourceUrl)
        : await lookupMoment(parsed.link.sourceUrl, parsed.link.platform, parsed.link.tokenId);
    if (!draft) {
      return {
        ok: false,
        message: "We couldn't read that page. You can type the card in instead.",
        platform: parsed.link.platform,
      };
    }
    return { ok: true, draft };
  } catch {
    return {
      ok: false,
      message: "We couldn't read that page. You can type the card in instead.",
      platform: parsed.link.platform,
    };
  }
}
