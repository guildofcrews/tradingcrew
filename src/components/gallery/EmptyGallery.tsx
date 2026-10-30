"use client";

import { useState } from "react";
import Link from "next/link";
import { UploadCardModal } from "./UploadCardModal";
import styles from "./EmptyGallery.module.css";

export function EmptyGallery() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <>
      <div className={styles.empty}>
        <p>Your gallery is empty. Snap your first card to open the doors.</p>
        <div className={styles.actions}>
          <Link href="/my-cards/capture" className={styles.cta}>
            Snap cards
          </Link>
          <button type="button" className={styles.quiet} onClick={() => setIsUploadOpen(true)}>
            Upload one
          </button>
        </div>
      </div>
      <UploadCardModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
}

export function EmptyVault({ canAdd = false }: { canAdd?: boolean }) {
  return (
    <div className={styles.emptyWing}>
      <p className={styles.emptyTitle}>The Digital Vault is empty.</p>
      <p>Paste a link to an NBA Top Shot, NFL ALL DAY, or Sorare card you have.</p>
      {canAdd && (
        <div className={styles.actions}>
          <Link href="/my-cards/digital" className={styles.cta}>
            Add a digital card
          </Link>
        </div>
      )}
    </div>
  );
}

export function EmptyWing({ accentColor }: { accentColor?: string }) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <>
      <div
        className={styles.emptyWing}
        style={accentColor ? { borderColor: accentColor } : undefined}
      >
        <p className={styles.emptyTitle}>This wing is waiting for its first card.</p>
        <div className={styles.actions}>
          <Link href="/my-cards/capture" className={styles.cta}>
            Snap cards
          </Link>
          <button type="button" className={styles.quiet} onClick={() => setIsUploadOpen(true)}>
            Upload one
          </button>
        </div>
      </div>
      <UploadCardModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
}
