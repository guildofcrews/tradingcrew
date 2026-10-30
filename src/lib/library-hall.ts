import { displayImageSrc } from "@/lib/card-art";
import { galleryHref, groupCardsBySet } from "@/lib/card-sets";
import {
  CATEGORY_WINGS,
  DIGITAL_VAULT_WING,
  UNCATEGORIZED_WING,
  cardsInWing,
  digitalCountLabel,
  sortCards,
  type Card,
  type Wing,
} from "@/lib/cards";
import type { HallEnd, HallRoom, Pose } from "@/lib/halls";
import { collectionTotalFromCards } from "@/lib/pokemon-price/display";

/** Own library, or a friend's library on a shared gallery. */
export interface HallScope {
  ownerId?: string;
}

export interface HallCrumb {
  label: string;
  href?: string;
}

export function libraryPath(scope: HallScope = {}): string {
  return scope.ownerId ? `/shared/${scope.ownerId}/library` : "/library";
}

export function categoryHallPath(scope: HallScope, slug: string): string {
  return `${libraryPath(scope)}/${slug}`;
}

export function wingBasePath(scope: HallScope, slug: string): string {
  return scope.ownerId ? `/shared/${scope.ownerId}/${slug}` : `/my-cards/${slug}`;
}

export function withRoomAt(path: string, roomId?: string): string {
  if (!roomId) return path;
  return `${path}?${new URLSearchParams({ at: roomId }).toString()}`;
}

/** A shared or refreshed hall link: `?z=&look=&rev=1`. Missing `z` means there is no pose. */
export function parseHallPose(query: { z?: string; look?: string; rev?: string }): Pose | undefined {
  if (query.z == null || query.z.trim() === "") return undefined;
  const z = Number(query.z);
  const look = query.look == null || query.look.trim() === "" ? 0 : Number(query.look);
  if (!Number.isFinite(z) || !Number.isFinite(look)) return undefined;
  return { z, look, rev: query.rev === "1" };
}

/** A pose in the URL wins over `?at=`, which still opens a doorway's viewing spot. `?end=1` stands at the far door. */
export function hallStartFromQuery(query: {
  at?: string;
  z?: string;
  look?: string;
  rev?: string;
  end?: string;
}): { initialRoomId?: string; initialPose?: Pose; startAtEnd?: boolean } {
  const pose = parseHallPose(query);
  if (pose) return { initialPose: pose };
  if (query.end === "1") return { startAtEnd: true };
  const at = query.at?.trim();
  return at ? { initialRoomId: at } : {};
}

/**
 * Old `?view=halls` bookmarks land on the category hall.
 * A set id becomes `?at=` so the hall reopens at that doorway.
 * The old numeric door index is not a room id, so it is dropped.
 */
export function legacyHallsRedirect(
  scope: HallScope,
  wing: string,
  query: { view?: string; set?: string; at?: string },
): string | null {
  if (query.view !== "halls") return null;
  const setId = query.set?.trim();
  const at = setId || (query.at && !/^\d+$/.test(query.at) ? query.at : undefined);
  return withRoomAt(categoryHallPath(scope, wing), at);
}

/** Level 3: the existing Room view, filtered to one set, and marked as a hall visit. */
export function setRoomHref(scope: HallScope, slug: string, groupId: string): string {
  return galleryHref(wingBasePath(scope, slug), { set: groupId, display: "room", from: "hall" });
}

export function libraryCrumbs(
  scope: HallScope,
  wing?: Pick<Wing, "slug" | "name">,
  room?: { id: string; name: string },
): HallCrumb[] {
  const home: HallCrumb = { label: "Library" };
  if (!wing) return [home];
  home.href =
    wing.slug === "digital-vault" ? `${libraryPath(scope)}?end=1` : withRoomAt(libraryPath(scope), wing.slug);
  const category: HallCrumb = { label: wing.name };
  if (!room) return [home, category];
  category.href = withRoomAt(categoryHallPath(scope, wing.slug), room.id);
  return [home, category, { label: room.name }];
}

function countLabel(count: number, value: string | null): string {
  const cards = `${count} ${count === 1 ? "card" : "cards"}`;
  return value ? `${cards} · ${value}` : cards;
}

/** Highest priced card when prices exist. Otherwise the newest. */
export function pickFeaturedCard(cards: readonly Card[]): Card | undefined {
  let best: Card | undefined;
  let bestPrice = 0;
  for (const card of cards) {
    const price = card.price?.marketUsd ?? 0;
    if (price > bestPrice) {
      best = card;
      bestPrice = price;
    }
  }
  if (best) return best;
  return [...cards].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.title.localeCompare(b.title))[0];
}

