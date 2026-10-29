import { setIdFromCardId } from "@/lib/pokemon-price/normalize";
import type { Card, SortKey } from "@/lib/cards";

export const OTHER_SET_ID = "other";
export const OTHER_SET_NAME = "Other / unknown set";

export interface SetGroup {
  id: string;
  name: string;
  /** Short label above the door. A single set code, "Set", or "Unsorted". */
  eyebrow: string;
  cards: Card[];
}

export type CardDisplay = "grid" | "carousel" | "room";

/** Grid unless the URL explicitly asks for the carousel or the room. */
export function parseCardDisplay(value: string | undefined): CardDisplay {
  if (value === "carousel" || value === "room") return value;
  return "grid";
}

/** Query keys that keep the current layout. Grid omits `display`. */
export function displayQuery(display: CardDisplay): { display?: "carousel" | "room" } {
  if (display === "grid") return {};
  return { display };
}

export type PokemonViewMode = "sets" | "all" | "halls";

export interface PokemonBrowse {
  mode: "doors" | "cards" | "halls";
  groups: SetGroup[];
  /** Set named by `?set=`, when that door exists. */
  active: SetGroup | null;
  /** Cards for the grid. Empty while the doors or the hall are showing. */
  cards: Card[];
  preserve: { set?: string; view?: string; at?: string };
}

/** Which pill is on. A set opened from the hall keeps the hall selected. */
export function pokemonViewMode(browse: Pick<PokemonBrowse, "mode" | "active" | "preserve">): PokemonViewMode {
  if (browse.mode === "halls" || browse.preserve.view === "halls") return "halls";
  if (browse.mode === "cards" && !browse.active) return "all";
  return "sets";
}

function tidy(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text || null;
}

function mostCommon(values: readonly (string | null | undefined)[]): string | null {
  const counts = new Map<string, { label: string; n: number }>();
  for (const raw of values) {
    const label = tidy(raw);
    if (!label) continue;
    const key = label.toLowerCase();
    const current = counts.get(key);
    if (current) current.n += 1;
    else counts.set(key, { label, n: 1 });
  }
  let best: { label: string; n: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.n > best.n || (entry.n === best.n && entry.label.localeCompare(best.label) < 0)) {
      best = entry;
    }
  }
  return best?.label ?? null;
}

function matchedSetId(card: Card): string | null {
  if (!card.tcgdexId) return null;
  const setId = setIdFromCardId(card.tcgdexId).trim();
  return setId || null;
}

function groupId(card: Card): string {
  const setId = matchedSetId(card);
  if (setId) return `m:${setId}`;
  const name = tidy(card.setName);
  if (name) return `n:${name.toLowerCase()}`;
  const code = tidy(card.setCode);
  if (code) return `c:${code.toLowerCase()}`;
  return OTHER_SET_ID;
}

function groupName(id: string, cards: readonly Card[]): string {
  if (id === OTHER_SET_ID) return OTHER_SET_NAME;
  const setId = id.startsWith("m:") ? id.slice(2) : null;
  return (
    mostCommon(cards.map((card) => card.officialSetName)) ||
    mostCommon(cards.map((card) => card.setName)) ||
    mostCommon(cards.map((card) => card.setCode)) ||
    setId ||
    OTHER_SET_NAME
  );
}

function groupEyebrow(id: string, cards: readonly Card[]): string {
  if (id === OTHER_SET_ID) return "Unsorted";
  const codes = new Set(
    cards.flatMap((card) => {
      const code = tidy(card.setCode);
      return code ? [code.toUpperCase()] : [];
    }),
  );
  if (codes.size === 1) return [...codes][0] ?? "Set";
  return "Set";
}

/** One door per set the kid actually owns. Most cards first, then name. */
export function groupCardsBySet(cards: readonly Card[]): SetGroup[] {
  const buckets = new Map<string, Card[]>();
  for (const card of cards) {
    const id = groupId(card);
    const list = buckets.get(id);
    if (list) list.push(card);
    else buckets.set(id, [card]);
  }

  const groups = [...buckets.entries()].map(([id, list]) => ({
    id,
    name: groupName(id, list),
    eyebrow: groupEyebrow(id, list),
    cards: [...list].sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt) || a.title.localeCompare(b.title),
    ),
  }));

  groups.sort((a, b) => b.cards.length - a.cards.length || a.name.localeCompare(b.name));
  return groups;
}

function cleanAt(value: string | undefined): string | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  return String(Number(value));
}

/**
 * Pokémon wing browse state.
 * `?set=` opens that set. `?view=all` is the flat list. `?view=halls` is the corridor.
 * A set id wins over the view so a shared set link stays on that set.
 * `view=halls` is kept beside the set so Back returns to the hall.
 */
export function resolvePokemonBrowse(
  cards: readonly Card[],
  query: { set?: string; view?: string; at?: string },
): PokemonBrowse {
  const groups = groupCardsBySet(cards);
  const requested = query.set?.trim();
  const active = requested ? (groups.find((group) => group.id === requested) ?? null) : null;
  const at = cleanAt(query.at);
  if (active) {
    const fromHalls = query.view === "halls";
    return {
      mode: "cards",
      groups,
      active,
      cards: active.cards,
      preserve: { set: active.id, ...(fromHalls ? { view: "halls" as const, ...(at ? { at } : {}) } : {}) },
    };
  }
  if (query.view === "all") {
    return { mode: "cards", groups, active: null, cards: [...cards], preserve: { view: "all" } };
  }
  if (query.view === "halls") {
    return { mode: "halls", groups, active: null, cards: [], preserve: { view: "halls", ...(at ? { at } : {}) } };
  }
  return { mode: "doors", groups, active: null, cards: [], preserve: {} };
}

/** Keep set/view filters on sort links. Newest omits `sort`. */
export function galleryHref(
  basePath: string,
  query: Record<string, string | undefined>,
  sort: SortKey = "newest",
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  if (sort !== "newest") params.set("sort", sort);
  const text = params.toString();
  return text ? `${basePath}?${text}` : basePath;
}
