import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireApprovedUser } from "@/lib/auth-utils";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { AppHeader } from "@/components/gallery/AppHeader";
import { StatTile } from "@/components/gallery/StatTile";
import { WingDoor } from "@/components/gallery/WingDoor";
import { UncategorizedStrip } from "@/components/gallery/GalleryStrip";
import { CardSelectGrid } from "@/components/trades/CardSelectGrid";
import { db } from "@/db";
import {
  CATEGORY_WINGS,
  FEATURES,
  cardsInWing,
  countByWing,
  recentCards as getRecentCards,
} from "@/lib/cards";
import { loadSharedGallery } from "@/lib/galleries";
import { collectionTotalFromCards } from "@/lib/pokemon-price/display";
import { CollectionSummary } from "@/components/gallery/CollectionSummary";
import { firstName } from "@/lib/presentation";
import hall from "@/app/my-cards/page.module.css";
import styles from "@/components/gallery/shell.module.css";
import { HiddenGallery } from "./hidden";

interface PageProps {
  params: Promise<{ ownerId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ownerId } = await params;
  const { authorized, user } = await requireApprovedUser();
  if (!authorized || !user) return { title: "Shared gallery · TradingCrew" };
  const gallery = await loadSharedGallery(user.id, ownerId);
  if (gallery.kind !== "ok") return { title: "Shared gallery · TradingCrew" };
  return { title: `${firstName(gallery.owner)}'s Gallery · TradingCrew` };
}

export default async function SharedHallPage({ params }: PageProps) {
  if (!db) return <ServiceUnavailable />;

  const { ownerId } = await params;
  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect(`/signin?callbackUrl=/shared/${ownerId}`);
    redirect("/pending");
  }

  const gallery = await loadSharedGallery(user.id, ownerId);
  if (gallery.kind === "self") redirect("/my-cards");
  if (gallery.kind !== "ok") return <HiddenGallery user={user} />;

  const cardList = gallery.cards;
  const counts = countByWing(cardList);
  const recent = getRecentCards(cardList, 6);
  const name = firstName(gallery.owner);
  const wingsWithCards = CATEGORY_WINGS.filter((wing) => counts[wing.slug] > 0);

  return (
    <div className={hall.page}>
      <AppHeader user={user} active="/sharing" />
      <main>
        <section className={`tc-container ${hall.hero}`}>
          <div className={hall.heroText}>
            <div className={hall.eyebrow}>Shared with you</div>
            <h1 className={hall.h1}>{name}&apos;s Gallery</h1>
            <p className={hall.lead}>
              Open a wing and tap the cards you want. Then pick cards of yours to offer.
            </p>
            <CollectionSummary total={collectionTotalFromCards(cardList)} />
            <div className={styles.links}>
              <Link href="/sharing" className={styles.back}>
                All shared galleries
              </Link>
            </div>
          </div>
          <div className={hall.stats}>
            <StatTile value={cardList.length} label="Cards" />
            {FEATURES.tradeCounts && <StatTile value={gallery.tradesDone} label="Trades done" />}
          </div>
        </section>

        <section aria-label="Gallery wings" className={hall.hall}>
          <div className={`tc-container ${hall.doors}`}>
            {wingsWithCards.map((wing) => {
              const inWing = cardsInWing(cardList, wing.slug);
              return (
                <WingDoor
                  key={wing.slug}
                  wing={wing}
                  count={counts[wing.slug]}
                  value={wing.slug === "pokemon" ? collectionTotalFromCards(inWing).short : null}
                  previews={getRecentCards(inWing, 2)}
                  href={`/shared/${ownerId}/${wing.slug}`}
                />
              );
            })}
          </div>
          {counts.uncategorized > 0 && (
            <div className={`tc-container ${hall.strips}`}>
              <UncategorizedStrip count={counts.uncategorized} href={`/shared/${ownerId}/uncategorized`} />
            </div>
          )}
        </section>

        <section className={`tc-container ${hall.recent}`}>
          <div className={hall.recentHead}>
            <h2 className={hall.h2}>Recently added</h2>
          </div>
          {recent.length > 0 ? (
            <div className={hall.recentGrid}>
              <CardSelectGrid cards={recent} side="want" variant="compact" />
            </div>
          ) : (
            <p className={styles.muted}>This gallery doesn&apos;t have any cards yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}
