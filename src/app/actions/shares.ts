"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { galleryShares, users } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { requireApprovedUser } from "@/lib/auth-utils";
import { publicName } from "@/lib/presentation";
import { revalidateCollections } from "@/lib/revalidate-gallery";

const NOT_FOUND = "No approved TradingCrew member uses that email.";

function pgCode(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

async function findApprovedByEmail(email: string) {
  if (!db) return null;
  const [user] = await db
    .select({ id: users.id, name: users.name, status: users.status, email: users.email })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  if (!user || user.status !== "approved") return null;
  return user;
}

export async function grantGalleryAccess(input: { email?: string; userId?: string }): Promise<ActionResult> {
  if (!db) return { success: false, error: "Database is not configured" };

  const { authorized, user } = await requireApprovedUser();
  if (!authorized || !user) return { success: false, error: "Your account isn't approved yet" };

  try {
    let target: { id: string; name: string | null } | null = null;

    if (input.email) {
      const email = input.email.trim().toLowerCase();
      if (!email.includes("@") || email.length > 254) {
        return { success: false, error: "Enter the email address they use for TradingCrew." };
      }
      if (user.email && email === user.email.toLowerCase()) {
        return { success: false, error: "That's your own email. Share with a friend instead." };
      }
      const found = await findApprovedByEmail(email);
      if (!found || found.id === user.id) return { success: false, error: NOT_FOUND };
      target = found;
    } else if (input.userId) {
      const found = await db.query.users.findFirst({
        where: eq(users.id, input.userId),
        columns: { id: true, name: true, status: true },
      });
      if (!found || found.status !== "approved" || found.id === user.id) {
        return { success: false, error: "That member isn't available to share with." };
      }
      target = found;
    } else {
      return { success: false, error: "Enter the email address they use for TradingCrew." };
    }

    await db.insert(galleryShares).values({ ownerId: user.id, granteeId: target.id });
    revalidateCollections([user.id]);
    return { success: true, name: publicName(target) };
  } catch (error) {
    if (pgCode(error) === "23505") {
      return { success: false, error: "You already share your gallery with that member." };
    }
    console.error("Failed to grant gallery access:", error);
    return { success: false, error: "Couldn't share your gallery. Please try again." };
  }
}

export async function revokeGalleryAccess(granteeId: string): Promise<ActionResult> {
  if (!db) return { success: false, error: "Database is not configured" };

  const { authorized, user } = await requireApprovedUser();
  if (!authorized || !user) return { success: false, error: "Your account isn't approved yet" };
  if (!granteeId) return { success: false, error: "Choose someone to stop sharing with." };

  try {
    const deleted = await db
      .delete(galleryShares)
      .where(and(eq(galleryShares.ownerId, user.id), eq(galleryShares.granteeId, granteeId)))
      .returning({ id: galleryShares.id });
    if (deleted.length === 0) {
      return { success: false, error: "That share is already gone." };
    }
    revalidateCollections([user.id]);
    return { success: true };
  } catch (error) {
    console.error("Failed to revoke gallery access:", error);
    return { success: false, error: "Couldn't update sharing. Please try again." };
  }
}
