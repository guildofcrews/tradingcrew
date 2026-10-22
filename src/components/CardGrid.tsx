"use client";

import Image from "next/image";
import { useState } from "react";
import type { Card } from "@/db/schema";
import { deleteCard } from "@/app/actions/cards";

interface CardGridProps {
  cards: Card[];
  showDeleteButton?: boolean;
}

export function CardGrid({ cards, showDeleteButton = false }: CardGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          showDeleteButton={showDeleteButton}
        />
      ))}
    </div>
  );
}

interface CardItemProps {
  card: Card;
  showDeleteButton: boolean;
}

function CardItem({ card, showDeleteButton }: CardItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this card?")) {
      return;
    }

    setIsDeleting(true);
    await deleteCard(card.id);
    setIsDeleting(false);
  };

  const categoryLabel = {
    sports: "🏈 Sports",
    pokemon: "⚡ Pokémon",
    other: "🎴 Other",
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden border-2 border-[#2B3A67]/10 hover:border-[#F96D3B]/30 hover:shadow-lg transition-all duration-200 group">
      <div className="relative aspect-[3/4]">
        <Image
          src={card.imageUrl}
          alt={card.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {showDeleteButton && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 disabled:opacity-50 transition-all duration-200 flex items-center justify-center"
            aria-label="Delete card"
          >
            {isDeleting ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <span>×</span>
            )}
          </button>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-[#2B3A67] text-sm truncate">
          {card.title}
        </h3>
        {card.category && (
          <p className="text-xs text-[#2B3A67]/60 mt-1">
            {categoryLabel[card.category]}
          </p>
        )}
      </div>
    </div>
  );
}
