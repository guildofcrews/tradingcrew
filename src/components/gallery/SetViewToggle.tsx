"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./SetViewToggle.module.css";

const VIEW_KEY = "tradingcrew.pokemon-view";

function rememberPokemonView(mode: "sets" | "all") {
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
  mode: "sets" | "all";
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

/** By set | All cards. The URL wins; a saved choice applies when the URL is silent. */
export function SetViewToggle({
  mode,
  setsHref,
  allHref,
}: {
  mode: "sets" | "all";
  setsHref: string;
  allHref: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("view") === "all" || searchParams.get("set")) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(VIEW_KEY);
    } catch {
      return;
    }
    if (saved !== "all") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "all");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return (
    <nav aria-label="Card view" className={styles.bar}>
      <PokemonViewLink href={setsHref} mode="sets" current={mode === "sets"} className={mode === "sets" ? styles.active : styles.pill}>
        By set
      </PokemonViewLink>
      <PokemonViewLink href={allHref} mode="all" current={mode === "all"} className={mode === "all" ? styles.active : styles.pill}>
        All cards
      </PokemonViewLink>
    </nav>
  );
}
