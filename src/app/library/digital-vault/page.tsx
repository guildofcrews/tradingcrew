import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { LibraryHallScreen } from "@/components/LibraryHall/LibraryHallScreen";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { requireApprovedUser } from "@/lib/auth-utils";
import { DIGITAL_VAULT_WING, cardsInWing } from "@/lib/cards";
import { hallStartFromQuery, libraryCrumbs, libraryPath, vaultHallRooms } from "@/lib/library-hall";
import { viewCardsWithPrices } from "@/lib/pokemon-price/attach";
import shell from "@/components/gallery/shell.module.css";

export const metadata: Metadata = { title: "Digital Vault · Library · TradingCrew" };

interface PageProps {
  searchParams: Promise<{ at?: string; z?: string; look?: string; rev?: string; end?: string }>;
}

export default async function DigitalVaultHallPage({ searchParams }: PageProps) {
  if (!db) return <ServiceUnavailable />;

  const query = await searchParams;
  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect("/signin?callbackUrl=/library/digital-vault");
    redirect("/pending");
  }

  const userCards = await db.query.cards.findMany({
    where: eq(cards.ownerId, user.id),
    orderBy: [desc(cards.createdAt)],
  });
  const cardList = await viewCardsWithPrices(userCards);
  const digital = cardsInWing(cardList, "digital-vault");

  return (
    <LibraryHallScreen
      user={user}
      active="/library"
      crumbs={libraryCrumbs({}, DIGITAL_VAULT_WING)}
      rooms={vaultHallRooms(cardList)}
      end={{ kind: "exit", label: "Back to the Library", href: `${libraryPath()}?end=1` }}
      entranceLabels={["Digital Vault", "Library Halls"]}
      {...hallStartFromQuery(query)}
    >
      {digital.length === 0 && (
        <Link href="/my-cards/digital" className={shell.primary}>
          Add a digital card
        </Link>
      )}
    </LibraryHallScreen>
  );
}
