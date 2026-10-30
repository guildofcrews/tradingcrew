import Link from "next/link";
import type { HallCrumb } from "@/lib/library-hall";
import styles from "./HallBreadcrumb.module.css";

export function HallBreadcrumb({ items }: { items: readonly HallCrumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className={styles.crumb}>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className={styles.item}>
              {index > 0 && (
                <span className={styles.sep} aria-hidden="true">
                  ›
                </span>
              )}
              {item.href && !last ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current={last ? "page" : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
