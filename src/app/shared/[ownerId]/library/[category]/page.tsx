import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { LibraryHallScreen, PokemonHallLinks } from "@/components/LibraryHall/LibraryHallScreen";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { db } from "@/db";
import { requireApprovedUser } from "@/lib/auth-utils";
import { cardsInWing, getWing } from "@/lib/cards";
import { loadSharedGallery } from "@/lib/galleries";
import { categoryHallRooms, hallStartFromQuery, libraryCrumbs, libraryPath, withRoomAt } from "@/lib/library-hall";
import { HiddenGallery } from "../../hidden";

interface PageProps {
  params: Promise<{ ownerId: string; category: string }>;
  searchParams: Promise<{ at?: string; z?: string; look?: string; rev?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const wing = getWing((await params).category);
  return { title: wing ? `${wing.name} · Library · TradingCrew` : "Library · TradingCrew" };
}

export default async function SharedCategoryLibraryPage({ params, searchParams }: PageProps) {
  if (!db) return <ServiceUnavailable />;

  const [{ ownerId, category }, query] = await Promise.all([params, searchParams]);
  const wing = getWing(category);
  if (!wing) notFound();

  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") {
      redirect(`/signin?callbackUrl=/shared/${ownerId}/library/${wing.slug}`);
    }
    redirect("/pending");
  }

  const gallery = await loadSharedGallery(user.id, ownerId);
  if (gallery.kind === "self") redirect(`/library/${wing.slug}`);
  if (gallery.kind !== "ok") return <HiddenGallery user={user} />;

  const scope = { ownerId };
  const wingCards = cardsInWing(gallery.cards, wing.slug);

  return (
    <LibraryHallScreen
      user={user}
      active="/sharing"
      crumbs={libraryCrumbs(scope, wing)}
      rooms={categoryHallRooms(wing, wingCards, scope)}
      end={{ kind: "exit", label: "Back to the Library", href: withRoomAt(libraryPath(scope), wing.slug) }}
      entranceLabels={[wing.name, "Library Halls"]}
      {...hallStartFromQuery(query)}
    >
      <PokemonHallLinks scope={scope} slug={wing.slug} />
    </LibraryHallScreen>
  );
}
