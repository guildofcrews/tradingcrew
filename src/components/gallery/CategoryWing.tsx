"use client";

import Link from "next/link";
import type { Card } from "@/db/schema";
import { CardPhoto } from "./CardPhoto";

export type CategoryType = "pokemon" | "basketball" | "baseball" | "football" | "uncategorized";

interface CategoryWingProps {
  category: CategoryType;
  cards: Card[];
}

const categoryConfig: Record<
  CategoryType,
  {
    name: string;
    eyebrow: string;
    colorHex: string;
  }
> = {
  pokemon: {
    name: "Pokémon",
    eyebrow: "TRAINERS & MONSTERS",
    colorHex: "#F5C542",
  },
  basketball: {
    name: "Basketball",
    eyebrow: "COURTSIDE LEGENDS",
    colorHex: "#F96D3B",
  },
  football: {
    name: "Football",
    eyebrow: "GRIDIRON GREATS",
    colorHex: "#22C55E",
  },
  baseball: {
    name: "Baseball",
    eyebrow: "DIAMOND CLASSICS",
    colorHex: "#3B82F6",
  },
  uncategorized: {
    name: "Uncategorized",
    eyebrow: "MISC COLLECTION",
    colorHex: "#6B7280",
  },
};

function CategoryIcon({ category, color, size = 26 }: { category: CategoryType; color: string; size?: number }) {
  const icons: Record<CategoryType, React.ReactNode> = {
    pokemon: (
      <g stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3L13.8 8.2L19 8.2L14.8 11.6L16.4 17L12 13.8L7.6 17L9.2 11.6L5 8.2L10.2 8.2L12 3Z" />
        <circle cx="17" cy="5" r="1.5" fill={color} stroke="none" />
      </g>
    ),
    basketball: (
      <g stroke={color} strokeWidth="1.5" fill="none">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18" />
        <path d="M3 12h18" />
        <path d="M5.6 5.6c2.2 2.4 2.2 10.4 0 12.8" />
        <path d="M18.4 5.6c-2.2 2.4-2.2 10.4 0 12.8" />
      </g>
    ),
    football: (
      <g stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="12" rx="8" ry="4.5" transform="rotate(45 12 12)" />
        <path d="M12 8v8" />
        <path d="M9.5 10h5" />
        <path d="M9.5 12h5" />
        <path d="M9.5 14h5" />
      </g>
    ),
    baseball: (
      <g stroke={color} strokeWidth="1.5" fill="none">
        <circle cx="12" cy="12" r="9" />
        <path d="M6 6c1.5 2.5 1.5 9.5 0 12" />
        <path d="M18 6c-1.5 2.5-1.5 9.5 0 12" />
      </g>
    ),
    uncategorized: (
      <g stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="9" width="14" height="11" rx="2" />
        <path d="M8 9V6a4 4 0 018 0v3" />
      </g>
    ),
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
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

  const doorWidth = 210;
  const doorHeight = 320;

  return (
    <div className="flex flex-col items-center w-full max-w-[220px]">
      {/* Eyebrow Title */}
      <p
        className="text-[11px] font-bold tracking-[0.25em] mb-4"
        style={{ color: config.colorHex }}
      >
        {config.eyebrow}
      </p>

      {/* Door Container */}
      <div className="relative" style={{ width: doorWidth, height: doorHeight }}>
        {/* Floor Glow - more visible */}
        <div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 blur-2xl"
          style={{
            width: doorWidth * 0.9,
            height: 40,
            backgroundColor: config.colorHex,
            opacity: 0.35,
            borderRadius: "100%",
          }}
        />

        {/* Arched Door Link */}
        <Link
          href={`/my-cards?category=${category}`}
          className="relative block w-full h-full group"
        >
          <svg
            viewBox={`0 0 ${doorWidth} ${doorHeight}`}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Outer Arch Border - 2px solid stroke, fully saturated */}
            <path
              d={`M 3 ${doorHeight} 
                  L 3 95 
                  Q 3 3, ${doorWidth / 2} 3 
                  Q ${doorWidth - 3} 3, ${doorWidth - 3} 95 
                  L ${doorWidth - 3} ${doorHeight}`}
              fill="none"
              stroke={config.colorHex}
              strokeWidth="2"
            />

            {/* Inner Arch Panel - ~10px padding, lighter fill */}
            <path
              d={`M 16 ${doorHeight} 
                  L 16 100 
                  Q 16 18, ${doorWidth / 2} 18 
                  Q ${doorWidth - 16} 18, ${doorWidth - 16} 100 
                  L ${doorWidth - 16} ${doorHeight} 
                  Z`}
              fill="#1a2036"
              stroke="#2a3050"
              strokeWidth="1"
            />

            {/* Icon Oval Badge - horizontal 64x44 */}
            <ellipse
              cx={doorWidth / 2}
              cy="65"
              rx="32"
              ry="22"
              fill="none"
              stroke={config.colorHex}
              strokeWidth="1.5"
            />
          </svg>

          {/* Content Overlay */}
          <div className="absolute inset-0 flex flex-col items-center">
            {/* Icon - centered in oval */}
            <div
              className="absolute flex items-center justify-center"
              style={{ top: 52, left: "50%", transform: "translateX(-50%)" }}
            >
              <CategoryIcon category={category} color={config.colorHex} size={26} />
            </div>

            {/* Category Name - 28px bold serif */}
            <h3
              className="absolute text-white text-[28px] font-bold font-serif"
              style={{ top: 100 }}
            >
              {config.name}
            </h3>

            {/* Accent Divider - 32px wide */}
            <div
              className="absolute rounded-full"
              style={{
                top: 145,
                width: 32,
                height: 3,
                backgroundColor: config.colorHex,
              }}
            />

            {/* Card Count Row - 14px muted text */}
            <div
              className="absolute flex items-center gap-2"
              style={{ top: 162 }}
            >
              <span className="text-white/50 text-[14px]">
                {cardCount} {cardCount === 1 ? "card" : "cards"}
              </span>
              {/* Vertical Accent Pill - 6x22 */}
              <div
                className="rounded-full"
                style={{
                  width: 6,
                  height: 22,
                  backgroundColor: config.colorHex,
                }}
              />
            </div>

            {/* Thumbnail Slots - square-ish, 6px corners */}
            <div
              className="absolute flex gap-3"
              style={{ top: 200, left: "50%", transform: "translateX(-50%)" }}
            >
              {/* Slot 1 */}
              <div
                className="overflow-hidden"
                style={{
                  position: "relative",
                  width: 72,
                  height: 88,
                  borderRadius: 6,
                  backgroundColor: "#0d1220",
                  border: `1px solid ${config.colorHex}40`,
                }}
              >
                {previewCards[0] && (
                  <CardPhoto card={previewCards[0]} alt="" sizes="72px" className="object-cover" />
                )}
              </div>
              {/* Slot 2 */}
              <div
                className="overflow-hidden"
                style={{
                  position: "relative",
                  width: 72,
                  height: 88,
                  borderRadius: 6,
                  backgroundColor: "#0d1220",
                  border: `1px solid ${config.colorHex}40`,
                }}
              >
                {previewCards[1] && (
                  <CardPhoto card={previewCards[1]} alt="" sizes="72px" className="object-cover" />
                )}
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Enter Wing Link - white, 15px, weight 600 */}
      <Link
        href={`/my-cards?category=${category}`}
        className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-white hover:opacity-80 transition-opacity"
      >
        Enter wing
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
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

export { categoryConfig };
