"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptTrade, cancelAcceptedTrade, confirmTrade, rejectTrade, withdrawTrade } from "@/app/actions/trades";
import styles from "@/components/gallery/shell.module.css";

type Status = "proposed" | "accepted" | "completed" | "rejected" | "withdrawn" | "cancelled";

export function TradeActions({
  tradeId,
  status,
  youAre,
  youConfirmed,
  theyConfirmed,
  otherName,
}: {
  tradeId: string;
  status: Status;
  youAre: "proposer" | "recipient";
  youConfirmed: boolean;
  theyConfirmed: boolean;
  otherName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: (id: string) => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action(tradeId);
      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setConfirmCancel(false);
      router.refresh();
    });
  }

  return (
    <div className={styles.stack}>
      {status === "proposed" && youAre === "recipient" && (
        <div className={styles.actions}>
          <button type="button" className={styles.primary} disabled={pending} onClick={() => run(acceptTrade)}>
            {pending ? "Working…" : "Accept trade"}
          </button>
          <button type="button" className={styles.secondary} disabled={pending} onClick={() => run(rejectTrade)}>
            No thanks
          </button>
        </div>
      )}

      {status === "proposed" && youAre === "proposer" && (
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} disabled={pending} onClick={() => run(withdrawTrade)}>
            Take this offer back
          </button>
        </div>
      )}

      {status === "accepted" && (
        <div className={styles.panel}>
          <p className={styles.lead}>
            Swap the real cards with {otherName}. When you&apos;re both done, each of you taps the button. The cards move in the app only after the second tap.
          </p>
          {youConfirmed ? (
            <p className={styles.ok}>You confirmed the swap. Waiting for {otherName}.</p>
          ) : (
            <button type="button" className={styles.primary} disabled={pending} onClick={() => run(confirmTrade)}>
              {pending ? "Saving…" : "We swapped cards in person"}
            </button>
          )}
          {theyConfirmed && !youConfirmed && <p className={styles.muted}>{otherName} already confirmed.</p>}
          {confirmCancel ? (
            <div className={styles.actions}>
              <p className={styles.muted}>This unlocks the cards. Nothing moves.</p>
              <button type="button" className={styles.primary} disabled={pending} onClick={() => run(cancelAcceptedTrade)}>
                Cancel the swap
              </button>
              <button type="button" className={styles.quiet} onClick={() => setConfirmCancel(false)}>
                Keep it
              </button>
            </div>
          ) : (
            <button type="button" className={styles.quiet} onClick={() => setConfirmCancel(true)}>
              Cancel this swap
            </button>
          )}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
