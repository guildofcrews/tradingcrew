import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireApprovedUser } from "@/lib/auth-utils";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { AppHeader } from "@/components/gallery/AppHeader";
import { SharingDesk } from "@/components/sharing/SharingDesk";
import { db } from "@/db";
import { listSharing } from "@/lib/sharing";
import styles from "@/components/gallery/shell.module.css";

export const metadata: Metadata = { title: "Sharing · TradingCrew" };

export default async function SharingPage() {
  if (!db) return <ServiceUnavailable />;

  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect("/signin?callbackUrl=/sharing");
    redirect("/pending");
  }

  const { granted, received } = await listSharing(user.id);

  return (
    <div className={styles.page}>
      <AppHeader user={user} active="/sharing" />
      <main className={`tc-container ${styles.main}`}>
        <header className={styles.hero}>
          <div className={styles.heroText}>
            <div className={styles.eyebrow}>Friends only</div>
            <h1 className={styles.h1}>Sharing</h1>
            <p className={styles.lead}>
              Your cards stay private until you share them. A share goes one way: they can see your gallery, and you see theirs only if they share too.
            </p>
          </div>
        </header>
        <SharingDesk granted={granted} received={received} />
      </main>
    </div>
  );
}
