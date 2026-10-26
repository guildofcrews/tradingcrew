import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireApprovedUser } from "@/lib/auth-utils";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import {
  CATEGORY_WINGS,
  FEATURES,
  cardsInWing,
  countByWing,
  recentCards as getRecentCards,
  toViewCard,
} from "@/lib/cards";
import { countCompletedTrades } from "@/lib/galleries";
import { AppHeader } from "@/components/gallery/AppHeader";
import { StatTile } from "@/components/gallery/StatTile";
import { WingDoor } from "@/components/gallery/WingDoor";
import { UncategorizedStrip, VaultStrip } from "@/components/gallery/GalleryStrip";
import { CardFrame } from "@/components/gallery/CardFrame";
import { EmptyGallery } from "@/components/gallery/EmptyGallery";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "My Cards · TradingCrew" };

export default async function MyCardsHallPage() {
  if (!db) {
    return <ServiceUnavailable />;
  }

  const { authorized, reason, user } = await requireApprovedUser();

  if (!authorized || !user) {
    if (reason === "not_authenticated") {
      redirect("/signin?callbackUrl=/my-cards");
    }
    redirect("/pending");
  }

  const [userCards, tradesDone] = await Promise.all([
    db.query.cards.findMany({
      where: eq(cards.ownerId, user.id),
      orderBy: [desc(cards.createdAt)],
    }),
    countCompletedTrades(user.id),
  ]);

  const cardList = userCards.map(toViewCard);

  const counts = countByWing(cardList);
  const recent = getRecentCards(cardList, 6);
  const firstName = (user.name || "Collector").split(" ")[0];
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const wingsWithCards = CATEGORY_WINGS.filter((wing) => counts[wing.slug] > 0);
  const needsReview = cardList.filter((card) => card.needsReview).length;

  return (
    <div className={styles.page}>
      <AppHeader user={user} active="/my-cards" />

      <main>
        <section className={`tc-container ${styles.hero}`}>
          <div className={styles.heroText}>
            <div className={styles.eyebrow}>The collection of</div>
            <h1 className={styles.h1}>{capitalizedName}&apos;s Gallery</h1>
            <p className={styles.lead}>Step through a door to explore each wing.</p>
            {needsReview > 0 && (
              <Link href="/my-cards/review" className={styles.reviewBanner}>
                {needsReview === 1 ? "1 new card to check" : `${needsReview} new cards to check`}
              </Link>
            )}
          </div>
          <div className={styles.stats}>
            <StatTile value={cardList.length} label="Cards" />
            {FEATURES.openToTrade && <StatTile value="0" label="Open to trade" />}
            {FEATURES.tradeCounts && <StatTile value={tradesDone} label="Trades done" />}
          </div>
        </section>

        <section aria-label="Gallery wings" className={styles.hall}>
          <div className={`tc-container ${styles.doors}`}>
            {wingsWithCards.map((wing) => (
              <WingDoor
                key={wing.slug}
                wing={wing}
                count={counts[wing.slug]}
                previews={getRecentCards(cardsInWing(cardList, wing.slug), 2)}
              />
            ))}
          </div>

          <div className={`tc-container ${styles.strips}`}>
            {counts.uncategorized > 0 && <UncategorizedStrip count={counts.uncategorized} />}
            <VaultStrip />
          </div>
        </section>

        <section className={`tc-container ${styles.recent}`}>
          <div className={styles.recentHead}>
            <h2 className={styles.h2}>Recently added</h2>
          </div>
          {recent.length > 0 ? (
            <div className={styles.recentGrid}>
              {recent.map((card) => (
                <CardFrame key={card.id} card={card} variant="compact" />
              ))}
            </div>
          ) : (
            <EmptyGallery />
          )}
        </section>
      </main>
    </div>
  );
}
