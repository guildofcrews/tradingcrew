import Link from "next/link";
import { FEATURES, SORTS, type SortKey } from "@/lib/cards";
import styles from "./SortBar.module.css";

export function SortBar({
  basePath,
  active,
  includeValue = false,
  preserve,
}: {
  basePath: string;
  active: SortKey;
  includeValue?: boolean;
  /** Query keys that must survive a sort change, such as `set` or `view`. */
  preserve?: Record<string, string | undefined>;
}) {
  const sorts = includeValue ? [...SORTS, { key: "value" as const, label: "Most valuable" }] : SORTS;

  function hrefFor(key: SortKey): string {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(preserve ?? {})) {
      if (value) params.set(name, value);
    }
    if (key !== "newest") params.set("sort", key);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <nav aria-label="Sort cards" className={styles.bar}>
      {sorts.map((s) => (
        <Link
          key={s.key}
          href={hrefFor(s.key)}
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
