import type { WingSlug } from "@/lib/cards";

export function WingIcon({ slug, size = 48 }: { slug: WingSlug; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (slug) {
    case "pokemon":
      return (
        <svg {...common}>
          <path d="M24 4 L28.5 19.5 L44 24 L28.5 28.5 L24 44 L19.5 28.5 L4 24 L19.5 19.5 Z" />
          <circle cx="38" cy="10" r="3" />
        </svg>
      );
    case "basketball":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="19" />
          <path d="M5 24h38M24 5v38M11 10c6 6 6 22 0 28M37 10c-6 6-6 22 0 28" />
        </svg>
      );
    case "football":
      return (
        <svg {...common}>
          <ellipse cx="24" cy="24" rx="20" ry="12" transform="rotate(-35 24 24)" />
          <path d="M18 30 L30 18M20 22l3 3M23 19l3 3M25 25l3 3" />
        </svg>
      );
    case "baseball":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="19" />
          <path d="M13 9c5 8 5 22 0 30M35 9c-5 8-5 22 0 30" />
          <path d="M12 15l3-1M13 21h3M13 27h3M12 33l3 1M36 15l-3-1M35 21h-3M35 27h-3M36 33l-3 1" />
        </svg>
      );
    case "uncategorized":
      return (
        <svg {...common}>
          <rect x="12" y="8" width="24" height="32" rx="4" />
          <path d="M20 20a4 4 0 1 1 5 4c-1 .5-1 1.5-1 2.5M24 32v.5" />
        </svg>
      );
  }
}
