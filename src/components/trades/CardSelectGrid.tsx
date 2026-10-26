"use client";

import { CardFrame } from "@/components/gallery/CardFrame";
import type { Card } from "@/lib/cards";
import { useTradeDraft } from "./TradeDraft";

export function CardSelectGrid({
  cards,
  side,
  variant,
}: {
  cards: Card[];
  side: "want" | "give";
  variant: "compact" | "gallery";
}) {
  const { draft, toggleWant, toggleGive } = useTradeDraft();
  const picked = side === "want" ? draft.want : draft.give;
  const selected = new Set(picked.map((card) => card.id));
  const toggle = side === "want" ? toggleWant : toggleGive;

  return (
    <>
      {cards.map((card) => (
        <CardFrame
          key={card.id}
          card={card}
          variant={variant}
          mode="select"
          selected={selected.has(card.id)}
          onToggle={toggle}
        />
      ))}
    </>
  );
}
