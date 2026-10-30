import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LibraryHallScreen } from "@/components/LibraryHall/LibraryHallScreen";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { db } from "@/db";
import { requireApprovedUser } from "@/lib/auth-utils";
import { DIGITAL_VAULT_WING } from "@/lib/cards";
import { loadSharedGallery } from "@/lib/galleries";
import { hallStartFromQuery, libraryCrumbs, libraryPath, vaultHallRooms } from "@/lib/library-hall";
import { firstName } from "@/lib/presentation";
import { HiddenGallery } from "../../hidden";

interface PageProps {
  params: Promise<{ ownerId: string }>;
  searchParams: Promise<{ at?: string; z?: string; look?: string; rev?: string; end?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ownerId } = await params;
  const { authorized, user } = await requireApprovedUser();
  if (!authorized || !user) return { title: "Digital Vault · Library · TradingCrew" };
  const gallery = await loadSharedGallery(user.id, ownerId);
  if (gallery.kind !== "ok") return { title: "Digital Vault · Library · TradingCrew" };
  return { title: `${firstName(gallery.owner)}'s Digital Vault · Library · TradingCrew` };
}

export default async function SharedDigitalVaultHallPage({ params, searchParams }: PageProps) {
  if (!db) return <ServiceUnavailable />;

  const [{ ownerId }, query] = await Promise.all([params, searchParams]);
  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect(`/signin?callbackUrl=/shared/${ownerId}/library/digital-vault`);
    redirect("/pending");
  }

  const gallery = await loadSharedGallery(user.id, ownerId);
  if (gallery.kind === "self") redirect("/library/digital-vault");
  if (gallery.kind !== "ok") return <HiddenGallery user={user} />;

  const scope = { ownerId };
  return (
    <LibraryHallScreen
      user={user}
      active="/sharing"
      crumbs={libraryCrumbs(scope, DIGITAL_VAULT_WING)}
      rooms={vaultHallRooms(gallery.cards, scope)}
      end={{ kind: "exit", label: "Back to the Library", href: `${libraryPath(scope)}?end=1` }}
      entranceLabels={["Digital Vault", "Library Halls"]}
      {...hallStartFromQuery(query)}
    />
  );
}