import { parseNftUrl, PLATFORM_LABEL, type NftPlatform, type SportsCategory } from "./allowlist";
import type { NftDraft } from "./page";
import { mentionsPokemon, sanitizeText } from "./sanitize";

export interface ManualDigitalInput {
  platform: string | null;
  category: string | null;
  title: string;
  setName: string;
  serial: string;
  sourceUrl: string;
}

export type ManualDigitalResult =
  | { ok: true; draft: Omit<NftDraft, "imageUrl"> }
  | { ok: false; message: string };

function isPlatform(value: string | null): value is NftPlatform {
  return value === "nba_top_shot" || value === "nfl_all_day" || value === "sorare";
}

function isSport(value: string | null): value is SportsCategory {
  return value === "basketball" || value === "baseball" || value === "football";
}

/** Typed-in fallback. The picture is uploaded separately and never taken from a URL. */
export function manualDigitalDraft(input: ManualDigitalInput): ManualDigitalResult {
  const platform = isPlatform(input.platform) ? input.platform : null;
  const category = isSport(input.category) ? input.category : null;
  const title = sanitizeText(input.title, 80);
  const setName = sanitizeText(input.setName, 80);
  const serial = sanitizeText(input.serial, 32);

  if (!platform || !category || !title || !setName) {
    return { ok: false, message: "Add the collection, the sport, a name, and the series." };
  }
  if (mentionsPokemon(`${title} ${setName} ${serial ?? ""}`)) {
    return { ok: false, message: "Pokémon digital cards aren't official, so they can't be added." };
  }

  let sourceUrl = "";
  let tokenId = "";
  if (input.sourceUrl.trim()) {
    const parsed = parseNftUrl(input.sourceUrl);
    if (!parsed.ok) return { ok: false, message: parsed.message };
    if (parsed.link.platform !== platform) {
      return { ok: false, message: "That link doesn't match the collection you picked." };
    }
    sourceUrl = parsed.link.sourceUrl;
    tokenId = parsed.link.tokenId;
  }

  return {
    ok: true,
    draft: {
      platform,
      collection: PLATFORM_LABEL[platform],
      category,
      title,
      setName,
      serial,
      tokenId,
      sourceUrl,
    },
  };
}
