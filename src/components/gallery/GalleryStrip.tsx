import Link from "next/link";
import { UNCATEGORIZED_WING } from "@/lib/cards";
import { WingIcon } from "./WingIcon";
import styles from "./GalleryStrip.module.css";

export function VaultStrip() {
  return (
    <div className={`${styles.strip} ${styles.vault}`}>
      <div className={styles.left}>
        <div className={`${styles.badge} ${styles.vaultBadge}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <div>
          <div className={styles.title}>Digital Vault</div>
          <div className={styles.sub}>Your NFT cards will live here.</div>
        </div>
      </div>
      <div className={styles.soon}>Coming soon</div>
    </div>
  );
}

export function UncategorizedStrip({ count }: { count: number }) {
  return (
    <Link href={`/my-cards/${UNCATEGORIZED_WING.slug}`} className={`${styles.strip} ${styles.uncat}`}>
      <div className={styles.left}>
        <div className={`${styles.badge} ${styles.uncatBadge}`}>
          <WingIcon slug="uncategorized" size={28} />
        </div>
        <div>
          <div className={styles.title}>Uncategorized</div>
          <div className={styles.sub}>
            {count} {count === 1 ? "card needs" : "cards need"} a wing.
          </div>
        </div>
      </div>
      <span className={styles.go}>
        View
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}
