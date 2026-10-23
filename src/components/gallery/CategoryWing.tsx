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
  {
    name: string;
    eyebrow: string;
    colorHex: string;
    glowColor: string;
  }
> = {
  pokemon: {
    name: "Pokémon",
    eyebrow: "TRAINERS & MONSTERS",
    colorHex: "#F5C542",
    glowColor: "rgba(245, 197, 66, 0.4)",
  },
  basketball: {
    name: "Basketball",
    eyebrow: "COURTSIDE LEGENDS",
    colorHex: "#F96D3B",
    glowColor: "rgba(249, 109, 59, 0.4)",
  },
  football: {
    name: "Football",
    eyebrow: "GRIDIRON GREATS",
    colorHex: "#22C55E",
    glowColor: "rgba(34, 197, 94, 0.4)",
  },
  baseball: {
    name: "Baseball",
    eyebrow: "DIAMOND CLASSICS",
    colorHex: "#3B82F6",
    glowColor: "rgba(59, 130, 246, 0.4)",
  },
  uncategorized: {
    name: "Uncategorized",
    eyebrow: "MISC COLLECTION",
    colorHex: "#6B7280",
    glowColor: "rgba(107, 114, 128, 0.3)",
  },
};

function CategoryIcon({ category, color }: { category: CategoryType; color: string }) {
  const icons: Record<CategoryType, React.ReactNode> = {
    pokemon: (
      <g stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L14.4 8.8H21.2L15.8 13.2L18 20L12 15.6L6 20L8.2 13.2L2.8 8.8H9.6L12 2Z" />
        <circle cx="18" cy="4" r="1.5" fill={color} stroke="none" />
      </g>
    ),
    basketball: (
      <g stroke={color} strokeWidth="1.5" fill="none">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18" />
        <path d="M3 12h18" />
        <path d="M5.5 5.5c2.5 2.5 2.5 10.5 0 13" />
        <path d="M18.5 5.5c-2.5 2.5-2.5 10.5 0 13" />
      </g>
    ),
    football: (
      <g stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="12" rx="9" ry="5" transform="rotate(45 12 12)" />
        <path d="M12 7v10" />
        <path d="M9 9h6" />
        <path d="M9 12h6" />
        <path d="M9 15h6" />
      </g>
    ),
    baseball: (
      <g stroke={color} strokeWidth="1.5" fill="none">
        <circle cx="12" cy="12" r="9" />
        <path d="M5.5 5.5c2 3 2 9 0 13" />
        <path d="M18.5 5.5c-2 3-2 9 0 13" />
      </g>
    ),
    uncategorized: (
      <g stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="8" width="16" height="13" rx="2" />
        <path d="M8 8V5a4 4 0 018 0v3" />
      </g>
    ),
  };

  return (
    <svg width="28" height="28" viewBox="0 0 24 24">
      {icons[category]}
    </svg>
  );
}

export function CategoryWing({ category, cards }: CategoryWingProps) {
  const config = categoryConfig[category];
  const previewCards = cards.slice(0, 2);
  const cardCount = cards.length;

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center">
      {/* Eyebrow Title */}
      <p
        className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] font-medium mb-3 sm:mb-4"
        style={{ color: config.colorHex }}
      >
        {config.eyebrow}
      </p>

      {/* Door Container with Glow */}
      <div className="relative w-full max-w-[180px] sm:max-w-[200px]">
        {/* Floor Glow */}
        <div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[70%] h-6 rounded-[100%] blur-lg opacity-60"
          style={{ backgroundColor: config.glowColor }}
        />

        {/* Arched Door */}
        <Link
          href={`/my-cards?category=${category}`}
          className="relative block group"
        >
          <svg
            viewBox="0 0 180 300"
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Outer Arch Border */}
            <path
              d="M8 300 L8 90 C8 20 90 8 90 8 C90 8 172 20 172 90 L172 300"
              fill="none"
              stroke={config.colorHex}
              strokeWidth="1.5"
              opacity="0.5"
            />

            {/* Inner Arch Panel Fill */}
            <path
              d="M20 300 L20 95 C20 35 90 25 90 25 C90 25 160 35 160 95 L160 300 Z"
              fill="#0d1220"
              stroke={config.colorHex}
              strokeWidth="1"
              opacity="0.25"
            />

            {/* Icon Circle */}
            <ellipse
              cx="90"
              cy="70"
              rx="24"
              ry="24"
              fill="none"
              stroke={config.colorHex}
              strokeWidth="1.2"
              opacity="0.7"
            />
          </svg>

          {/* Content overlay - positioned absolutely */}
          <div className="absolute inset-0 flex flex-col items-center pt-[15%]">
            {/* Icon */}
            <div className="mb-2">
              <CategoryIcon category={category} color={config.colorHex} />
            </div>

            {/* Category Name */}
            <h3
              className="text-white text-lg sm:text-xl font-bold mt-8 mb-2"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {config.name}
            </h3>

            {/* Stats Row */}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-white/50 text-xs sm:text-sm">
                {cardCount} {cardCount === 1 ? "card" : "cards"}
              </span>
              {/* Vertical Accent Pill */}
              <div
                className="w-1 h-5 rounded-full"
                style={{ backgroundColor: config.colorHex, opacity: 0.7 }}
              />
            </div>

            {/* Thumbnail Slots */}
            <div className="flex gap-2 mt-4 px-4">
              {/* Slot 1 */}
              <div
                className="w-[50px] h-[70px] sm:w-[55px] sm:h-[75px] rounded overflow-hidden"
                style={{
                  backgroundColor: "#0d1220",
                  border: `1px solid ${config.colorHex}40`,
                }}
              >
                {previewCards[0] && (
                  <img
                    src={getImageUrl(previewCards[0].imageUrl)}
                    alt={previewCards[0].title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              {/* Slot 2 */}
              <div
                className="w-[50px] h-[70px] sm:w-[55px] sm:h-[75px] rounded overflow-hidden"
                style={{
                  backgroundColor: "#0d1220",
                  border: `1px solid ${config.colorHex}40`,
                }}
              >
                {previewCards[1] && (
                  <img
                    src={getImageUrl(previewCards[1].imageUrl)}
                    alt={previewCards[1].title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Enter Wing Link */}
      <Link
        href={`/my-cards?category=${category}`}
        className="mt-5 inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium opacity-70 hover:opacity-100 transition-opacity"
        style={{ color: config.colorHex }}
      >
        Enter wing
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

export { categoryConfig };
