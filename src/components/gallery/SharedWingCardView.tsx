"use client";

import { CardSelectGrid } from "@/components/trades/CardSelectGrid";
import { useTradeDraft } from "@/components/trades/TradeDraft";
import type { CardDisplay } from "@/lib/card-sets";
import type { Card } from "@/lib/cards";
import { CardCarousel } from "./CardCarousel";

/** Visitor grid or carousel. Tapping the centered card picks it for a trade. */
export function SharedWingCardView({
  cards,
  display,
  gridClassName,
}: {
  cards: Card[];
  display: CardDisplay;
  gridClassName: string;
}) {
  const { draft, toggleWant } = useTradeDraft();
  const selected = new Set(draft.want.map((card) => card.id));

  if (display === "carousel") {
    return (
      <CardCarousel
        key={cards.map((card) => card.id).join("\0")}
        cards={cards}
        purpose="select"
        onOpen={toggleWant}
        selectedIds={selected}
      />
    );
  }

  return (
    <div className={gridClassName}>
      <CardSelectGrid cards={cards} side="want" variant="gallery" />
    </div>
  );
}
