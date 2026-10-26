import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const getAuthUser = cache(async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id || !db) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  return user;
});

export async function requireApprovedUser() {
  const user = await getAuthUser();
  if (!user) {
    return { authorized: false, reason: "not_authenticated" as const, user: null };
  }
  if (user.status !== "approved") {
    return { authorized: false, reason: "not_approved" as const, user };
  }
  return { authorized: true, reason: null, user };
}

export async function requireAdmin() {
  const user = await getAuthUser();
  if (!user) {
    return { authorized: false, reason: "not_authenticated" as const, user: null };
  }
  if (user.role !== "admin") {
    return { authorized: false, reason: "not_admin" as const, user };
  }
  if (user.status !== "approved") {
    return { authorized: false, reason: "not_approved" as const, user };
  }
  return { authorized: true, reason: null, user };
}
