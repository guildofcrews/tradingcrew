import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireApprovedUser } from "@/lib/auth-utils";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { AppHeader } from "@/components/gallery/AppHeader";
import { ProposeTrade } from "@/components/trades/ProposeTrade";
import { db } from "@/db";
import { loadOwnCards, loadSharedGallery } from "@/lib/galleries";
import { firstName } from "@/lib/presentation";
import styles from "@/components/gallery/shell.module.css";
import { HiddenGallery } from "../hidden";

interface PageProps {
  params: Promise<{ ownerId: string }>;
}

export const metadata: Metadata = { title: "Offer a trade · TradingCrew" };

export default async function ProposePage({ params }: PageProps) {
  if (!db) return <ServiceUnavailable />;

  const { ownerId } = await params;
  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect(`/signin?callbackUrl=/shared/${ownerId}/propose`);
    redirect("/pending");
  }

  const gallery = await loadSharedGallery(user.id, ownerId);
  if (gallery.kind === "self") redirect("/my-cards");
  if (gallery.kind !== "ok") return <HiddenGallery user={user} />;

  const myCards = await loadOwnCards(user.id);

  return (
    <div className={styles.page}>
      <AppHeader user={user} active="/sharing" />
      <main className={`tc-container ${styles.main}`}>
        <ProposeTrade ownerId={ownerId} otherName={firstName(gallery.owner)} myCards={myCards} />
      </main>
    </div>
  );
}
