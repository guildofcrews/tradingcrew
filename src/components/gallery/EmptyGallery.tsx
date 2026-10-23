"use client";

import { useState } from "react";
import { UploadCardModal } from "./UploadCardModal";
import styles from "./EmptyGallery.module.css";

export function EmptyGallery() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <>
      <div className={styles.empty}>
        <p>Your gallery is empty. Snap your first card to open the doors.</p>
        <button
          type="button"
          className={styles.cta}
          onClick={() => setIsUploadOpen(true)}
        >
          Upload card
        </button>
      </div>
      <UploadCardModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
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
        <button
          type="button"
          className={styles.cta}
          onClick={() => setIsUploadOpen(true)}
        >
          Upload card
        </button>
      </div>
      <UploadCardModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
}
