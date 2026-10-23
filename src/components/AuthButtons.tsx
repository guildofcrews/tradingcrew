"use client";

import Link from "next/link";
import Image from "next/image";
import type { User } from "next-auth";
import { signOutAction } from "@/app/actions/auth";

export function SignInButton() {
  return (
    <Link
      href="/signin"
      className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-[#F96D3B] rounded-full hover:bg-[#e85a2a] transition-colors"
    >
      Sign In
    </Link>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
      >
        Sign Out
      </button>
    </form>
  );
}

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps) {
  return (
    <Link
      href={`/u/${user.id}`}
      className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
    >
      {user.image ? (
        <Image
          src={user.image}
          alt={user.name || "User"}
          width={32}
          height={32}
          className="rounded-full"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-[#5B8BD4] flex items-center justify-center text-white text-sm font-medium">
          {user.name?.[0] || user.email?.[0] || "?"}
        </div>
      )}
      <span className="font-medium hidden sm:block">{user.name}</span>
    </Link>
  );
}
