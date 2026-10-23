"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { categoryConfig, CategoryType } from "./CategoryWing";

interface CategoryFilterProps {
  counts: Record<CategoryType | "all", number>;
}

export function CategoryFilter({ counts }: CategoryFilterProps) {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";

  const categories: { key: CategoryType | "all"; label: string }[] = [
    { key: "all", label: "All Cards" },
    { key: "pokemon", label: "Pokémon" },
    { key: "basketball", label: "Basketball" },
    { key: "baseball", label: "Baseball" },
    { key: "football", label: "Football" },
    { key: "uncategorized", label: "Uncategorized" },
  ];

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {categories.map(({ key, label }) => {
        const count = counts[key] || 0;
        if (key !== "all" && count === 0) return null;

        const isActive = activeCategory === key || (key === "all" && !searchParams.get("category"));
        const config = key !== "all" ? categoryConfig[key as CategoryType] : null;

        return (
          <Link
            key={key}
            href={key === "all" ? "/my-cards" : `/my-cards?category=${key}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              isActive
                ? "bg-white text-[#0f1629]"
                : config
                  ? `${config.bgColor} ${config.color} hover:bg-white/20`
                  : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            {label}
            <span className="ml-2 opacity-60">({count})</span>
          </Link>
        );
      })}
    </div>
  );
}
