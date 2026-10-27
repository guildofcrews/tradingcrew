import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { runPokemonPriceBackfill } from "@/lib/pokemon-price/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { authorized } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rematchAll = false;
  try {
    const body = await request.json();
    rematchAll = Boolean(body && typeof body === "object" && "rematchAll" in body && body.rematchAll);
  } catch {
    rematchAll = false;
  }

  const summary = await runPokemonPriceBackfill(rematchAll ? "all" : "pending");
  return NextResponse.json({ summary });
}
