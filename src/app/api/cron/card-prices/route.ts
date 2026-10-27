import { NextResponse } from "next/server";
import { db } from "@/db";
import { cronAuthorized } from "@/lib/pokemon-price/cron-auth";
import { runCardPriceSync } from "@/lib/pokemon-price/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!cronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }
  const summary = await runCardPriceSync();
  return NextResponse.json(summary);
}
