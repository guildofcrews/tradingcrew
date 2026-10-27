"use client";

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Card, CardValue, Category } from "@/lib/cards";

const MAX_SIDE = 24;

type CardSnap = {
  id: string;
  title: string;
  imageUrl: string;
  category: Category | null;
  setName?: string | null;
  setCode?: string | null;
  cardNumber?: string | null;
  createdAt: string;
  price?: CardValue | null;
  officialImageUrl?: string | null;
  preferKidPhoto?: boolean;
  tcgdexId?: string | null;
};

type Draft = { want: CardSnap[]; give: CardSnap[] };

const EMPTY: Draft = { want: [], give: [] };

type Store = { draft: Draft; listeners: Set<() => void>; hydrated: boolean };

const stores = new Map<string, Store>();

function storageKey(ownerId: string) {
  return `tc-trade-draft:${ownerId}`;
}

function snap(card: Card): CardSnap {
  return {
    id: card.id,
    title: card.title,
    imageUrl: card.imageUrl,
    category: card.category,
    setName: card.setName ?? null,
    setCode: card.setCode ?? null,
    cardNumber: card.cardNumber ?? null,
    createdAt: card.createdAt,
    price: card.category === "pokemon" ? card.price ?? null : null,
    officialImageUrl: card.officialImageUrl ?? null,
    preferKidPhoto: card.preferKidPhoto === true,
    tcgdexId: card.tcgdexId ?? null,
  };
}

function parseDraft(raw: string): Draft | null {
  try {
    const value = JSON.parse(raw) as Partial<Draft>;
    const read = (list: unknown): CardSnap[] => {
      if (!Array.isArray(list)) return [];
      return list.filter(
        (item): item is CardSnap =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as CardSnap).id === "string" &&
          typeof (item as CardSnap).title === "string" &&
          typeof (item as CardSnap).imageUrl === "string"
      );
    };
    return { want: read(value.want), give: read(value.give) };
  } catch {
    return null;
  }
}

function storeFor(ownerId: string): Store {
  let store = stores.get(ownerId);
  if (!store) {
    store = { draft: EMPTY, listeners: new Set(), hydrated: false };
    stores.set(ownerId, store);
  }
  if (!store.hydrated && typeof window !== "undefined") {
    store.hydrated = true;
    try {
      const raw = sessionStorage.getItem(storageKey(ownerId));
      const parsed = raw ? parseDraft(raw) : null;
      if (parsed) store.draft = parsed;
    } catch {
      // Ignore private-mode storage failures and keep the empty draft.
    }
  }
  return store;
}

function getSnapshot(ownerId: string): Draft {
  return storeFor(ownerId).draft;
}

function subscribe(ownerId: string, listener: () => void) {
  const store = storeFor(ownerId);
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

function writeDraft(ownerId: string, draft: Draft) {
  const store = storeFor(ownerId);
  store.draft = draft;
  store.hydrated = true;
  try {
    sessionStorage.setItem(storageKey(ownerId), JSON.stringify(draft));
  } catch {
    // The in-memory draft still works for this visit.
  }
  store.listeners.forEach((listener) => listener());
}

function applyToggle(ownerId: string, side: "want" | "give", card: Card, notify: (message: string | null) => void) {
  const current = getSnapshot(ownerId);
  const list = current[side];
  const other = side === "want" ? current.give : current.want;
  if (list.some((item) => item.id === card.id)) {
    writeDraft(ownerId, { ...current, [side]: list.filter((item) => item.id !== card.id) });
    notify(null);
    return;
  }
  if (card.locked) {
    notify("That card is already promised in a trade.");
    return;
  }
  if (other.some((item) => item.id === card.id)) {
    notify("A card can't be on both sides.");
    return;
  }
  if (list.length >= MAX_SIDE) {
    notify(`You can pick up to ${MAX_SIDE} cards on each side.`);
    return;
  }
  writeDraft(ownerId, { ...current, [side]: [...list, snap(card)] });
  notify(null);
}

interface DraftApi {
  ownerId: string;
  draft: Draft;
  notice: string | null;
  toggleWant: (card: Card) => void;
  toggleGive: (card: Card) => void;
  clear: () => void;
}

const DraftContext = createContext<DraftApi | null>(null);

export function TradeDraftProvider({ ownerId, children }: { ownerId: string; children: ReactNode }) {
  const draft = useSyncExternalStore(
    (listener) => subscribe(ownerId, listener),
    () => getSnapshot(ownerId),
    () => EMPTY
  );
  const [notice, setNotice] = useState<string | null>(null);

  const api: DraftApi = {
    ownerId,
    draft,
    notice,
    toggleWant: (card) => applyToggle(ownerId, "want", card, setNotice),
    toggleGive: (card) => applyToggle(ownerId, "give", card, setNotice),
    clear: () => {
      writeDraft(ownerId, { want: [], give: [] });
      setNotice(null);
    },
  };

  return <DraftContext.Provider value={api}>{children}</DraftContext.Provider>;
}

export function useTradeDraft() {
  const value = useContext(DraftContext);
  if (!value) throw new Error("Trade draft is only available while viewing a shared gallery.");
  return value;
}
