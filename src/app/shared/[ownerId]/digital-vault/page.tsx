import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { VaultGallery } from "@/components/gallery/VaultGallery";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { db } from "@/db";
import { requireApprovedUser } from "@/lib/auth-utils";
import { loadSharedGallery } from "@/lib/galleries";
import { firstName } from "@/lib/presentation";
import { HiddenGallery } from "../hidden";

interface PageProps {
  params: Promise<{ ownerId: string }>;
  searchParams: Promise<{ sort?: string; display?: string; collection?: string; from?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ownerId } = await params;
  const { authorized, user } = await requireApprovedUser();
  if (!authorized || !user) return { title: "Digital Vault · TradingCrew" };
  const gallery = await loadSharedGallery(user.id, ownerId);
  if (gallery.kind !== "ok") return { title: "Digital Vault · TradingCrew" };
  return { title: `${firstName(gallery.owner)}'s Digital Vault · TradingCrew` };
}

export default async function SharedDigitalVaultPage({ params, searchParams }: PageProps) {
  if (!db) return <ServiceUnavailable />;

  const [{ ownerId }, query] = await Promise.all([params, searchParams]);
  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect(`/signin?callbackUrl=/shared/${ownerId}/digital-vault`);
    redirect("/pending");
  }

  const gallery = await loadSharedGallery(user.id, ownerId);
  if (gallery.kind === "self") redirect("/my-cards/digital-vault");
  if (gallery.kind !== "ok") return <HiddenGallery user={user} />;

  return (
    <VaultGallery
      user={user}
      cards={gallery.cards}
      scope={{ ownerId }}
      ownerName={firstName(gallery.owner)}
      query={query}
    />
  );
}
