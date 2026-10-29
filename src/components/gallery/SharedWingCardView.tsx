"use client";

import { CardSelectGrid } from "@/components/trades/CardSelectGrid";
import { useTradeDraft } from "@/components/trades/TradeDraft";
import type { CardDisplay } from "@/lib/card-sets";
import type { Card } from "@/lib/cards";
import { CardCarousel } from "./CardCarousel";
import { CardRoom } from "./CardRoom";

/** Visitor grid, carousel, or room. Tapping the front card picks it for a trade. */
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

  if (display === "carousel" || display === "room") {
    const stageKey = cards.map((card) => card.id).join("\0");
    if (display === "room") {
      return (
        <CardRoom key={stageKey} cards={cards} purpose="select" onOpen={toggleWant} selectedIds={selected} />
      );
    }
    return (
      <CardCarousel key={stageKey} cards={cards} purpose="select" onOpen={toggleWant} selectedIds={selected} />
    );
  }

  return (
    <div className={gridClassName}>
      <CardSelectGrid cards={cards} side="want" variant="gallery" />
    </div>
  );
}
