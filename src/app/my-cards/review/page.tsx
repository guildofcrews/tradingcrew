import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReviewDeck } from "@/components/capture/ReviewDeck";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { db } from "@/db";
import { requireApprovedUser } from "@/lib/auth-utils";
import { loadReviewCards } from "@/lib/review-queue";

export const metadata: Metadata = { title: "Check cards · TradingCrew" };
export const maxDuration = 60;

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; card?: string }>;
}) {
  if (!db) return <ServiceUnavailable />;

  const { authorized, reason, user } = await requireApprovedUser();
  if (!authorized || !user) {
    if (reason === "not_authenticated") redirect("/signin?callbackUrl=/my-cards/review");
    redirect("/pending");
  }

  const query = await searchParams;
  const batchId = typeof query.batch === "string" ? query.batch : null;
  const startId = typeof query.card === "string" ? query.card : null;
  const initialCards = await loadReviewCards(user.id, batchId);

  return <ReviewDeck initialCards={initialCards} batchId={batchId} startId={startId} />;
}
