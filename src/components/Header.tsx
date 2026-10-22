import Link from "next/link";
import { auth } from "@/auth";
import { LogoMark } from "./Logo";
import { SignInButton, SignOutButton, UserMenu } from "./AuthButtons";

export async function Header() {
  const session = await auth();

  return (
    <header className="bg-[#1B1F4B] border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="h-10 w-10" />
          <span className="font-bold text-white text-lg">
            Trading<span className="text-[#F5C542]">Crew</span>
            <span className="text-white/60 text-sm">.ai</span>
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          {session?.user ? (
            <>
              <Link
                href="/my-cards"
                className="text-white/80 hover:text-white transition-colors font-medium"
              >
                My Cards
              </Link>
              <UserMenu user={session.user} />
              <SignOutButton />
            </>
          ) : (
            <SignInButton />
          )}
        </nav>
      </div>
    </header>
  );
}
