import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { LogoMark } from "@/components/Logo";
import { signOutAction } from "@/app/actions/auth";

export async function GalleryHeader() {
  const session = await auth();

  return (
    <header className="bg-[#0f1629] border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="h-10 w-10" />
          <span className="font-bold text-white text-lg">
            Trading<span className="text-[#F5C542]">Crew</span>
            <span className="text-white/40 text-sm">.ai</span>
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/my-cards"
            className="text-white/90 hover:text-white transition-colors font-medium"
          >
            My Cards
          </Link>

          {session?.user && (
            <div className="flex items-center gap-3">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  width={32}
                  height={32}
                  className="rounded-full border border-white/20"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F5C542] to-[#F96D3B] flex items-center justify-center text-white text-sm font-bold">
                  {session.user.name?.[0] || session.user.email?.[0] || "?"}
                </div>
              )}
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="text-white/60 hover:text-white text-sm transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
