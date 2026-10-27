"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Summary = {
  high: number;
  medium: number;
  noMatch: number;
  noPrice: number;
  failed: number;
  remaining: number;
};

export function PriceBackfill() {
  const router = useRouter();
  const [pending, setPending] = useState<"pending" | "all" | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(rematchAll: boolean) {
    setPending(rematchAll ? "all" : "pending");
    setError(null);
    try {
      const response = await fetch("/api/admin/card-prices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rematchAll }),
      });
      const body = (await response.json().catch(() => null)) as { summary?: Summary; error?: string } | null;
      if (!response.ok || !body?.summary) {
        setError(body?.error || "Couldn't price those cards. Try again in a minute.");
        return;
      }
      setSummary(body.summary);
      router.refresh();
    } catch {
      setError("Couldn't price those cards. Try again in a minute.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="px-6 py-6 border-b border-[#2B3A67]/10">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => run(false)}
          disabled={pending !== null}
          className="px-4 py-2 rounded-full bg-[#2B3A67] text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending === "pending" ? "Matching cards…" : "Match & price Pokémon cards now"}
        </button>
        <button
          type="button"
          onClick={() => run(true)}
          disabled={pending !== null}
          className="px-4 py-2 rounded-full border-2 border-[#2B3A67]/20 text-[#2B3A67] text-sm font-semibold disabled:opacity-50"
        >
          {pending === "all" ? "Re-matching…" : "Re-match all Pokémon cards"}
        </button>
      </div>
      <p className="mt-3 text-sm text-[#2B3A67]/70">
        The first button matches cards that have never been tried, and fills in any match that still has no price.
        Re-match all runs every Pokémon card again.
      </p>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {summary && <p className="mt-3 text-sm font-semibold text-[#2B3A67]">{describe(summary)}</p>}
    </div>
  );
}

function describe(summary: Summary): string {
  const matched = `${summary.high} high and ${summary.medium} medium`;
  const parts = [
    `Matched ${matched}.`,
    `${summary.noMatch} had no match.`,
    `${summary.noPrice} had no price.`,
  ];
  if (summary.failed > 0) parts.push(`${summary.failed} couldn't be checked.`);
  if (summary.remaining > 0) parts.push(`${summary.remaining} are still waiting — run it again to finish.`);
  return parts.join(" ");
}
