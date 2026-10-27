"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestCardRead, sleep } from "@/lib/read-card-client";
import styles from "./ReadCardButton.module.css";

export function ReadCardButton({
  cardId,
  label,
  note,
}: {
  cardId: string;
  label: string;
  note?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(note ?? null);

  async function read() {
    setBusy(true);
    setMessage(null);
    let result = await requestCardRead(cardId);
    if (result.kind === "retry") {
      setMessage(result.message);
      await sleep(Math.min(result.waitMs, 8000));
      result = await requestCardRead(cardId);
    }
    if (result.kind === "review") {
      router.push(`/my-cards/review?card=${cardId}`);
      router.refresh();
      return;
    }
    setMessage(result.message);
    setBusy(false);
    if (result.kind === "same" || result.kind === "error" || result.kind === "stop") {
      router.refresh();
    }
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.button} onClick={() => void read()} disabled={busy}>
        {busy ? "Reading…" : label}
      </button>
      {message && <p className={styles.note}>{message}</p>}
    </div>
  );
}
