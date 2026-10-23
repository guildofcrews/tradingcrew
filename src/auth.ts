import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const DEFAULT_ADMIN_EMAIL = "scarruthers239@gmail.com";

function getAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS;
  if (envEmails) {
    return envEmails.split(",").map((e) => e.trim().toLowerCase());
  }
  return [DEFAULT_ADMIN_EMAIL.toLowerCase()];
}

function createAuthConfig() {
  if (!db) {
    return null;
  }

  const database = db;

  return NextAuth({
    adapter: DrizzleAdapter(database),
    providers: [
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      }),
    ],
    callbacks: {
      async session({ session, user }) {
        if (session.user) {
          session.user.id = user.id;
          const dbUser = await database.query.users.findFirst({
            where: eq(users.id, user.id),
            columns: { role: true, status: true },
          });
          if (dbUser) {
            session.user.role = dbUser.role;
            session.user.status = dbUser.status;
          }
        }
        return session;
      },
    },
    events: {
      async signIn({ user }) {
        if (!user.email) return;
        const adminEmails = getAdminEmails();
        if (adminEmails.includes(user.email.toLowerCase())) {
          await database
            .update(users)
            .set({ role: "admin", status: "approved" })
            .where(eq(users.id, user.id!));
        }
      },
    },
    pages: {
      signIn: "/signin",
    },
    trustHost: true,
  });
}

const authConfig = createAuthConfig();

export const handlers = authConfig?.handlers ?? {
  GET: () => new Response("Auth not configured", { status: 503 }),
  POST: () => new Response("Auth not configured", { status: 503 }),
};

export const auth = authConfig?.auth ?? (async () => null);
export const signIn = authConfig?.signIn ?? (async () => {});
export const signOut = authConfig?.signOut ?? (async () => {});
