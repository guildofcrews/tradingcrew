import { notFound } from "next/navigation";
import Image from "next/image";
import { db } from "@/db";
import { users, cards } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Header } from "@/components/Header";
import { CardGrid } from "@/components/CardGrid";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";

interface UserGalleryPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserGalleryPage({ params }: UserGalleryPageProps) {
  if (!db) {
    return <ServiceUnavailable />;
  }

  const { id } = await params;

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    notFound();
  }

  const userCards = await db.query.cards.findMany({
    where: eq(cards.ownerId, id),
    orderBy: [desc(cards.createdAt)],
  });

  return (
    <div className="min-h-screen bg-[#FFF8EC]">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || "User"}
                width={80}
                height={80}
                className="rounded-full border-4 border-[#F96D3B]"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#5B8BD4] flex items-center justify-center text-white text-2xl font-bold border-4 border-[#F96D3B]">
                {user.name?.[0] || user.email?.[0] || "?"}
              </div>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-[#2B3A67] mb-2">
            {user.name}&apos;s Collection
          </h1>
          <p className="text-[#2B3A67]/70">
            {userCards.length} {userCards.length === 1 ? "card" : "cards"} in collection
          </p>
        </div>

        {userCards.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-[#2B3A67]/10">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-bold text-[#2B3A67] mb-2">
              No cards yet
            </h2>
            <p className="text-[#2B3A67]/70">
              This collection is empty
            </p>
          </div>
        ) : (
          <CardGrid cards={userCards} />
        )}
      </main>
    </div>
  );
}

export async function generateMetadata({ params }: UserGalleryPageProps) {
  if (!db) {
    return { title: "Service Unavailable | TradingCrew" };
  }

  const { id } = await params;

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { name: true },
  });

  if (!user) {
    return { title: "User Not Found | TradingCrew" };
  }

  return {
    title: `${user.name}'s Collection | TradingCrew`,
    description: `Check out ${user.name}'s trading card collection on TradingCrew`,
  };
}
