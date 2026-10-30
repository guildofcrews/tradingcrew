import { notFound } from "next/navigation";
import {
  GalleryHeaderClient,
  GalleryHero,
  CategoryWing,
  NFTBanner,
  CardGridGallery,
} from "@/components/gallery";
import type { Card } from "@/db/schema";

export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const captureDefaults = {
    originalImageUrl: null,
    setName: null,
    setCode: null,
    cardNumber: null,
    officialImageUrl: null,
    officialSetName: null,
    preferKidPhoto: false,
    reviewStatus: null,
    recognitionStatus: null,
    scanStatus: null,
    recognitionConfidence: null,
    recognitionNote: null,
    suggestedTitle: null,
    suggestedCategory: null,
    suggestedSetName: null,
    suggestedSetCode: null,
    suggestedCardNumber: null,
    tcgdexId: null,
    matchConfidence: null,
    priceVariant: null,
    matchCandidates: null,
    recognitionAttempt: 0,
    captureBatchId: null,
    detailsTouched: false,
    kind: "physical" as const,
    collection: null,
    platform: null,
    tokenId: null,
    sourceUrl: null,
    claimStatus: null,
  } satisfies Partial<Card>;

  const mockCards: Card[] = [
    {
      id: "1",
      ownerId: "user1",
      title: "Charizard Holo",
      category: "pokemon",
      imageUrl: "https://picsum.photos/seed/pokemon1/300/400",
      createdAt: new Date(),
      lockedTradeId: null,
      ...captureDefaults,
    },
    {
      id: "2",
      ownerId: "user1",
      title: "Pikachu VMAX",
      category: "pokemon",
      imageUrl: "https://picsum.photos/seed/pokemon2/300/400",
      createdAt: new Date(),
      lockedTradeId: null,
      ...captureDefaults,
    },
    {
      id: "3",
      ownerId: "user1",
      title: "Blastoise",
      category: "pokemon",
      imageUrl: "https://picsum.photos/seed/pokemon3/300/400",
      createdAt: new Date(),
      lockedTradeId: null,
      ...captureDefaults,
    },
    {
      id: "4",
      ownerId: "user1",
      title: "LeBron James Rookie",
      category: "basketball",
      imageUrl: "https://picsum.photos/seed/basketball1/300/400",
      createdAt: new Date(),
      lockedTradeId: null,
      ...captureDefaults,
    },
    {
      id: "5",
      ownerId: "user1",
      title: "Patrick Mahomes",
      category: "football",
      imageUrl: "https://picsum.photos/seed/football1/300/400",
      createdAt: new Date(),
      lockedTradeId: null,
      ...captureDefaults,
    },
    {
      id: "6",
      ownerId: "user1",
      title: "Travis Kelce",
      category: "football",
      imageUrl: "https://picsum.photos/seed/football2/300/400",
      createdAt: new Date(),
      lockedTradeId: null,
      ...captureDefaults,
    },
  ];

  const categorizedCards = {
    pokemon: mockCards.filter((c) => c.category === "pokemon"),
    basketball: mockCards.filter((c) => c.category === "basketball"),
    baseball: mockCards.filter((c) => c.category === "baseball"),
    football: mockCards.filter((c) => c.category === "football"),
    uncategorized: mockCards.filter((c) => !c.category),
  };

  const recentCards = mockCards.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#0f1629]">
      <GalleryHeaderClient
        user={{
          name: "Scott",
          email: "scott@example.com",
          image: null,
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <GalleryHero
          userName="Scott"
          totalCards={mockCards.length}
          categoryBreakdown={{
            pokemon: categorizedCards.pokemon.length,
            basketball: categorizedCards.basketball.length,
            baseball: categorizedCards.baseball.length,
            football: categorizedCards.football.length,
            uncategorized: categorizedCards.uncategorized.length,
          }}
        />

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
      </main>
    </div>
  );
}
