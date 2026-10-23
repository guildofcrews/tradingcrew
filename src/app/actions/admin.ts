"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";

interface AdminActionResult {
  success: boolean;
  error?: string;
}

export async function updateUserStatus(
  userId: string,
  status: "pending" | "approved" | "denied"
): Promise<AdminActionResult> {
  if (!db) {
    return { success: false, error: "Database is not configured" };
  }

  const { authorized, user: adminUser } = await requireAdmin();
  if (!authorized || !adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    await db.update(users).set({ status }).where(eq(users.id, userId));

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user status:", error);
    return { success: false, error: "Failed to update user status" };
  }
}

export async function updateUserRole(
  userId: string,
  role: "user" | "admin"
): Promise<AdminActionResult> {
  if (!db) {
    return { success: false, error: "Database is not configured" };
  }

  const { authorized, user: adminUser } = await requireAdmin();
  if (!authorized || !adminUser) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    if (role === "user" && targetUser.role === "admin") {
      const adminCount = await db.query.users.findMany({
        where: and(eq(users.role, "admin"), eq(users.status, "approved")),
      });

      if (adminCount.length <= 1) {
        return {
          success: false,
          error: "Cannot demote the last admin",
        };
      }
    }

    await db.update(users).set({ role }).where(eq(users.id, userId));

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user role:", error);
    return { success: false, error: "Failed to update user role" };
  }
}
