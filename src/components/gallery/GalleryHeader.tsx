"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { LogoMark } from "@/components/Logo";
import { signOutAction } from "@/app/actions/auth";
import { UploadCardModal } from "./UploadCardModal";

interface GalleryHeaderClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export function GalleryHeaderClient({ user }: GalleryHeaderClientProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <>
      <header className="bg-[#0f1629] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="font-bold text-white text-lg">
              Trading<span className="text-[#F5C542]">Crew</span>
              <span className="text-white/40 text-sm">.ai</span>
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/my-cards"
              className="text-white font-medium border-b-2 border-[#F5C542] pb-0.5"
            >
              My Cards
            </Link>

            {user && (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F96D3B] to-[#F5C542] text-white text-sm font-semibold rounded-full hover:opacity-90 transition-opacity"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Upload card
                </button>

                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || "User"}
                    width={32}
                    height={32}
                    className="rounded-full border border-white/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F5C542] to-[#F96D3B] flex items-center justify-center text-white text-sm font-bold">
                    {user.name?.[0] || user.email?.[0] || "?"}
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

      <UploadCardModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </>
  );
}
