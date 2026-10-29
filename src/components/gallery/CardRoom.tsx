"use client";

import { useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { Card } from "@/lib/cards";
import {
  ringDelta,
  ringFacingAngle,
  ringInWindow,
  ringMetrics,
  ringOpacity,
  ringShowsArt,
  ringWraps,
} from "@/lib/ring-spin";
import { CardPhoto } from "./CardPhoto";
import { CardStageControls, CardStageMeta, stageActivateLabel } from "./CardStageChrome";
import { useRingSpin } from "./useRingSpin";
import styles from "./CardRoom.module.css";

interface Props {
  cards: readonly Card[];
  /** Front card tap. Owner opens the edit modal. A shared gallery toggles a trade pick. */
  onOpen?: (card: Card) => void;
  selectedIds?: ReadonlySet<string>;
  purpose?: "detail" | "select";
  ownerActions?: boolean;
}

interface RoomSize {
  cardWidth: number;
  radius: number;
  step: number;
  perspective: number;
}

function measureRoom(count: number, viewportWidth: number): RoomSize {
  const narrow = viewportWidth <= 560;
  const cardWidth = narrow ? Math.max(112, Math.min(viewportWidth * 0.42, 168)) : 190;
  const gap = narrow ? 22 : 48;
  const metrics = ringMetrics(count, cardWidth, gap);
  return { cardWidth, radius: metrics.radius, step: metrics.step, perspective: narrow ? 1100 : 1500 };
}

/**
 * Cards stand in a ring around the viewer. Dragging spins the ring and snaps to a card.
 */
export function CardRoom({ cards, onOpen, selectedIds, purpose = "detail", ownerActions = false }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<RoomSize>(measureRoom(Math.max(cards.length, 1), 1200));
  const applyRef = useRef<(offset: number) => void>(() => {});
  const layout = measureRoom(Math.max(cards.length, 1), 1200);

  const wraps = ringWraps(cards.length);
  const spin = useRingSpin(cards.length, sizeRef, (offset) => applyRef.current(offset), { wrap: wraps });

  useLayoutEffect(() => {
    applyRef.current = (offset: number) => {
      const root = viewportRef.current;
      if (!root) return;
      const { step } = sizeRef.current;
      for (const node of root.querySelectorAll<HTMLElement>("[data-ring-index]")) {
        const cardIndex = Number(node.dataset.ringIndex);
        const delta = ringDelta(cardIndex, offset, cards.length, wraps);
        node.style.setProperty("--angle", `${ringFacingAngle(delta, step)}deg`);
        node.style.setProperty("--fade", ringOpacity(delta).toFixed(3));
        node.dataset.front = Math.abs(delta) < 0.5 ? "true" : "false";
      }
    };
    const node = viewportRef.current;
    if (!node) return;
    const next = measureRoom(Math.max(cards.length, 1), node.clientWidth || window.innerWidth);
    sizeRef.current = next;
    node.style.setProperty("--card-w", `${next.cardWidth}px`);
    node.style.setProperty("--radius", `${next.radius}px`);
    node.style.setProperty("--room-perspective", `${next.perspective}px`);
    applyRef.current(spin.offsetRef.current.offset);
  });

  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      const next = measureRoom(Math.max(cards.length, 1), node.clientWidth || window.innerWidth);
      sizeRef.current = next;
      node.style.setProperty("--card-w", `${next.cardWidth}px`);
      node.style.setProperty("--radius", `${next.radius}px`);
      node.style.setProperty("--room-perspective", `${next.perspective}px`);
      applyRef.current(spin.offsetRef.current.offset);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [cards.length, spin.offsetRef]);

  const index = cards.length === 0 ? 0 : spin.index % cards.length;
  const card = cards[index];
  if (!card) return null;

  function activate(cardIndex: number) {
    if (!spin.spinTo(cardIndex)) {
      const chosen = cards[cardIndex];
      if (chosen) onOpen?.(chosen);
    }
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!spin.endPointer(event)) return;
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const raw = under?.closest<HTMLElement>("[data-ring-index]")?.dataset.ringIndex;
    if (raw == null || raw === "") return;
    const cardIndex = Number(raw);
    if (Number.isNaN(cardIndex)) return;
    activate(cardIndex);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      spin.go(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      spin.go(-1);
    } else if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
      event.preventDefault();
      const current = cards[index];
      if (current) onOpen?.(current);
    }
  }

  const mounted = cards.flatMap((item, cardIndex) =>
    ringInWindow(cardIndex, index, cards.length, wraps) ? [{ item, cardIndex }] : [],
  );

  return (
    <section
      className={styles.root}
      tabIndex={0}
      aria-label={`${card.title}, ${index + 1} of ${cards.length}`}
      onKeyDown={onKeyDown}
    >
      <div
        ref={viewportRef}
        className={spin.dragging ? `${styles.viewport} ${styles.dragging}` : styles.viewport}
        style={
          {
            "--card-w": `${layout.cardWidth}px`,
            "--radius": `${layout.radius}px`,
            "--room-perspective": `${layout.perspective}px`,
          } as CSSProperties
        }
        onPointerDown={spin.onPointerDown}
        onPointerMove={spin.onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={spin.onPointerCancel}
        onDragStart={(event) => event.preventDefault()}
      >
        <div className={styles.stage}>
          <div className={styles.floor} aria-hidden="true" />
          <div className={styles.ring}>
            {mounted.map(({ item, cardIndex }) => {
              const delta = ringDelta(cardIndex, index, cards.length, wraps);
              const picked = selectedIds?.has(item.id) ?? false;
              const front = cardIndex === index;
              const showArt = ringShowsArt(delta);
              return (
                <div
                  key={item.id}
                  className={styles.screen}
                  data-ring-index={cardIndex}
                  data-front={front ? "true" : "false"}
                  style={
                    {
                      "--angle": `${ringFacingAngle(delta, layout.step)}deg`,
                      "--fade": ringOpacity(delta).toFixed(3),
                    } as CSSProperties
                  }
                >
                  <button
                    type="button"
                    className={picked ? `${styles.card} ${styles.picked}` : styles.card}
                    aria-label={front ? stageActivateLabel(item, purpose, picked) : `Show ${item.title}`}
                    aria-pressed={purpose === "select" && front ? picked : undefined}
                    aria-current={front ? "true" : undefined}
                    tabIndex={-1}
                    onClick={(event) => {
                      if (event.detail !== 0) return;
                      activate(cardIndex);
                    }}
                  >
                    {showArt && (item.imageUrl || item.officialImageUrl) ? (
                      <CardPhoto
                        card={item}
                        alt=""
                        sizes={front ? "(max-width: 560px) 52vw, 340px" : "180px"}
                        className={styles.img}
                        priority={front}
                      />
                    ) : (
                      <span className={styles.blank}>{showArt ? "No photo" : item.title}</span>
                    )}
                  </button>
                  <span className={styles.back} aria-hidden="true" />
                  <span className={styles.plinth} aria-hidden="true" />
                  <span className={styles.glow} aria-hidden="true" />
                </div>
              );
            })}
          </div>
        </div>
        <div className={styles.vignette} aria-hidden="true" />
      </div>

      <CardStageControls
        index={index}
        count={cards.length}
        onPrevious={() => spin.go(-1)}
        onNext={() => spin.go(1)}
        stopAtEnds={!wraps}
      />
      <CardStageMeta card={card} selected={selectedIds?.has(card.id) ?? false} ownerActions={ownerActions} />
    </section>
  );
}
