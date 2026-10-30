"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./SetViewToggle.module.css";

const VIEW_KEY = "tradingcrew.pokemon-view";

function rememberPokemonView(mode: "sets" | "all" | "halls") {
  try {
    localStorage.setItem(VIEW_KEY, mode);
  } catch {
    // Private browsing can block storage. The URL still holds this visit.
  }
}

export function PokemonViewLink({
  href,
  mode,
  className,
  children,
  current = false,
}: {
  href: string;
  mode: "sets" | "all" | "halls";
  className?: string;
  children: React.ReactNode;
  current?: boolean;
}) {
  return (
    <Link
      href={href}
      className={className}
      scroll={false}
      aria-current={current ? "true" : undefined}
      onClick={() => rememberPokemonView(mode)}
    >
      {children}
    </Link>
  );
}

/** By set | All cards | Library Halls. The URL wins; a saved choice applies when the URL is silent. */
export function SetViewToggle({
  mode,
  setsHref,
  allHref,
  hallsHref,
  restoreSaved = true,
}: {
  mode: "sets" | "all" | "halls";
  setsHref: string;
  allHref: string;
  hallsHref: string;
  /** The category hall passes false so a saved "all" does not rewrite its URL. */
  restoreSaved?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!restoreSaved) return;
    if (searchParams.get("view") || searchParams.get("set")) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(VIEW_KEY);
    } catch {
      return;
    }
    if (saved === "halls") {
      router.replace(hallsHref, { scroll: false });
      return;
    }
    if (saved !== "all") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", saved);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [hallsHref, pathname, restoreSaved, router, searchParams]);

  return (
    <nav aria-label="Card view" className={styles.bar}>
      <PokemonViewLink href={setsHref} mode="sets" current={mode === "sets"} className={mode === "sets" ? styles.active : styles.pill}>
        By set
      </PokemonViewLink>
      <PokemonViewLink href={allHref} mode="all" current={mode === "all"} className={mode === "all" ? styles.active : styles.pill}>
        All cards
      </PokemonViewLink>
      <PokemonViewLink href={hallsHref} mode="halls" current={mode === "halls"} className={mode === "halls" ? styles.active : styles.pill}>
        Library Halls
      </PokemonViewLink>
    </nav>
  );
}
