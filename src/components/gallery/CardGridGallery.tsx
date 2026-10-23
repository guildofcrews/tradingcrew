"use client";

import { useState } from "react";
import type { Card } from "@/db/schema";
import { getImageUrl } from "@/lib/images";
import { EditCardModal } from "./EditCardModal";
import { categoryConfig, CategoryType } from "./CategoryWing";

interface CardGridGalleryProps {
  cards: Card[];
  title?: string;
  showCategoryBadge?: boolean;
}

export function CardGridGallery({
  cards,
  title,
  showCategoryBadge = true,
}: CardGridGalleryProps) {
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  if (cards.length === 0) {
    return null;
  }

  return (
    <>
      <section className="py-8">
        {title && (
          <h2 className="text-xl md:text-2xl font-bold text-white mb-6">
            {title}
          </h2>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
  const config = categoryConfig[categoryKey];

  const borderColors: Record<CategoryType, string> = {
    pokemon: "border-[#F5C542]",
    basketball: "border-[#F96D3B]",
    football: "border-[#22C55E]",
    baseball: "border-[#3B82F6]",
    uncategorized: "border-white/20",
  };

  return (
    <div
      onClick={onEdit}
      className={`group relative rounded-2xl overflow-hidden border-2 ${borderColors[categoryKey]} bg-[#1a1f35] cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/30`}
    >
      <div className="aspect-[3/4] relative">
        <img
          src={getImageUrl(card.imageUrl)}
          alt={card.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button className="w-full px-3 py-2 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-lg hover:bg-white/30 transition-colors">
            Edit Card
          </button>
        </div>
      </div>

      <div className="p-3 bg-[#0f1629]">
        <h3 className="font-medium text-white text-sm truncate mb-1">
          {card.title}
        </h3>
        {showCategoryBadge && (
          <span
            className={`inline-flex items-center gap-1 text-xs ${config.color}`}
          >
            <span>{config.icon}</span>
            <span>{config.name}</span>
          </span>
        )}
      </div>
    </div>
  );
}
