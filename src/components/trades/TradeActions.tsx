"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { acceptTrade, cancelAcceptedTrade, confirmTrade, rejectTrade, withdrawTrade } from "@/app/actions/trades";
import { acceptedSwapButton, acceptedSwapLead } from "@/lib/nft/trade-copy";
import styles from "@/components/gallery/shell.module.css";

type Status = "proposed" | "countered" | "accepted" | "completed" | "rejected" | "withdrawn" | "cancelled";

export function TradeActions({
  tradeId,
  status,
  youAre,
  yourTurn,
  youConfirmed,
  theyConfirmed,
  otherName,
  includesDigital = false,
}: {
  tradeId: string;
  status: Status;
  youAre: "proposer" | "recipient";
  yourTurn: boolean;
  youConfirmed: boolean;
  theyConfirmed: boolean;
  otherName: string;
  includesDigital?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, startTransition] = useTransition();
  const open = status === "proposed" || status === "countered";

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
      {open && yourTurn && (
        <div className={styles.actions}>
          <button type="button" className={styles.primary} disabled={pending} onClick={() => run(acceptTrade)}>
            {pending ? "Working…" : "Accept trade"}
          </button>
          <Link href={`/trades/${tradeId}/counter`} className={styles.secondary}>
            Counter-offer
          </Link>
          <button type="button" className={styles.secondary} disabled={pending} onClick={() => run(rejectTrade)}>
            No thanks
          </button>
        </div>
      )}

      {open && !yourTurn && (
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} disabled={pending} onClick={() => run(withdrawTrade)}>
            {status === "proposed" && youAre === "proposer" ? "Take this offer back" : "Cancel this trade"}
          </button>
        </div>
      )}

      {status === "accepted" && (
        <div className={styles.panel}>
          <p className={styles.lead}>{acceptedSwapLead(otherName, includesDigital)}</p>
          {youConfirmed ? (
            <p className={styles.ok}>You confirmed the swap. Waiting for {otherName}.</p>
          ) : (
            <button type="button" className={styles.primary} disabled={pending} onClick={() => run(confirmTrade)}>
              {pending ? "Saving…" : acceptedSwapButton(includesDigital)}
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
