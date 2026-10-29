import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { requireApprovedUser } from "@/lib/auth-utils";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { AppHeader } from "@/components/gallery/AppHeader";
import { DisplayToggle } from "@/components/gallery/DisplayToggle";
import { SharedWingCardView } from "@/components/gallery/SharedWingCardView";
import { SortBar } from "@/components/gallery/SortBar";
import { db } from "@/db";
import { cardsInWing, getWing, parseSort, sortCards } from "@/lib/cards";
import { displayQuery, galleryHref, parseCardDisplay, pokemonViewMode, resolvePokemonBrowse } from "@/lib/card-sets";
import { loadSharedGallery } from "@/lib/galleries";
import { collectionTotalFromCards } from "@/lib/pokemon-price/display";
import { CollectionSummary } from "@/components/gallery/CollectionSummary";
import { SetDoors, SetDrillIn } from "@/components/gallery/SetDoors";
import { LibraryHall } from "@/components/gallery/LibraryHall";
import { SetViewToggle } from "@/components/gallery/SetViewToggle";
import { firstName } from "@/lib/presentation";
import wingStyles from "@/app/my-cards/[wing]/page.module.css";
import shell from "@/components/gallery/shell.module.css";
import { HiddenGallery } from "../hidden";

interface PageProps {
  params: Promise<{ ownerId: string; wing: string }>;
  searchParams: Promise<{ sort?: string; set?: string; view?: string; display?: string; at?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { wing: slug } = await params;
  const wing = getWing(slug);
  return { title: wing ? `${wing.name} Wing · TradingCrew` : "Shared gallery · TradingCrew" };
}

export default async function SharedWingPage({ params, searchParams }: PageProps) {
  if (!db) return <ServiceUnavailable />;

  const [
    { ownerId, wing: slug },
    { sort: sortParam, set: setParam, view: viewParam, display: displayParam, at: atParam },
  ] = await Promise.all([params, searchParams]);
  const wing = getWing(slug);
  if (!wing) notFound();

  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect(`/signin?callbackUrl=/shared/${ownerId}/${slug}`);
    redirect("/pending");
  }

  const gallery = await loadSharedGallery(user.id, ownerId);
  if (gallery.kind === "self") redirect("/my-cards");
  if (gallery.kind !== "ok") return <HiddenGallery user={user} />;

  const sort = parseSort(sortParam);
  const display = parseCardDisplay(displayParam);
  const wingCards = cardsInWing(gallery.cards, wing.slug);
  const browse =
    wing.slug === "pokemon"
      ? resolvePokemonBrowse(wingCards, { set: setParam, view: viewParam, at: atParam })
      : null;
  const listed = browse
    ? browse.mode === "cards"
      ? sortCards(browse.cards, sort)
      : []
    : sortCards(wingCards, sort);
  const basePath = `/shared/${ownerId}/${wing.slug}`;
  const title = wing.slug === "uncategorized" ? "Uncategorized" : `The ${wing.name} Wing`;
  const name = firstName(gallery.owner);
  const showSets = browse?.mode === "doors";
  const showHalls = browse?.mode === "halls";
  const showCards = wingCards.length > 0 && !showSets && !showHalls;
  const hallsHref = galleryHref(basePath, {
    view: "halls",
    ...(browse?.preserve.view === "halls" ? { at: browse.preserve.at } : {}),
  });
  const layoutQuery = {
    ...(browse?.preserve ?? {}),
    ...displayQuery(display),
  };

  return (
    <div className={wingStyles.page}>
      <AppHeader user={user} active="/sharing" />
      <main className={wingStyles.room} style={{ "--accent": wing.accent } as CSSProperties}>
        <div className={`tc-container ${wingStyles.top}`}>
          <Link href={`/shared/${ownerId}`} className={wingStyles.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            {name}&apos;s gallery
          </Link>
          <div className={wingStyles.head}>
            <div className={wingStyles.headText}>
              <div className={wingStyles.eyebrow}>{wing.tagline}</div>
              <h1 className={wingStyles.h1}>{title}</h1>
              <p className={wingStyles.sub}>
                {showHalls
                  ? `Walk the hall, then tap a set from ${name}.`
                  : showSets
                    ? `Pick a set, then tap the cards you want from ${name}.`
                    : `Tap the cards you want from ${name}.`}{" "}
                {wingCards.length} {wingCards.length === 1 ? "card" : "cards"} on display.
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
                  gridHref={galleryHref(basePath, browse?.preserve ?? {}, sort)}
                  carouselHref={galleryHref(basePath, { ...(browse?.preserve ?? {}), display: "carousel" }, sort)}
                  roomHref={galleryHref(basePath, { ...(browse?.preserve ?? {}), display: "room" }, sort)}
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
          {browse?.active && (
            <SetDrillIn
              group={browse.active}
              basePath={basePath}
              backHref={
                browse.preserve.view === "halls"
                  ? galleryHref(basePath, { view: "halls", at: browse.preserve.at })
                  : undefined
              }
              backLabel={browse.preserve.view === "halls" ? "The hall" : undefined}
              backMode={browse.preserve.view === "halls" ? "halls" : undefined}
            />
          )}
        </div>
        <div className="tc-container">
          {wingCards.length === 0 ? (
            <p className={shell.muted} style={{ paddingTop: 48 }}>
              No cards in this wing.
            </p>
          ) : showSets && browse ? (
            <SetDoors groups={browse.groups} wing={wing} basePath={basePath} />
          ) : showHalls && browse ? (
            <LibraryHall
              groups={browse.groups}
              wing={wing}
              basePath={basePath}
              startIndex={Number(browse.preserve.at ?? 0)}
            />
          ) : listed.length > 0 ? (
            <SharedWingCardView cards={listed} display={display} gridClassName={wingStyles.grid} />
          ) : (
            <p className={shell.muted} style={{ paddingTop: 48 }}>
              No cards in this wing.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
