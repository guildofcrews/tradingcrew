import Link from "next/link";
import type { CSSProperties } from "react";
import { HallBreadcrumb } from "@/components/LibraryHall/HallBreadcrumb";
import { SetDrillIn } from "@/components/gallery/SetDoors";
import { DisplayToggle } from "@/components/gallery/DisplayToggle";
import { EmptyVault } from "@/components/gallery/EmptyGallery";
import { SharedWingCardView } from "@/components/gallery/SharedWingCardView";
import { SortBar } from "@/components/gallery/SortBar";
import { WingCardView } from "@/components/gallery/WingCardView";
import { AppHeader } from "@/components/gallery/AppHeader";
import { displayQuery, galleryHref, parseCardDisplay } from "@/lib/card-sets";
import {
  DIGITAL_VAULT_WING,
  cardsInWing,
  digitalCountLabel,
  parseSort,
  sortCards,
  type Card,
} from "@/lib/cards";
import { categoryHallPath, findVaultCollection, libraryCrumbs, withRoomAt, type HallScope } from "@/lib/library-hall";
import styles from "@/app/my-cards/[wing]/page.module.css";

interface Props {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  cards: readonly Card[];
  scope?: HallScope;
  ownerName?: string;
  query: { sort?: string; display?: string; collection?: string; from?: string };
}

/** Grid, carousel, and room for claimed sports NFTs. They also stay in their sports wings. */
export function VaultGallery({ user, cards, scope = {}, ownerName, query }: Props) {
  const digital = cardsInWing([...cards], "digital-vault");
  const sort = parseSort(query.sort);
  const display = parseCardDisplay(query.display);
  const active = findVaultCollection(digital, query.collection);
  const fromHall = query.from === "hall" && Boolean(active);
  const listed = sortCards(active?.cards ?? digital, sort);
  const basePath = scope.ownerId ? `/shared/${scope.ownerId}/digital-vault` : "/my-cards/digital-vault";
  const backHref = scope.ownerId ? `/shared/${scope.ownerId}` : "/my-cards";
  const backLabel = scope.ownerId ? `${ownerName ?? "Their"}'s gallery` : "All wings";
  const cardQuery = active ? { collection: active.id, ...(fromHall ? { from: "hall" } : {}) } : {};
  const layoutQuery = { ...cardQuery, ...displayQuery(display) };
  const shared = Boolean(scope.ownerId);

  return (
    <div className={styles.page}>
      <AppHeader user={user} active={shared ? "/sharing" : "/my-cards"} />
      <main className={styles.room} style={{ "--accent": DIGITAL_VAULT_WING.accent } as CSSProperties}>
        <div className={`tc-container ${styles.top}`}>
          {fromHall && active && (
            <HallBreadcrumb
              items={libraryCrumbs(scope, DIGITAL_VAULT_WING, { id: active.id, name: active.name })}
            />
          )}
          <Link href={backHref} className={styles.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            {backLabel}
          </Link>
          <div className={styles.head}>
            <div className={styles.headText}>
              <div className={styles.eyebrow}>{DIGITAL_VAULT_WING.tagline}</div>
              <h1 className={styles.h1}>The Digital Vault</h1>
              <p className={styles.sub}>
                {shared ? `Tap the cards you want from ${ownerName ?? "them"}. ` : "Claimed, not checked on the blockchain. "}
                {digitalCountLabel(digital.length)}
              </p>
              {digital.length > 0 && (
                <DisplayToggle
                  display={display}
                  gridHref={galleryHref(basePath, cardQuery, sort)}
                  carouselHref={galleryHref(basePath, { ...cardQuery, display: "carousel" }, sort)}
                  roomHref={galleryHref(basePath, { ...cardQuery, display: "room" }, sort)}
                />
              )}
            </div>
            {listed.length > 1 && (
              <SortBar basePath={basePath} active={sort} includeValue={false} preserve={layoutQuery} />
            )}
          </div>
          {active && (
            <SetDrillIn
              group={{ id: active.id, name: active.name, eyebrow: "Digital Vault", cards: active.cards }}
              basePath={basePath}
              backHref={fromHall ? withRoomAt(categoryHallPath(scope, DIGITAL_VAULT_WING.slug), active.id) : basePath}
              backLabel={fromHall ? "The hall" : "All collections"}
              backMode={fromHall ? "halls" : undefined}
            />
          )}
        </div>
        <div className="tc-container">
          {digital.length === 0 ? (
            <EmptyVault canAdd={!shared} />
          ) : listed.length > 0 ? (
            shared ? (
              <SharedWingCardView cards={listed} display={display} gridClassName={styles.grid} />
            ) : (
              <WingCardView cards={listed} display={display} gridClassName={styles.grid} />
            )
          ) : (
            <EmptyVault canAdd={!shared} />
          )}
        </div>
      </main>
    </div>
  );
}
