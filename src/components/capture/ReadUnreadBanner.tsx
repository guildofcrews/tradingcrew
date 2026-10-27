"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestCardRead, sleep } from "@/lib/read-card-client";
import styles from "./ReadUnreadBanner.module.css";

const CONCURRENCY = 2;
const MAX_TRIES = 4;

export function ReadUnreadBanner({ cardIds }: { cardIds: string[] }) {
  const router = useRouter();
  const [reading, setReading] = useState(false);
  const [finished, setFinished] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  if (cardIds.length === 0) return null;

  async function readAll() {
    setReading(true);
    setMessage(null);
    setFinished(0);
    const queue = [...cardIds];
    let done = 0;
    let toCheck = 0;
    let stop = false;

    async function worker() {
      while (queue.length > 0 && !stop) {
        const cardId = queue.shift();
        if (!cardId) return;
        let tries = 0;
        while (tries < MAX_TRIES && !stop) {
          const result = await requestCardRead(cardId);
          if (result.kind === "retry") {
            tries += 1;
            if (tries >= MAX_TRIES) {
              setMessage(result.message);
              break;
            }
            await sleep(Math.min(result.waitMs * tries, 15000));
            continue;
          }
          if (result.kind === "stop") {
            stop = true;
            setMessage(result.message);
            break;
          }
          if (result.kind === "review") toCheck += 1;
          if (result.kind === "error") setMessage(result.message);
          break;
        }
        done += 1;
        setFinished(done);
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    setReading(false);
    if (toCheck > 0) {
      router.push("/my-cards/review");
      router.refresh();
      return;
    }
    router.refresh();
  }

  const countLabel =
    cardIds.length === 1
      ? "1 card hasn't been read by AI yet."
      : `${cardIds.length} cards haven't been read by AI yet.`;

  return (
    <div className={styles.banner}>
      <p className={styles.copy}>{reading ? `Reading ${finished} of ${cardIds.length}…` : countLabel}</p>
      <button type="button" className={styles.action} onClick={() => void readAll()} disabled={reading}>
        {reading ? "Reading…" : "Read them all"}
      </button>
      {message && <p className={styles.note}>{message}</p>}
    </div>
  );
}
