import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { LibraryHallScreen } from "@/components/LibraryHall/LibraryHallScreen";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { requireApprovedUser } from "@/lib/auth-utils";
import { cardsInWing } from "@/lib/cards";
import { hallStartFromQuery, libraryCrumbs, mainHallRooms, mainHallVault } from "@/lib/library-hall";
import { viewCardsWithPrices } from "@/lib/pokemon-price/attach";

export const metadata: Metadata = { title: "Library · TradingCrew" };

interface PageProps {
  searchParams: Promise<{ at?: string; z?: string; look?: string; rev?: string }>;
}

export default async function LibraryPage({ searchParams }: PageProps) {
  if (!db) return <ServiceUnavailable />;

  const query = await searchParams;
  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect("/signin?callbackUrl=/library");
    redirect("/pending");
  }

  const userCards = await db.query.cards.findMany({
    where: eq(cards.ownerId, user.id),
    orderBy: [desc(cards.createdAt)],
  });
  const cardList = await viewCardsWithPrices(userCards);

  return (
    <LibraryHallScreen
      user={user}
      active="/library"
      crumbs={libraryCrumbs({})}
      rooms={mainHallRooms(cardList)}
      end={mainHallVault({}, cardsInWing(cardList, "digital-vault").length)}
      {...hallStartFromQuery(query)}
    />
  );
}
