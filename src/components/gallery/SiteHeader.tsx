"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { signOutAction } from "@/app/actions/auth";
import { UploadCardModal } from "./UploadCardModal";
import styles from "./SiteHeader.module.css";

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  active?: string;
  incomingTrades?: number;
}

export function SiteHeader({ user, active = "/my-cards", incomingTrades = 0 }: Props) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const username = user?.name || user?.email || "User";
  const initial = username.replace(/[^a-z0-9]/gi, "").charAt(0).toUpperCase() || "?";

  return (
    <>
      <header className={styles.header}>
        <div className={`tc-container ${styles.inner}`}>
          <Link href="/" className={styles.logo} aria-label="TradingCrew home">
            <LogoMark />
            <span className={styles.wordmark}>
              Trading<span className={styles.wordmarkAccent}>Crew</span>
            </span>
          </Link>

          <nav aria-label="Main" className={styles.nav}>
            <Link
              href="/my-cards"
              className={active === "/my-cards" ? styles.navActive : styles.navLink}
              aria-current={active === "/my-cards" ? "page" : undefined}
            >
              My Cards
            </Link>
            <Link
              href="/sharing"
              className={active === "/sharing" ? styles.navActive : styles.navLink}
              aria-current={active === "/sharing" ? "page" : undefined}
            >
              Sharing
            </Link>
            <Link
              href="/trades"
              className={active === "/trades" ? styles.navActive : styles.navLink}
              aria-current={active === "/trades" ? "page" : undefined}
              aria-label={incomingTrades > 0 ? `Trades, ${incomingTrades} new` : "Trades"}
            >
              Trades
              {incomingTrades > 0 && (
                <span className={styles.badge}>{incomingTrades > 9 ? "9+" : incomingTrades}</span>
              )}
            </Link>
          </nav>

          <div className={styles.actions}>
            <Link href="/my-cards/capture" className={styles.upload}>
              Snap cards
            </Link>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className={styles.secondary}
            >
              Upload
            </button>

            {user?.image ? (
              <Image
                src={user.image}
                alt={username}
                width={44}
                height={44}
                className={styles.avatarImg}
              />
            ) : (
              <div className={styles.avatar} aria-label={`Signed in as ${username}`} role="img">
                {initial}
              </div>
            )}

            <form action={signOutAction}>
              <button type="submit" className={styles.signOut}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <UploadCardModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </>
  );
}

function LogoMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 240 240" aria-hidden="true">
      <g transform="rotate(-14 100 110)">
        <rect x="48" y="38" width="104" height="144" rx="16" fill="var(--tc-logo-blue)" stroke="var(--tc-text)" strokeWidth="9" />
      </g>
      <g transform="rotate(12 140 130)">
        <rect x="88" y="58" width="104" height="144" rx="16" fill="var(--tc-logo-yellow)" stroke="var(--tc-text)" strokeWidth="9" />
      </g>
      <circle cx="122" cy="122" r="36" fill="var(--tc-logo-coral)" stroke="var(--tc-text)" strokeWidth="9" />
    </svg>
  );
}
