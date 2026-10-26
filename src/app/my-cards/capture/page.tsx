import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CaptureStudio } from "@/components/capture/CaptureStudio";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { db } from "@/db";
import { requireApprovedUser } from "@/lib/auth-utils";

export const metadata: Metadata = { title: "Snap cards · TradingCrew" };

export default async function CapturePage() {
  if (!db) return <ServiceUnavailable />;

  const { authorized, reason } = await requireApprovedUser();
  if (!authorized) {
    if (reason === "not_authenticated") redirect("/signin?callbackUrl=/my-cards/capture");
    redirect("/pending");
  }

  return <CaptureStudio />;
}
