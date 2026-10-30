import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { VaultGallery } from "@/components/gallery/VaultGallery";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { requireApprovedUser } from "@/lib/auth-utils";
import { viewCardsWithPrices } from "@/lib/pokemon-price/attach";

export const metadata: Metadata = { title: "Digital Vault · TradingCrew" };

interface PageProps {
  searchParams: Promise<{ sort?: string; display?: string; collection?: string; from?: string }>;
}

export default async function DigitalVaultPage({ searchParams }: PageProps) {
  if (!db) return <ServiceUnavailable />;

  const query = await searchParams;
  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect("/signin?callbackUrl=/my-cards/digital-vault");
    redirect("/pending");
  }

  const userCards = await db.query.cards.findMany({
    where: eq(cards.ownerId, user.id),
    orderBy: [desc(cards.createdAt)],
  });

  return <VaultGallery user={user} cards={await viewCardsWithPrices(userCards)} query={query} />;
}
