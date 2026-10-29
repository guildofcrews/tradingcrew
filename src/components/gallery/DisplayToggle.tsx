"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CardDisplay } from "@/lib/card-sets";
import styles from "./SetViewToggle.module.css";

const DISPLAY_KEY = "tradingcrew.card-display";

function rememberDisplay(display: CardDisplay) {
  try {
    localStorage.setItem(DISPLAY_KEY, display);
  } catch {
    // Private browsing can block storage. The URL still holds this visit.
  }
}

/** Grid | Carousel. The URL wins; a saved carousel choice applies when the URL is silent. */
export function DisplayToggle({
  display,
  gridHref,
  carouselHref,
}: {
  display: CardDisplay;
  gridHref: string;
  carouselHref: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("display")) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(DISPLAY_KEY);
    } catch {
      return;
    }
    if (saved !== "carousel") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("display", "carousel");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return (
    <nav aria-label="Card layout" className={styles.bar}>
      <Link
        href={gridHref}
        scroll={false}
        aria-current={display === "grid" ? "true" : undefined}
        className={display === "grid" ? styles.active : styles.pill}
        onClick={() => rememberDisplay("grid")}
      >
        Grid
      </Link>
      <Link
        href={carouselHref}
        scroll={false}
        aria-current={display === "carousel" ? "true" : undefined}
        className={display === "carousel" ? styles.active : styles.pill}
        onClick={() => rememberDisplay("carousel")}
      >
        Carousel
      </Link>
    </nav>
  );
}
