import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApprovedUser } from "@/lib/auth-utils";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import {
  cardsInWing,
  getWing,
  parseSort,
  sortCards,
} from "@/lib/cards";
import { displayQuery, findSetGroup, galleryHref, parseCardDisplay, pokemonViewMode, resolvePokemonBrowse } from "@/lib/card-sets";
import { categoryHallPath, legacyHallsRedirect, libraryCrumbs, withRoomAt } from "@/lib/library-hall";
import { viewCardsWithPrices } from "@/lib/pokemon-price/attach";
import { collectionTotalFromCards } from "@/lib/pokemon-price/display";
import { CollectionSummary } from "@/components/gallery/CollectionSummary";
import { AppHeader } from "@/components/gallery/AppHeader";
import { SortBar } from "@/components/gallery/SortBar";
import { DisplayToggle } from "@/components/gallery/DisplayToggle";
import { EmptyWing } from "@/components/gallery/EmptyGallery";
import { SetDoors, SetDrillIn } from "@/components/gallery/SetDoors";
import { SetViewToggle } from "@/components/gallery/SetViewToggle";
import { HallBreadcrumb } from "@/components/LibraryHall/HallBreadcrumb";
import { WingCardView } from "@/components/gallery/WingCardView";
import { ReadUnreadBanner } from "@/components/capture/ReadUnreadBanner";
import { cardNeedsAiRead } from "@/lib/recognition-plan";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ wing: string }>;
  searchParams: Promise<{ sort?: string; set?: string; view?: string; display?: string; at?: string; from?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const wing = getWing((await params).wing);
  return { title: wing ? `${wing.name} Wing · TradingCrew` : "My Cards · TradingCrew" };
}

export default async function WingPage({ params, searchParams }: PageProps) {
  if (!db) {
    return <ServiceUnavailable />;
  }

  const [{ wing: slug }, { sort: sortParam, set: setParam, view: viewParam, display: displayParam, at: atParam, from: fromParam }] =
    await Promise.all([params, searchParams]);
  const wing = getWing(slug);
  if (!wing) notFound();

  const hallsRedirect = legacyHallsRedirect({}, slug, { view: viewParam, set: setParam, at: atParam });
  if (hallsRedirect) redirect(hallsRedirect);

  const { authorized, reason, user } = await requireApprovedUser();

  if (!authorized || !user) {
    if (reason === "not_authenticated") {
      redirect("/signin?callbackUrl=/my-cards");
    }
    redirect("/pending");
  }

  const sort = parseSort(sortParam);
  const display = parseCardDisplay(displayParam);

  const userCards = await db.query.cards.findMany({
    where: eq(cards.ownerId, user.id),
    orderBy: [desc(cards.createdAt)],
  });

  const allCards = await viewCardsWithPrices(userCards);

  const wingCards = cardsInWing(allCards, wing.slug);
  const browse =
    wing.slug === "pokemon"
      ? resolvePokemonBrowse(wingCards, { set: setParam, view: viewParam, at: atParam, from: fromParam })
      : null;
  const sportGroup = wing.slug === "pokemon" ? null : findSetGroup(wingCards, setParam);
  const fromHall = browse?.preserve.from === "hall" || (fromParam === "hall" && Boolean(sportGroup));
  const drilled = browse?.active ?? sportGroup;
  const listed = browse
    ? browse.mode === "cards"
      ? sortCards(browse.cards, sort)
      : []
    : sortCards(sportGroup?.cards ?? wingCards, sort);
  const needsReadIds = (browse && browse.mode !== "cards" ? wingCards : listed)
    .filter(cardNeedsAiRead)
    .map((card) => card.id);
  const basePath = `/my-cards/${wing.slug}`;
  const title = wing.slug === "uncategorized" ? "Uncategorized" : `The ${wing.name} Wing`;
  const showSets = browse?.mode === "doors";
  const showCards = wingCards.length > 0 && !showSets;
  const hallsHref = withRoomAt(categoryHallPath({}, wing.slug), drilled?.id);
  const cardQuery = {
    ...(browse?.preserve ?? {}),
    ...(sportGroup ? { set: sportGroup.id, ...(fromHall ? { from: "hall" } : {}) } : {}),
  };
  const layoutQuery = {
    ...cardQuery,
    ...displayQuery(display),
  };

  return (
    <div className={styles.page}>
      <AppHeader user={user} active="/my-cards" />

      <main className={styles.room} style={{ "--accent": wing.accent } as CSSProperties}>
        <div className={`tc-container ${styles.top}`}>
          {fromHall && drilled && <HallBreadcrumb items={libraryCrumbs({}, wing, { id: drilled.id, name: drilled.name })} />}
          <Link href="/my-cards" className={styles.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            All wings
          </Link>

          <div className={styles.head}>
            <div className={styles.headText}>
              <div className={styles.eyebrow}>{wing.tagline}</div>
              <h1 className={styles.h1}>{title}</h1>
              <p className={styles.sub}>
                {wingCards.length} {wingCards.length === 1 ? "card" : "cards"} on display
              </p>
              {wing.slug === "pokemon" && <CollectionSummary total={collectionTotalFromCards(wingCards)} />}
              {browse && wingCards.length > 0 && (
                <SetViewToggle
                  mode={pokemonViewMode(browse)}
                  setsHref={basePath}
                  allHref={galleryHref(basePath, { view: "all", ...displayQuery(display) }, sort)}
                  hallsHref={hallsHref}
                />
              )}
              {showCards && (
                <DisplayToggle
                  display={display}
                  gridHref={galleryHref(basePath, cardQuery, sort)}
                  carouselHref={galleryHref(basePath, { ...cardQuery, display: "carousel" }, sort)}
                  roomHref={galleryHref(basePath, { ...cardQuery, display: "room" }, sort)}
                />
              )}
            </div>
            {listed.length > 1 && (
              <SortBar
                basePath={basePath}
                active={sort}
                includeValue={wing.slug === "pokemon"}
                preserve={layoutQuery}
              />
            )}
          </div>
          {drilled && (
            <SetDrillIn
              group={drilled}
              basePath={basePath}
              backHref={fromHall ? withRoomAt(categoryHallPath({}, wing.slug), drilled.id) : undefined}
              backLabel={fromHall ? "The hall" : undefined}
              backMode={fromHall ? "halls" : undefined}
            />
          )}
          <ReadUnreadBanner cardIds={needsReadIds} />
        </div>

        <div className="tc-container">
          {wingCards.length === 0 ? (
            <EmptyWing />
          ) : showSets && browse ? (
            <SetDoors groups={browse.groups} wing={wing} basePath={basePath} />
          ) : listed.length > 0 ? (
            <WingCardView cards={listed} display={display} gridClassName={styles.grid} />
          ) : (
            <EmptyWing />
          )}
        </div>
      </main>
    </div>
  );
}
