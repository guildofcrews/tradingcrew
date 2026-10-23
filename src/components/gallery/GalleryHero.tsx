"use client";

import { useState } from "react";
import { UploadCardModal } from "./UploadCardModal";

interface GalleryHeroProps {
  userName: string;
  totalCards: number;
  categoryBreakdown: {
    pokemon: number;
    basketball: number;
    baseball: number;
    football: number;
    uncategorized: number;
  };
}

export function GalleryHero({
  userName,
  totalCards,
  categoryBreakdown,
}: GalleryHeroProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const firstName = userName.split(" ")[0] || userName;

  return (
    <>
      <section className="relative py-16 md:py-24 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f1629] via-[#0f1629] to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <p className="text-[#F5C542] text-xs md:text-sm tracking-[0.3em] uppercase font-medium mb-4">
            The Collection of
          </p>
          
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-white font-bold mb-8">
            {firstName}&apos;s Gallery
          </h1>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <StatPill label="Total Cards" value={totalCards} />
            {categoryBreakdown.pokemon > 0 && (
              <StatPill label="Pokémon" value={categoryBreakdown.pokemon} color="yellow" />
            )}
            {categoryBreakdown.basketball > 0 && (
              <StatPill label="Basketball" value={categoryBreakdown.basketball} color="orange" />
            )}
            {categoryBreakdown.football > 0 && (
              <StatPill label="Football" value={categoryBreakdown.football} color="green" />
            )}
            {categoryBreakdown.baseball > 0 && (
              <StatPill label="Baseball" value={categoryBreakdown.baseball} color="blue" />
            )}
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#F96D3B] to-[#F5C542] text-white font-bold rounded-full hover:opacity-90 transition-opacity shadow-lg shadow-[#F96D3B]/20"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload Card
          </button>
        </div>
      </section>

      <UploadCardModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
}

interface StatPillProps {
  label: string;
  value: number;
  color?: "default" | "yellow" | "orange" | "green" | "blue";
}

function StatPill({ label, value, color = "default" }: StatPillProps) {
  const colorClasses = {
    default: "bg-white/10 text-white/90",
    yellow: "bg-[#F5C542]/20 text-[#F5C542]",
    orange: "bg-[#F96D3B]/20 text-[#F96D3B]",
    green: "bg-[#22C55E]/20 text-[#22C55E]",
    blue: "bg-[#3B82F6]/20 text-[#3B82F6]",
  };

  return (
    <div
      className={`px-4 py-2 rounded-full text-sm font-medium ${colorClasses[color]}`}
    >
      <span className="font-bold">{value}</span>{" "}
      <span className="opacity-80">{label}</span>
    </div>
  );
}
