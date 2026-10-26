import { redirect } from "next/navigation";
import { requireApprovedUser } from "@/lib/auth-utils";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { TradeDraftProvider } from "@/components/trades/TradeDraft";
import { TradeTray } from "@/components/trades/TradeTray";
import { db } from "@/db";
import { loadSharedGallery } from "@/lib/galleries";
import { firstName } from "@/lib/presentation";
import styles from "./layout.module.css";

export default async function SharedGalleryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ ownerId: string }>;
}) {
  const { ownerId } = await params;
  if (!db) return <ServiceUnavailable />;

  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect(`/signin?callbackUrl=/shared/${ownerId}`);
    redirect("/pending");
  }

  const gallery = await loadSharedGallery(user.id, ownerId);
  if (gallery.kind === "self") redirect("/my-cards");
  if (gallery.kind !== "ok") return children;

  return (
    <TradeDraftProvider ownerId={ownerId}>
      <div className={styles.withTray}>
        {children}
        <TradeTray otherName={firstName(gallery.owner)} />
      </div>
    </TradeDraftProvider>
  );
}
