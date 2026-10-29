"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { galleryHref, type SetGroup } from "@/lib/card-sets";
import type { Wing } from "@/lib/cards";
import { collectionTotalFromCards } from "@/lib/pokemon-price/display";
import { CardPhoto } from "./CardPhoto";
import { CardStageControls } from "./CardStageChrome";
import { WingIcon } from "./WingIcon";
import { useRingSpin } from "./useRingSpin";
import chrome from "./CardStageChrome.module.css";
import styles from "./LibraryHall.module.css";

const BAY = 320;

interface Props {
  groups: readonly SetGroup[];
  wing: Wing;
  basePath: string;
  /** Doorway to stand at when the hall opens. */
  startIndex?: number;
}

/**
 * A corridor of set doorways. Dragging, scrolling, or the arrows walk forward.
 * Entering a doorway opens that set in the room.
 */
export function LibraryHall({ groups, wing, basePath, startIndex = 0 }: Props) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef({ cardWidth: 240 });
  const enteringRef = useRef<number | null>(null);
  const timer = useRef(0);
  const [entering, setEntering] = useState<number | null>(null);
  const start = Math.max(0, Math.min(Math.max(groups.length - 1, 0), startIndex));

  const spin = useRingSpin(
    groups.length,
    widthRef,
    (offset) => {
      const node = worldRef.current;
      if (!node || enteringRef.current != null) return;
      node.style.transform = `translateZ(${offset * BAY}px)`;
    },
    { wrap: false, start, axis: "any" },
  );

  const goRef = useRef(spin.go);
  useLayoutEffect(() => {
    goRef.current = spin.go;
    const node = worldRef.current;
    if (!node || enteringRef.current != null) return;
    node.style.transform = `translateZ(${spin.offsetRef.current.offset * BAY}px)`;
  });

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (enteringRef.current != null) return;
      event.preventDefault();
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (Math.abs(delta) < 12) return;
      goRef.current(delta > 0 ? 1 : -1);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const index = groups.length === 0 ? 0 : Math.max(0, Math.min(groups.length - 1, spin.index));
  const group = groups[index];
  if (!group) return null;

  function doorHref(doorIndex: number) {
    const door = groups[doorIndex];
    if (!door) return basePath;
    return galleryHref(basePath, {
      view: "halls",
      set: door.id,
      display: "room",
      at: String(doorIndex),
    });
  }

  function enter(doorIndex: number) {
    if (enteringRef.current != null || !groups[doorIndex]) return;
    enteringRef.current = doorIndex;
    const href = doorHref(doorIndex);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const node = worldRef.current;
    if (reduced || !node) {
      router.push(href);
      return;
    }
    setEntering(doorIndex);
    timer.current = window.setTimeout(() => router.push(href), 440);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!spin.endPointer(event)) return;
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const raw = under?.closest<HTMLElement>("[data-hall-index]")?.dataset.hallIndex;
    if (raw == null || raw === "") return;
    const doorIndex = Number(raw);
    if (Number.isNaN(doorIndex)) return;
    enter(doorIndex);
  }

  const total = collectionTotalFromCards(group.cards);
  const countLabel = `${group.cards.length} ${group.cards.length === 1 ? "card" : "cards"}`;

  return (
    <section
      className={styles.root}
      tabIndex={0}
      aria-label={`${group.name}, doorway ${index + 1} of ${groups.length}`}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          spin.go(1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          spin.go(-1);
        } else if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
          event.preventDefault();
          enter(index);
        }
      }}
    >
      <div
        ref={stageRef}
        className={spin.dragging ? `${styles.stage} ${styles.dragging}` : styles.stage}
        data-entering={entering == null ? undefined : "true"}
        onPointerDown={spin.onPointerDown}
        onPointerMove={spin.onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={spin.onPointerCancel}
      >
        <div
          ref={worldRef}
          className={styles.world}
          style={{ "--hall": `${Math.max(groups.length, 3) * BAY + 1400}px` } as CSSProperties}
        >
          <div className={styles.ceiling} aria-hidden="true" />
          <div className={styles.floor} aria-hidden="true" />
          <div className={`${styles.wall} ${styles.wallLeft}`} aria-hidden="true" />
          <div className={`${styles.wall} ${styles.wallRight}`} aria-hidden="true" />
          {groups.map((door, doorIndex) => {
            const near = doorIndex === index;
            const value = collectionTotalFromCards(door.cards).short;
            const cardsLabel = `${door.cards.length} ${door.cards.length === 1 ? "card" : "cards"}`;
            return (
              <button
                key={door.id}
                type="button"
                className={styles.bay}
                data-hall-index={doorIndex}
                data-side={doorIndex % 2 === 0 ? "left" : "right"}
                data-near={near ? "true" : "false"}
                data-enter={entering === doorIndex ? "true" : undefined}
                style={{ "--i": doorIndex } as CSSProperties}
                aria-label={`Enter the ${door.name} set, ${cardsLabel}${value ? `, ${value}` : ""}`}
                aria-current={near ? "true" : undefined}
                tabIndex={near ? 0 : -1}
                onClick={(event) => {
                  if (event.detail !== 0) return;
                  enter(doorIndex);
                }}
              >
                <span className={styles.arch}>
                  <span className={styles.inner}>
                    <span className={styles.medallion}>
                      <WingIcon slug={wing.slug} />
                    </span>
                    <span className={styles.name}>{door.name}</span>
                    <span className={styles.rule} />
                    <span className={styles.count}>{cardsLabel}</span>
                    <span className={styles.value}>{value || "\u00a0"}</span>
                    <span className={styles.panels}>
                      <Preview card={door.cards[0]} />
                      <Preview card={door.cards[1]} />
                    </span>
                  </span>
                  <span className={styles.handle} aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
        <div className={styles.vignette} aria-hidden="true" />
      </div>
      <CardStageControls
        index={index}
        count={groups.length}
        onPrevious={() => spin.go(-1)}
        onNext={() => spin.go(1)}
        stopAtEnds
      />
      <div className={chrome.meta}>
        <h2 className={chrome.title}>{group.name}</h2>
        <p className={chrome.printing}>{countLabel}</p>
        {total.short && <p className={chrome.value}>{total.short}</p>}
      </div>
    </section>
  );
}

function Preview({ card }: { card?: SetGroup["cards"][number] }) {
  if (!card) return <span className={styles.panel} />;
  return (
    <span className={styles.panel}>
      <CardPhoto card={card} alt="" sizes="80px" className={styles.thumb} />
    </span>
  );
}
