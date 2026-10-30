import Link from "next/link";
import { UNCATEGORIZED_WING } from "@/lib/cards";
import { WingIcon } from "./WingIcon";
import styles from "./GalleryStrip.module.css";

export function UncategorizedStrip({
  count,
  href = `/my-cards/${UNCATEGORIZED_WING.slug}`,
}: {
  count: number;
  href?: string;
}) {
  return (
    <Link href={href} className={`${styles.strip} ${styles.uncat}`}>
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
