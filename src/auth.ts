import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";

function createAuthConfig() {
  if (!db) {
    return null;
  }

  return NextAuth({
    adapter: DrizzleAdapter(db),
    providers: [
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      }),
    ],
    callbacks: {
      session({ session, user }) {
        if (session.user) {
          session.user.id = user.id;
        }
        return session;
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
