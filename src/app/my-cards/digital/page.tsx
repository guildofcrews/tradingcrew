import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DigitalCardForm } from "@/components/digital/DigitalCardForm";
import { AppHeader } from "@/components/gallery/AppHeader";
import styles from "@/components/gallery/shell.module.css";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { db } from "@/db";
import { requireApprovedUser } from "@/lib/auth-utils";

export const metadata: Metadata = { title: "Add a digital card · TradingCrew" };

export default async function DigitalCardPage() {
  if (!db) return <ServiceUnavailable />;

  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect("/signin?callbackUrl=/my-cards/digital");
    redirect("/pending");
  }

  return (
    <div className={styles.page}>
      <AppHeader user={user} active="/my-cards" />
      <main className={`tc-container ${styles.main}`}>
        <header className={styles.heroText}>
          <div className={styles.eyebrow}>Sports only</div>
          <h1 className={styles.h1}>Add a digital card</h1>
          <p className={styles.lead}>
            Paste the page for an NBA Top Shot moment, an NFL ALL DAY moment, or a Sorare card. TradingCrew doesn&apos;t
            connect a wallet, take payment, or move the card. It shows up as claimed, not verified.
          </p>
        </header>
        <DigitalCardForm />
      </main>
    </div>
  );
}
