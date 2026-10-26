"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { grantGalleryAccess, revokeGalleryAccess } from "@/app/actions/shares";
import { formatWhen } from "@/lib/presentation";
import styles from "@/components/gallery/shell.module.css";

type GrantedShare = {
  id: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
};

type ReceivedShare = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  sharedBack: boolean;
};

export function SharingDesk({ granted, received }: { granted: GrantedShare[]; received: ReceivedShare[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function share(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNote(null);
    startTransition(async () => {
      const result = await grantGalleryAccess({ email });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEmail("");
      setNote(result.name ? `Your gallery is now shared with ${result.name}.` : "Your gallery is shared.");
      router.refresh();
    });
  }

  function shareBack(userId: string, name: string) {
    setError(null);
    setNote(null);
    startTransition(async () => {
      const result = await grantGalleryAccess({ userId });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNote(`You shared your gallery back with ${name}.`);
      router.refresh();
    });
  }

  function revoke(userId: string) {
    setError(null);
    setNote(null);
    startTransition(async () => {
      const result = await revokeGalleryAccess(userId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setConfirming(null);
      setNote("They can't see your gallery anymore.");
      router.refresh();
    });
  }

  return (
    <div className={styles.stack}>
      <section className={styles.panel} aria-labelledby="share-heading">
        <h2 id="share-heading" className={styles.h2}>Share your gallery</h2>
        <p className={styles.lead}>
          Type the email of a friend who already uses TradingCrew. They&apos;ll be able to see your cards. You won&apos;t see theirs unless they share back.
        </p>
        <form onSubmit={share} className={styles.formRow}>
          <label className={styles.field} style={{ flex: "1 1 240px" }}>
            <span className={styles.label}>Friend&apos;s email</span>
            <input
              className={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="friend@email.com"
            />
          </label>
          <button type="submit" className={styles.primary} disabled={pending}>
            {pending ? "Sharing…" : "Share my gallery"}
          </button>
        </form>
        {error && <p className={styles.error}>{error}</p>}
        {note && <p className={styles.ok}>{note}</p>}
      </section>

      <section className={styles.panel} aria-labelledby="granted-heading">
        <h2 id="granted-heading" className={styles.h2}>Who can see your cards</h2>
        {granted.length === 0 ? (
          <p className={styles.muted}>You haven&apos;t shared your gallery with anyone yet.</p>
        ) : (
          <ul className={styles.list}>
            {granted.map((shareRow) => (
              <li key={shareRow.id} className={styles.row}>
                <div className={styles.rowText}>
                  <p className={styles.rowTitle}>{shareRow.name}</p>
                  <p className={styles.muted}>
                    {shareRow.email}
                    {shareRow.createdAt ? ` · since ${formatWhen(shareRow.createdAt)}` : ""}
                  </p>
                </div>
                {confirming === shareRow.userId ? (
                  <div className={styles.actions}>
                    <span className={styles.muted}>They won&apos;t see your cards anymore.</span>
                    <button type="button" className={styles.primary} disabled={pending} onClick={() => revoke(shareRow.userId)}>
                      Stop sharing
                    </button>
                    <button type="button" className={styles.quiet} onClick={() => setConfirming(null)}>
                      Keep sharing
                    </button>
                  </div>
                ) : (
                  <button type="button" className={styles.quiet} onClick={() => setConfirming(shareRow.userId)}>
                    Stop sharing
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="received-heading">
        <h2 id="received-heading" className={styles.h2}>Galleries shared with you</h2>
        {received.length === 0 ? (
          <p className={styles.muted}>When a friend shares their gallery, it will show up here.</p>
        ) : (
          <ul className={styles.list}>
            {received.map((shareRow) => (
              <li key={shareRow.id} className={styles.row}>
                <div className={styles.rowText}>
                  <p className={styles.rowTitle}>{shareRow.name}</p>
                  <p className={styles.muted}>Shared with you {formatWhen(shareRow.createdAt)}</p>
                </div>
                <div className={styles.actions}>
                  <Link href={`/shared/${shareRow.userId}`} className={styles.primary}>
                    View gallery
                  </Link>
                  {shareRow.sharedBack ? (
                    <span className={styles.muted}>You share back</span>
                  ) : (
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={pending}
                      onClick={() => shareBack(shareRow.userId, shareRow.name)}
                    >
                      Share your gallery back
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
