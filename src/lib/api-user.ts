import { NextResponse } from "next/server";
import { requireApprovedUser } from "@/lib/auth-utils";
import type { User } from "@/db/schema";

export async function approvedUserOrResponse(): Promise<
  { user: User; response: null } | { user: null; response: NextResponse }
> {
  const result = await requireApprovedUser();
  if (!result.authorized || !result.user) {
    const status = result.reason === "not_authenticated" ? 401 : 403;
    const error = status === 401 ? "Sign in to add cards" : "Your account is not approved";
    return { user: null, response: NextResponse.json({ error }, { status }) };
  }
  return { user: result.user, response: null };
}
