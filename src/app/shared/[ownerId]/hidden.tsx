import Link from "next/link";
import { AppHeader } from "@/components/gallery/AppHeader";
import styles from "@/components/gallery/shell.module.css";

export function HiddenGallery({
  user,
}: {
  user: { id: string; name: string | null; email: string | null; image: string | null };
}) {
  return (
    <div className={styles.page}>
      <AppHeader user={user} active="/sharing" />
      <main className={`tc-container ${styles.main}`}>
        <header className={styles.hero}>
          <div className={styles.heroText}>
            <div className={styles.eyebrow}>Private gallery</div>
            <h1 className={styles.h1}>This gallery isn&apos;t shared with you</h1>
            <p className={styles.lead}>Ask them to share it, or go back to the galleries you can already see.</p>
            <div className={styles.links}>
              <Link href="/sharing" className={styles.primary}>
                Sharing
              </Link>
              <Link href="/my-cards" className={styles.secondary}>
                My cards
              </Link>
            </div>
          </div>
        </header>
      </main>
    </div>
  );
}
