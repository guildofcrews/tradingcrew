import Link from "next/link";
import { FEATURES, SORTS, type SortKey } from "@/lib/cards";
import styles from "./SortBar.module.css";

export function SortBar({ basePath, active }: { basePath: string; active: SortKey }) {
  return (
    <nav aria-label="Sort cards" className={styles.bar}>
      {SORTS.map((s) => (
        <Link
          key={s.key}
          href={s.key === "newest" ? basePath : `${basePath}?sort=${s.key}`}
          className={s.key === active ? styles.active : styles.pill}
          aria-current={s.key === active ? "true" : undefined}
          scroll={false}
        >
          {s.label}
        </Link>
      ))}
      {FEATURES.rarity && <span className={`${styles.pill} ${styles.disabled}`}>Rarest</span>}
      {FEATURES.openToTrade && <span className={`${styles.pill} ${styles.disabled}`}>Open to trade</span>}
    </nav>
  );
}
