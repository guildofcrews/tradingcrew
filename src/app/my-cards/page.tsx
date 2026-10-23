import { redirect } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { requireApprovedUser } from "@/lib/auth-utils";
import {
  GalleryHeaderClient,
  GalleryHero,
  CategoryWing,
  CardGridGallery,
  NFTBanner,
  CategoryFilter,
  CategoryType,
} from "@/components/gallery";
import type { Card } from "@/db/schema";

interface MyCardsPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function MyCardsPage({ searchParams }: MyCardsPageProps) {
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

  const userCards = await db.query.cards.findMany({
    where: eq(cards.ownerId, user.id),
    orderBy: [desc(cards.createdAt)],
  });

  const { category } = await searchParams;

  const categorizedCards = {
    pokemon: userCards.filter((c) => c.category === "pokemon"),
    basketball: userCards.filter((c) => c.category === "basketball"),
    baseball: userCards.filter((c) => c.category === "baseball"),
    football: userCards.filter((c) => c.category === "football"),
    uncategorized: userCards.filter((c) => !c.category),
  };

  const counts = {
    all: userCards.length,
    pokemon: categorizedCards.pokemon.length,
    basketball: categorizedCards.basketball.length,
    baseball: categorizedCards.baseball.length,
    football: categorizedCards.football.length,
    uncategorized: categorizedCards.uncategorized.length,
  };

  const isFiltered = category && category !== "all";
  let filteredCards: Card[] = userCards;

  if (isFiltered) {
    if (category === "uncategorized") {
      filteredCards = categorizedCards.uncategorized;
    } else if (category in categorizedCards) {
      filteredCards = categorizedCards[category as keyof typeof categorizedCards];
    }
  }

  const recentCards = userCards.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#0f1629]">
      <GalleryHeaderClient
        user={{
          name: user.name,
          email: user.email,
          image: user.image,
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <GalleryHero
          userName={user.name || "Collector"}
          totalCards={userCards.length}
          categoryBreakdown={{
            pokemon: categorizedCards.pokemon.length,
            basketball: categorizedCards.basketball.length,
            baseball: categorizedCards.baseball.length,
            football: categorizedCards.football.length,
            uncategorized: categorizedCards.uncategorized.length,
          }}
        />

        {userCards.length === 0 ? (
          <div className="text-center py-16 bg-[#1a1f35] rounded-3xl border border-white/10">
            <div className="text-6xl mb-4">🎴</div>
            <h2 className="text-xl font-bold text-white mb-2">
              Your vault is empty
            </h2>
            <p className="text-white/60">
              Upload your first card to start your collection!
            </p>
          </div>
        ) : isFiltered ? (
          <div className="space-y-8">
            <Suspense fallback={<div className="h-12" />}>
              <CategoryFilter counts={counts} />
            </Suspense>

            <CardGridGallery
              cards={filteredCards}
              title={getCategoryTitle(category)}
              showCategoryBadge={false}
            />
          </div>
        ) : (
          <div className="space-y-16">
            {/* Category Wing Doors with spotlight background */}
            <div className="relative">
              {/* Radial spotlight behind doors */}
              <div
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[400px] pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(30, 40, 70, 0.8) 0%, transparent 70%)",
                }}
              />
              
              {/* Door grid - horizontal row, centered when fewer than 4 */}
              <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 justify-items-center">
                {categorizedCards.pokemon.length > 0 && (
                  <CategoryWing
                    category="pokemon"
                    cards={categorizedCards.pokemon}
                  />
                )}
                {categorizedCards.basketball.length > 0 && (
                  <CategoryWing
                    category="basketball"
                    cards={categorizedCards.basketball}
                  />
                )}
                {categorizedCards.football.length > 0 && (
                  <CategoryWing
                    category="football"
                    cards={categorizedCards.football}
                  />
                )}
                {categorizedCards.baseball.length > 0 && (
                  <CategoryWing
                    category="baseball"
                    cards={categorizedCards.baseball}
                  />
                )}
              </div>
            </div>

            {/* Uncategorized Cards */}
            {categorizedCards.uncategorized.length > 0 && (
              <CardGridGallery
                cards={categorizedCards.uncategorized}
                title="Uncategorized"
                showCategoryBadge={false}
              />
            )}

            {/* Digital Vault Banner */}
            <NFTBanner />

            {/* Recently Added */}
            {recentCards.length > 0 && (
              <CardGridGallery
                cards={recentCards}
                title="Recently added"
                showCategoryBadge
                showViewAll
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function getCategoryTitle(category?: string): string {
  const titles: Record<string, string> = {
    pokemon: "Pokémon Collection",
    basketball: "Basketball Collection",
    baseball: "Baseball Collection",
    football: "Football Collection",
    uncategorized: "Uncategorized Cards",
  };
  return titles[category || ""] || "All Cards";
}
