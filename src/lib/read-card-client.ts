import { AI_APPLIED_MESSAGE, AI_SAME_MESSAGE } from "@/lib/recognition-plan";

export type ReadCardResponse =
  | { kind: "review" }
  | { kind: "same"; message: string }
  | { kind: "retry"; message: string; waitMs: number }
  | { kind: "stop"; message: string }
  | { kind: "error"; message: string };

type Payload = {
  error?: string;
  outcome?: "same" | "applied" | "review";
  card?: { reviewStatus?: string | null } | null;
};

export async function requestCardRead(cardId: string): Promise<ReadCardResponse> {
  let response: Response;
  try {
    response = await fetch("/api/cards/recognize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId }),
      redirect: "manual",
    });
  } catch {
    return { kind: "error", message: "Couldn't reach the AI reader. Try again." };
  }

  if (response.status === 0 || response.type === "opaqueredirect") {
    return { kind: "error", message: "Sign in to read cards." };
  }

  const payload = (await response.json().catch(() => null)) as Payload | null;
  const message = payload?.error || "Couldn't read that card";

  if (response.status === 429) {
    const header = Number(response.headers.get("Retry-After"));
    const waitMs = Number.isFinite(header) && header > 0 ? header * 1000 : 2000;
    return { kind: "retry", message, waitMs };
  }
  if (response.status === 402) {
    return { kind: "stop", message };
  }
  if (!response.ok) {
    return { kind: "error", message };
  }
  if (payload?.error) {
    return { kind: "error", message };
  }
  if (payload?.outcome === "review" || payload?.card?.reviewStatus === "needs_review") {
    return { kind: "review" };
  }
  if (payload?.outcome === "same") {
    return { kind: "same", message: AI_SAME_MESSAGE };
  }
  return { kind: "same", message: AI_APPLIED_MESSAGE };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
