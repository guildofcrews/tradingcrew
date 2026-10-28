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
import { galleryHref, resolvePokemonBrowse } from "@/lib/card-sets";
import { viewCardsWithPrices } from "@/lib/pokemon-price/attach";
import { collectionTotalFromCards } from "@/lib/pokemon-price/display";
import { CollectionSummary } from "@/components/gallery/CollectionSummary";
import { AppHeader } from "@/components/gallery/AppHeader";
import { SortBar } from "@/components/gallery/SortBar";
import { CardFrame } from "@/components/gallery/CardFrame";
import { EmptyWing } from "@/components/gallery/EmptyGallery";
import { SetDoors, SetDrillIn } from "@/components/gallery/SetDoors";
import { SetViewToggle } from "@/components/gallery/SetViewToggle";
import { ReadUnreadBanner } from "@/components/capture/ReadUnreadBanner";
import { cardNeedsAiRead } from "@/lib/recognition-plan";
import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ wing: string }>;
  searchParams: Promise<{ sort?: string; set?: string; view?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const wing = getWing((await params).wing);
  return { title: wing ? `${wing.name} Wing · TradingCrew` : "My Cards · TradingCrew" };
}

export default async function WingPage({ params, searchParams }: PageProps) {
  if (!db) {
    return <ServiceUnavailable />;
  }

  const [{ wing: slug }, { sort: sortParam, set: setParam, view: viewParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const wing = getWing(slug);
  if (!wing) notFound();

  const { authorized, reason, user } = await requireApprovedUser();

  if (!authorized || !user) {
    if (reason === "not_authenticated") {
      redirect("/signin?callbackUrl=/my-cards");
    }
    redirect("/pending");
  }

  const sort = parseSort(sortParam);

  const userCards = await db.query.cards.findMany({
    where: eq(cards.ownerId, user.id),
    orderBy: [desc(cards.createdAt)],
  });

  const allCards = await viewCardsWithPrices(userCards);

  const wingCards = cardsInWing(allCards, wing.slug);
  const browse =
    wing.slug === "pokemon" ? resolvePokemonBrowse(wingCards, { set: setParam, view: viewParam }) : null;
  const listed = browse
    ? browse.mode === "cards"
      ? sortCards(browse.cards, sort)
      : []
    : sortCards(wingCards, sort);
  const needsReadIds = (browse?.mode === "doors" ? wingCards : listed)
    .filter(cardNeedsAiRead)
    .map((card) => card.id);
  const basePath = `/my-cards/${wing.slug}`;
  const title = wing.slug === "uncategorized" ? "Uncategorized" : `The ${wing.name} Wing`;
  const showSets = browse?.mode === "doors";

  return (
    <div className={styles.page}>
      <AppHeader user={user} active="/my-cards" />

      <main className={styles.room} style={{ "--accent": wing.accent } as CSSProperties}>
        <div className={`tc-container ${styles.top}`}>
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
                  mode={browse.mode === "cards" && !browse.active ? "all" : "sets"}
                  setsHref={basePath}
                  allHref={galleryHref(basePath, { view: "all" }, sort)}
                />
              )}
            </div>
            {listed.length > 1 && (
              <SortBar
                basePath={basePath}
                active={sort}
                includeValue={wing.slug === "pokemon"}
                preserve={browse?.preserve}
              />
            )}
          </div>
          {browse?.active && <SetDrillIn group={browse.active} basePath={basePath} />}
          <ReadUnreadBanner cardIds={needsReadIds} />
        </div>

        <div className="tc-container">
          {wingCards.length === 0 ? (
            <EmptyWing />
          ) : showSets && browse ? (
            <SetDoors groups={browse.groups} wing={wing} basePath={basePath} />
          ) : listed.length > 0 ? (
            <div className={styles.grid}>
              {listed.map((card) => (
                <CardFrame key={card.id} card={card} variant="gallery" />
              ))}
            </div>
          ) : (
            <EmptyWing />
          )}
        </div>
      </main>
    </div>
  );
}