function featuredOf(cards: readonly Card[]): HallRoom["featured"] {
  const card = pickFeaturedCard(cards);
  if (!card) return undefined;
  const imageUrl = displayImageSrc(card);
  if (!imageUrl) return undefined;
  return { title: card.title, imageUrl };
}

function previewsOf(cards: readonly Card[]): string[] {
  return cards.map((card) => displayImageSrc(card)).filter(Boolean).slice(0, 3);
}

const VAULT_COLLECTIONS = [
  { id: "nba_top_shot", name: "NBA Top Shot" },
  { id: "nfl_all_day", name: "NFL ALL DAY" },
  { id: "sorare", name: "Sorare" },
] as const;

export interface VaultCollection {
  id: string;
  name: string;
  cards: Card[];
}

/** Digital cards grouped by official collection, in allowlist order. Sports wings keep their own grouping. */
export function vaultCollections(cards: readonly Card[]): VaultCollection[] {
  const groups = new Map<string, Card[]>();
  for (const card of cardsInWing([...cards], "digital-vault")) {
    const known = VAULT_COLLECTIONS.find((item) => item.id === card.platform);
    const id = known?.id ?? "other";
    const list = groups.get(id) ?? [];
    list.push(card);
    groups.set(id, list);
  }
  const ordered: { id: string; name: string }[] = [
    ...VAULT_COLLECTIONS.filter((item) => groups.has(item.id)),
    ...(groups.has("other") ? [{ id: "other", name: "Other" }] : []),
  ];
  return ordered.map((item) => ({ ...item, cards: groups.get(item.id) ?? [] }));
}

export function findVaultCollection(cards: readonly Card[], id: string | undefined): VaultCollection | null {
  const requested = id?.trim();
  if (!requested) return null;
  return vaultCollections(cards).find((group) => group.id === requested) ?? null;
}

/** Far door of the main hall. Entering it opens the Digital Vault hall. */
export function mainHallVault(scope: HallScope, digitalCount: number): HallEnd {
  return {
    kind: "vault",
    href: categoryHallPath(scope, DIGITAL_VAULT_WING.slug),
    countLabel: digitalCountLabel(digitalCount),
  };
}

/** Level 1 rooms: the four wings, plus Uncategorized when any card has no wing. */
export function mainHallRooms(cards: readonly Card[], scope: HallScope = {}): HallRoom[] {
  const list = [...cards];
  const wings: Wing[] = [...CATEGORY_WINGS];
  if (list.some((card) => card.category === null)) wings.push(UNCATEGORIZED_WING);

  return wings.map((wing) => {
    const inWing = sortCards(cardsInWing(list, wing.slug), "newest");
    return {
      id: wing.slug,
      name: wing.name,
      eyebrow: wing.tagline,
      accent: wing.accent,
      countLabel: countLabel(inWing.length, collectionTotalFromCards(inWing).short),
      href: categoryHallPath(scope, wing.slug),
      previewImageUrls: previewsOf(inWing),
      featured: featuredOf(inWing),
    };
  });
}

/** Digital Vault rooms: one doorway per collection that has a claimed card. */
export function vaultHallRooms(cards: readonly Card[], scope: HallScope = {}): HallRoom[] {
  return vaultCollections(cards).map((group) => ({
    id: group.id,
    name: group.name,
    eyebrow: "Digital Vault",
    accent: DIGITAL_VAULT_WING.accent,
    countLabel: digitalCountLabel(group.cards.length),
    href: galleryHref(wingBasePath(scope, DIGITAL_VAULT_WING.slug), {
      collection: group.id,
      display: "room",
      from: "hall",
    }),
    previewImageUrls: previewsOf(group.cards),
    featured: featuredOf(group.cards),
  }));
}

/**
 * Level 2 rooms. Pokémon and sports both use the set name / set code already
 * stored on the card. There is no team, player, or year field to group by.
 */
export function categoryHallRooms(wing: Wing, cards: readonly Card[], scope: HallScope = {}): HallRoom[] {
  return groupCardsBySet(cards).map((group) => ({
    id: group.id,
    name: group.name,
    eyebrow: wing.name,
    accent: wing.accent,
    countLabel: countLabel(group.cards.length, collectionTotalFromCards(group.cards).short),
    href: setRoomHref(scope, wing.slug, group.id),
    previewImageUrls: previewsOf(group.cards),
    featured: featuredOf(group.cards),
  }));
}
