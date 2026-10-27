"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { displayImageSrc, type ArtCard } from "@/lib/card-art";
import { CardPhoto } from "@/components/gallery/CardPhoto";
import { useTradeDraft } from "./TradeDraft";
import styles from "./TradeTray.module.css";

function Thumbs({ cards }: { cards: (ArtCard & { id: string; title: string })[] }) {
  return (
    <span className={styles.thumbs}>
      {cards.slice(0, 4).map((card) =>
        displayImageSrc(card) ? (
          <CardPhoto
            key={card.id}
            card={card}
            alt=""
            fill={false}
            width={32}
            height={44}
            className={styles.thumb}
          />
        ) : (
          <span key={card.id} className={styles.thumbEmpty} />
        ),
      )}
    </span>
  );
}

export function TradeTray({ otherName }: { otherName: string }) {
  const pathname = usePathname();
  const { ownerId, draft, notice, clear } = useTradeDraft();
  const offering = pathname.endsWith("/propose");
  const ready = draft.want.length > 0;

  return (
    <div className={styles.tray} role="region" aria-label="Trade in progress">
      <div className={`tc-container ${styles.inner}`}>
        <div className={styles.sides}>
          <div className={styles.side}>
            <span className={styles.label}>You get</span>
            <strong>{draft.want.length}</strong>
            <Thumbs cards={draft.want} />
          </div>
          <div className={styles.side}>
            <span className={styles.label}>You give</span>
            <strong>{draft.give.length}</strong>
            <Thumbs cards={draft.give} />
          </div>
        </div>
        <div className={styles.actions}>
          {notice && <p className={styles.notice}>{notice}</p>}
          {!offering && ready && (
            <Link href={`/shared/${ownerId}/propose`} className={styles.go}>
              Choose your cards
            </Link>
          )}
          {!offering && !ready && <p className={styles.hint}>Tap cards you want from {otherName}&apos;s gallery.</p>}
          {(draft.want.length > 0 || draft.give.length > 0) && (
            <button type="button" className={styles.clear} onClick={clear}>
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
