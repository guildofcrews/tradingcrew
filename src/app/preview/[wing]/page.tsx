import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import {
  cardsInWing,
  getWing,
  parseSort,
  sortCards,
  type Card,
} from "@/lib/cards";
import { SiteHeader } from "@/components/gallery/SiteHeader";
import { SortBar } from "@/components/gallery/SortBar";
import { CardFrame } from "@/components/gallery/CardFrame";
import styles from "../../my-cards/[wing]/page.module.css";

interface PageProps {
  params: Promise<{ wing: string }>;
  searchParams: Promise<{ sort?: string }>;
}

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const wing = getWing((await params).wing);
  return { title: wing ? `${wing.name} Wing · Preview` : "Preview · TradingCrew" };
}

export default async function PreviewWingPage({ params, searchParams }: PageProps) {
  const [{ wing: slug }, { sort: sortParam }] = await Promise.all([params, searchParams]);
  const wing = getWing(slug);
  if (!wing) notFound();

  const sort = parseSort(sortParam);
  const wingCards = sortCards(cardsInWing(SAMPLE_CARDS, wing.slug), sort);
  const basePath = `/preview/${wing.slug}`;
  const title = wing.slug === "uncategorized" ? "Uncategorized" : `The ${wing.name} Wing`;

  return (
    <div className={styles.page}>
      <SiteHeader
        user={{ name: "Demo User", email: "demo@example.com", image: null }}
        active="/my-cards"
      />

      <main className={styles.room} style={{ "--accent": wing.accent } as CSSProperties}>
        <div className={`tc-container ${styles.top}`}>
          <Link href="/preview" className={styles.back}>
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
            </div>
            {wingCards.length > 1 && <SortBar basePath={basePath} active={sort} />}
          </div>
        </div>

        <div className="tc-container">
          {wingCards.length > 0 ? (
            <div className={styles.grid}>
              {wingCards.map((card) => (
                <CardFrame key={card.id} card={card} variant="gallery" />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--tc-text-muted)' }}>
              No cards in this wing
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
