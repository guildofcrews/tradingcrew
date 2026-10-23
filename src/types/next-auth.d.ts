import "next-auth";

declare module "next-auth" {
  interface User {
    role?: "user" | "admin";
    status?: "pending" | "approved" | "denied";
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: "user" | "admin";
      status?: "pending" | "approved" | "denied";
    };
  }
}
