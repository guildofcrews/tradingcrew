import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { LibraryHallScreen, PokemonHallLinks } from "@/components/LibraryHall/LibraryHallScreen";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { requireApprovedUser } from "@/lib/auth-utils";
import { cardsInWing, getWing } from "@/lib/cards";
import { categoryHallRooms, libraryCrumbs, libraryPath, withRoomAt } from "@/lib/library-hall";
import { viewCardsWithPrices } from "@/lib/pokemon-price/attach";

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ at?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const wing = getWing((await params).category);
  return { title: wing ? `${wing.name} · Library · TradingCrew` : "Library · TradingCrew" };
}

export default async function CategoryLibraryPage({ params, searchParams }: PageProps) {
  if (!db) return <ServiceUnavailable />;

  const [{ category }, { at }] = await Promise.all([params, searchParams]);
  const wing = getWing(category);
  if (!wing) notFound();

  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect(`/signin?callbackUrl=/library/${wing.slug}`);
    redirect("/pending");
  }

  const userCards = await db.query.cards.findMany({
    where: eq(cards.ownerId, user.id),
    orderBy: [desc(cards.createdAt)],
  });
  const cardList = await viewCardsWithPrices(userCards);
  const wingCards = cardsInWing(cardList, wing.slug);

  return (
    <LibraryHallScreen
      user={user}
      active="/library"
      crumbs={libraryCrumbs({}, wing)}
      rooms={categoryHallRooms(wing, wingCards)}
      end={{ kind: "exit", label: "Back to the Library", href: withRoomAt(libraryPath(), wing.slug) }}
      entranceLabels={[wing.name, "Library Halls"]}
      initialRoomId={at?.trim() || undefined}
    >
      <PokemonHallLinks scope={{}} slug={wing.slug} />
    </LibraryHallScreen>
  );
}
