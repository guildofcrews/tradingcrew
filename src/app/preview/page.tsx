import type { Metadata } from "next";
import {
  CATEGORY_WINGS,
  FEATURES,
  countByWing,
  recentCards as getRecentCards,
  type Card,
} from "@/lib/cards";
import { SiteHeader } from "@/components/gallery/SiteHeader";
import { StatTile } from "@/components/gallery/StatTile";
import { WingDoor } from "@/components/gallery/WingDoor";
import { UncategorizedStrip, VaultStrip } from "@/components/gallery/GalleryStrip";
import { CardFrame } from "@/components/gallery/CardFrame";
import styles from "../my-cards/page.module.css";

export const metadata: Metadata = { title: "Preview · TradingCrew" };

const SAMPLE_CARDS: Card[] = [
  {
    id: "1",
    title: "Charizard Holo 1st Edition",
    imageUrl: "https://images.pokemontcg.io/base1/4_hires.png",
    category: "pokemon",
    createdAt: "2026-10-21T10:00:00Z",
  },
  {
    id: "2",
    title: "Pikachu Illustrator",
    imageUrl: "https://images.pokemontcg.io/base1/58_hires.png",
    category: "pokemon",
    createdAt: "2026-10-20T10:00:00Z",
  },
  {
    id: "3",
    title: "Blastoise Holo",
    imageUrl: "https://images.pokemontcg.io/base1/2_hires.png",
    category: "pokemon",
    createdAt: "2026-10-19T10:00:00Z",
  },
  {
    id: "4",
    title: "Michael Jordan Rookie",
    imageUrl: "https://placehold.co/300x420/1a1c2e/f4f1ea?text=MJ+Rookie",
    category: "basketball",
    createdAt: "2026-10-18T10:00:00Z",
  },
  {
    id: "5",
    title: "LeBron James",
    imageUrl: "https://placehold.co/300x420/1a1c2e/f4f1ea?text=LeBron",
    category: "basketball",
    createdAt: "2026-10-17T10:00:00Z",
  },
  {
    id: "6",
    title: "Tom Brady Rookie",
    imageUrl: "https://placehold.co/300x420/1a1c2e/f4f1ea?text=Brady",
    category: "football",
    createdAt: "2026-10-16T10:00:00Z",
  },
  {
    id: "7",
    title: "Babe Ruth 1933",
    imageUrl: "https://placehold.co/300x420/1a1c2e/f4f1ea?text=Babe+Ruth",
    category: "baseball",
    createdAt: "2026-10-15T10:00:00Z",
  },
  {
    id: "8",
    title: "Unknown Card",
    imageUrl: "https://placehold.co/300x420/1a1c2e/f4f1ea?text=Mystery",
    category: null,
    createdAt: "2026-10-14T10:00:00Z",
  },
];

export default function PreviewHallPage() {
  const counts = countByWing(SAMPLE_CARDS);
  const recent = getRecentCards(SAMPLE_CARDS, 6);
  const wingsWithCards = CATEGORY_WINGS.filter((wing) => counts[wing.slug] > 0);

  return (
    <div className={styles.page}>
      <SiteHeader
        user={{ name: "Demo User", email: "demo@example.com", image: null }}
        active="/my-cards"
      />

      <main>
        <section className={`tc-container ${styles.hero}`}>
          <div className={styles.heroText}>
            <div className={styles.eyebrow}>The collection of</div>
            <h1 className={styles.h1}>Demo&apos;s Gallery</h1>
            <p className={styles.lead}>Step through a door to explore each wing.</p>
          </div>
          <div className={styles.stats}>
            <StatTile value={SAMPLE_CARDS.length} label="Cards" />
            {FEATURES.openToTrade && <StatTile value="0" label="Open to trade" />}
            {FEATURES.tradeCounts && <StatTile value="0" label="Trades done" />}
          </div>
        </section>

        <section aria-label="Gallery wings" className={styles.hall}>
          <div className={`tc-container ${styles.doors}`}>
            {wingsWithCards.map((wing) => (
              <WingDoor key={wing.slug} wing={wing} count={counts[wing.slug]} />
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
          <div className={styles.recentGrid}>
            {recent.map((card) => (
              <CardFrame key={card.id} card={card} variant="compact" />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
