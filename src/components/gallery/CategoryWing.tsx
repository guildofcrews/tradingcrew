"use client";

import Link from "next/link";
import type { Card } from "@/db/schema";
import { getImageUrl } from "@/lib/images";

export type CategoryType = "pokemon" | "basketball" | "baseball" | "football" | "uncategorized";

interface CategoryWingProps {
  category: CategoryType;
  cards: Card[];
  isActive?: boolean;
}

const categoryConfig: Record<
  CategoryType,
  { name: string; color: string; bgColor: string; borderColor: string; icon: string }
> = {
  pokemon: {
    name: "Pokémon",
    color: "text-[#F5C542]",
    bgColor: "bg-[#F5C542]/10",
    borderColor: "border-[#F5C542]/30",
    icon: "⚡",
  },
  basketball: {
    name: "Basketball",
    color: "text-[#F96D3B]",
    bgColor: "bg-[#F96D3B]/10",
    borderColor: "border-[#F96D3B]/30",
    icon: "🏀",
  },
  football: {
    name: "Football",
    color: "text-[#22C55E]",
    bgColor: "bg-[#22C55E]/10",
    borderColor: "border-[#22C55E]/30",
    icon: "🏈",
  },
  baseball: {
    name: "Baseball",
    color: "text-[#3B82F6]",
    bgColor: "bg-[#3B82F6]/10",
    borderColor: "border-[#3B82F6]/30",
    icon: "⚾",
  },
  uncategorized: {
    name: "Uncategorized",
    color: "text-white/60",
    bgColor: "bg-white/5",
    borderColor: "border-white/10",
    icon: "📦",
  },
};

export function CategoryWing({ category, cards, isActive }: CategoryWingProps) {
  const config = categoryConfig[category];
  const previewCards = cards.slice(0, 3);

  if (cards.length === 0) {
    return null;
  }

  return (
    <Link
      href={`/my-cards?category=${category}`}
      className={`group block rounded-3xl border-2 ${config.borderColor} ${config.bgColor} p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${isActive ? "ring-2 ring-white/30" : ""}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <h3 className={`text-xl font-bold ${config.color}`}>{config.name}</h3>
        </div>
        <span className={`text-sm font-medium ${config.color} opacity-80`}>
          {cards.length} {cards.length === 1 ? "card" : "cards"}
        </span>
      </div>

      <div className="flex items-center justify-center gap-2 py-4">
        {previewCards.map((card, index) => (
          <div
            key={card.id}
            className="relative w-20 h-28 md:w-24 md:h-32 rounded-lg overflow-hidden shadow-lg transition-transform duration-300"
            style={{
              transform: `rotate(${(index - 1) * 8}deg)`,
              zIndex: previewCards.length - index,
            }}
          >
            <img
              src={getImageUrl(card.imageUrl)}
              alt={card.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        ))}
        {cards.length > 3 && (
          <div
            className={`w-20 h-28 md:w-24 md:h-32 rounded-lg ${config.bgColor} border-2 ${config.borderColor} flex items-center justify-center`}
            style={{ transform: "rotate(12deg)" }}
          >
            <span className={`text-lg font-bold ${config.color}`}>
              +{cards.length - 3}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center mt-4">
        <span
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.bgColor} ${config.color} text-sm font-medium group-hover:bg-white/10 transition-colors`}
        >
          Enter Wing
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
            className="transition-transform group-hover:translate-x-1"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

export { categoryConfig };
