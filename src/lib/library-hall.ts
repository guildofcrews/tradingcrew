import { displayImageSrc } from "@/lib/card-art";
import { galleryHref, groupCardsBySet } from "@/lib/card-sets";
import {
  CATEGORY_WINGS,
  UNCATEGORIZED_WING,
  cardsInWing,
  sortCards,
  type Card,
  type Wing,
} from "@/lib/cards";
import type { HallRoom, Pose } from "@/lib/halls";
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

/** A pose in the URL wins over `?at=`, which still opens a doorway's viewing spot. */
export function hallStartFromQuery(query: {
  at?: string;
  z?: string;
  look?: string;
  rev?: string;
}): { initialRoomId?: string; initialPose?: Pose } {
  const pose = parseHallPose(query);
  if (pose) return { initialPose: pose };
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
  home.href = withRoomAt(libraryPath(scope), wing.slug);
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

/** Level 1 rooms: the four wings, plus Uncategorized when any card has no wing. */
export function mainHallRooms(cards: readonly Card[], scope: HallScope = {}): HallRoom[] {
  const list = [...cards];
  const wings = [...CATEGORY_WINGS];
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
