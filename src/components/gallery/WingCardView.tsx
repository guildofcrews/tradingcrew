"use client";

import { useState } from "react";
import type { CardDisplay } from "@/lib/card-sets";
import type { Card } from "@/lib/cards";
import { CardCarousel } from "./CardCarousel";
import { CardFrame } from "./CardFrame";
import { EditCardModal } from "./EditCardModal";

/** Owner grid or carousel. Tapping the centered card opens the edit modal. */
export function WingCardView({
  cards,
  display,
  gridClassName,
}: {
  cards: Card[];
  display: CardDisplay;
  gridClassName: string;
}) {
  const [editing, setEditing] = useState<Card | null>(null);
  const [prefer, setPrefer] = useState<Record<string, boolean>>({});
  const shown = cards.map((card) =>
    prefer[card.id] === undefined ? card : { ...card, preferKidPhoto: prefer[card.id] },
  );
  const editingShown = editing ? (shown.find((card) => card.id === editing.id) ?? editing) : null;

  if (display === "carousel") {
    return (
      <>
        <CardCarousel key={shown.map((card) => card.id).join("\0")} cards={shown} onOpen={setEditing} ownerActions />
        <EditCardModal
          card={editingShown}
          isOpen={editingShown != null}
          onClose={() => setEditing(null)}
          onArtSaved={(next) => {
            if (!editingShown) return;
            setPrefer((current) => ({ ...current, [editingShown.id]: next }));
          }}
        />
      </>
    );
  }

  return (
    <div className={gridClassName}>
      {cards.map((card) => (
        <CardFrame key={card.id} card={card} variant="gallery" />
      ))}
    </div>
  );
}
