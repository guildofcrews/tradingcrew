import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LibraryHallScreen } from "@/components/LibraryHall/LibraryHallScreen";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { db } from "@/db";
import { requireApprovedUser } from "@/lib/auth-utils";
import { loadSharedGallery } from "@/lib/galleries";
import { libraryCrumbs, mainHallRooms } from "@/lib/library-hall";
import { firstName } from "@/lib/presentation";
import { HiddenGallery } from "../hidden";

interface PageProps {
  params: Promise<{ ownerId: string }>;
  searchParams: Promise<{ at?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ownerId } = await params;
  const { authorized, user } = await requireApprovedUser();
  if (!authorized || !user) return { title: "Library · TradingCrew" };
  const gallery = await loadSharedGallery(user.id, ownerId);
  if (gallery.kind !== "ok") return { title: "Library · TradingCrew" };
  return { title: `${firstName(gallery.owner)}'s Library · TradingCrew` };
}

export default async function SharedLibraryPage({ params, searchParams }: PageProps) {
  if (!db) return <ServiceUnavailable />;

  const [{ ownerId }, { at }] = await Promise.all([params, searchParams]);
  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect(`/signin?callbackUrl=/shared/${ownerId}/library`);
    redirect("/pending");
  }

  const gallery = await loadSharedGallery(user.id, ownerId);
  if (gallery.kind === "self") redirect("/library");
  if (gallery.kind !== "ok") return <HiddenGallery user={user} />;

  const scope = { ownerId };
  return (
    <LibraryHallScreen
      user={user}
      active="/sharing"
      crumbs={libraryCrumbs(scope)}
      rooms={mainHallRooms(gallery.cards, scope)}
      end={{ kind: "vault" }}
      initialRoomId={at?.trim() || undefined}
    />
  );
}
