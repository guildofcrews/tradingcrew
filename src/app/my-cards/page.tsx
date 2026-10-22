import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Header } from "@/components/Header";
import { CardGrid } from "@/components/CardGrid";
import { UploadCardForm } from "@/components/UploadCardForm";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";

export default async function MyCardsPage() {
  if (!db) {
    return <ServiceUnavailable />;
  }

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/my-cards");
  }

  const userCards = await db.query.cards.findMany({
    where: eq(cards.ownerId, session.user.id),
    orderBy: [desc(cards.createdAt)],
  });

  return (
    <div className="min-h-screen bg-[#FFF8EC]">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#2B3A67] mb-2">
            My Cards
          </h1>
          <p className="text-[#2B3A67]/70">
            Upload and manage your trading card collection
          </p>
        </div>

        <div className="mb-8">
          <UploadCardForm />
        </div>

        {userCards.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-[#2B3A67]/10">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-bold text-[#2B3A67] mb-2">
              No cards yet
            </h2>
            <p className="text-[#2B3A67]/70">
              Upload your first card to start your collection!
            </p>
          </div>
        ) : (
          <CardGrid cards={userCards} showDeleteButton />
        )}
      </main>
    </div>
  );
}
