"use client";

import { useState } from "react";
import Link from "next/link";
import type { Card } from "@/db/schema";
import { CardPhoto } from "./CardPhoto";
import { EditCardModal } from "./EditCardModal";
import { CategoryType } from "./CategoryWing";

interface CardGridGalleryProps {
  cards: Card[];
  title?: string;
  showCategoryBadge?: boolean;
  showViewAll?: boolean;
}

const categoryDisplay: Record<CategoryType, { name: string; color: string }> = {
  pokemon: { name: "Pokémon", color: "text-[#F5C542]" },
  basketball: { name: "Basketball", color: "text-[#F96D3B]" },
  football: { name: "Football", color: "text-[#22C55E]" },
  baseball: { name: "Baseball", color: "text-[#3B82F6]" },
  uncategorized: { name: "Uncategorized", color: "text-white/40" },
};

const borderColors: Record<CategoryType, string> = {
  pokemon: "border-[#F5C542]/60",
  basketball: "border-[#F96D3B]/60",
  football: "border-[#22C55E]/60",
  baseball: "border-[#3B82F6]/60",
  uncategorized: "border-white/20",
};

export function CardGridGallery({
  cards,
  title,
  showCategoryBadge = true,
  showViewAll = false,
}: CardGridGalleryProps) {
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  if (cards.length === 0) {
    return null;
  }

  return (
    <>
      <section>
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-xl md:text-2xl font-bold text-white"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {title}
            </h2>
            {showViewAll && (
              <Link
                href="/my-cards"
                className="text-white/50 text-sm underline hover:text-white/80 transition-colors"
              >
                View all
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {cards.map((card) => (
            <GalleryCard
              key={card.id}
              card={card}
              onEdit={() => setEditingCard(card)}
              showCategoryBadge={showCategoryBadge}
            />
          ))}
        </div>
      </section>

      <EditCardModal
        card={editingCard}
        isOpen={!!editingCard}
        onClose={() => setEditingCard(null)}
      />
    </>
  );
}

interface GalleryCardProps {
  card: Card;
  onEdit: () => void;
  showCategoryBadge: boolean;
}

function GalleryCard({ card, onEdit, showCategoryBadge }: GalleryCardProps) {
  const categoryKey = (card.category || "uncategorized") as CategoryType;
  const display = categoryDisplay[categoryKey];
  const borderColor = borderColors[categoryKey];

  return (
    <div
      onClick={onEdit}
      className={`group relative rounded-lg overflow-hidden border-2 ${borderColor} bg-[#1a1f35] cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/30`}
    >
      <div className="aspect-[3/4] relative bg-[#0f1629]">
        <CardPhoto card={card} alt={card.title} sizes="240px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="absolute bottom-0 left-0 right-0 p-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button className="w-full px-2 py-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded hover:bg-white/30 transition-colors">
            Edit
          </button>
        </div>
      </div>

      <div className="p-2.5 bg-[#0f1629]">
        <h3 className="font-medium text-white text-sm truncate mb-0.5">
          {card.title}
        </h3>
        {showCategoryBadge && (
          <span className={`text-xs ${display.color}`}>
            {display.name}
          </span>
        )}
      </div>
    </div>
  );
}
