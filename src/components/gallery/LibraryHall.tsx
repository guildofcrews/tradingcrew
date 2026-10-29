"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { galleryHref, type SetGroup } from "@/lib/card-sets";
import type { Wing } from "@/lib/cards";
import { doorSlot, hallBays, hallDepth, type HallBay } from "@/lib/hall-layout";
import { collectionTotalFromCards } from "@/lib/pokemon-price/display";
import { CardPhoto } from "./CardPhoto";
import { CardStageControls } from "./CardStageChrome";
import { WingIcon } from "./WingIcon";
import { useRingSpin } from "./useRingSpin";
import chrome from "./CardStageChrome.module.css";
import styles from "./LibraryHall.module.css";

const BAY = 420;
/** Pull the eye back so the focused doorway sits ahead of the camera, on the wall. */
const PULL = 160;

interface Props {
  groups: readonly SetGroup[];
  wing: Wing;
  basePath: string;
  /** Doorway to stand at when the hall opens. */
  startIndex?: number;
}

/**
 * A corridor of set doorways set into the walls, with library bays between them.
 * Dragging, scrolling, or the arrows walk from door to door. Entering a doorway
 * opens that set in the room.
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
  const layout = useMemo(() => hallBays(groups.length), [groups.length]);

  function place(offset: number) {
    const node = worldRef.current;
    if (!node || enteringRef.current != null) return;
    const depth = hallDepth(layout, offset);
    node.style.transform = `translateZ(${depth - PULL}px)`;
    const cam = depth / BAY;
    for (const bay of node.querySelectorAll<HTMLElement>("[data-bay]")) {
      const behind = cam - Number(bay.dataset.bay);
      // Drop a bay only once it has passed the eye, floor and door together.
      bay.style.visibility = behind > 0.8 ? "hidden" : "";
    }
  }

  const spin = useRingSpin(
    groups.length,
    widthRef,
    (offset) => place(offset),
    { wrap: false, start, axis: "any" },
  );

  const goRef = useRef(spin.go);
  useLayoutEffect(() => {
    goRef.current = spin.go;
    place(spin.offsetRef.current.offset);
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
    if (reduced || !worldRef.current) {
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

  const fromDoor = Math.max(0, index - 2);
  const toDoor = Math.min(groups.length - 1, index + 5);
  const fromBay = doorSlot(layout, fromDoor);
  const endBay = toDoor >= groups.length - 1 ? layout.length : doorSlot(layout, toDoor + 1);
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
        <div ref={worldRef} className={styles.world}>
          {layout.slice(fromBay, endBay).map((bay) =>
            bay.kind === "door" && bay.doorIndex != null ? (
              <DoorBay
                key={groups[bay.doorIndex]?.id ?? bay.index}
                bay={bay}
                door={groups[bay.doorIndex]}
                wing={wing}
                near={bay.doorIndex === index}
                entering={entering === bay.doorIndex}
                showArt={Math.abs(bay.doorIndex - index) <= 3}
                onEnter={enter}
              />
            ) : (
              <DecorBay key={bay.index} bay={bay} />
            ),
          )}
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

function BayFrame({
  bay,
  near,
  enter,
  children,
}: {
  bay: HallBay;
  near?: boolean;
  enter?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={styles.seg}
      data-bay={bay.index}
      data-near={near ? "true" : undefined}
      data-enter={enter ? "true" : undefined}
      style={{ "--i": bay.index } as CSSProperties}
    >
      <div className={styles.floor} />
      <div className={styles.ceiling} />
      <div className={styles.lamp} />
      <div className={`${styles.wall} ${styles.wallLeft}`}>{bay.side === "left" ? children : null}</div>
      <div className={`${styles.wall} ${styles.wallRight}`}>{bay.side === "right" ? children : null}</div>
    </div>
  );
}

function DoorBay({
  bay,
  door,
  wing,
  near,
  entering,
  showArt,
  onEnter,
}: {
  bay: HallBay;
  door: SetGroup | undefined;
  wing: Wing;
  near: boolean;
  entering: boolean;
  showArt: boolean;
  onEnter: (doorIndex: number) => void;
}) {
  if (!door || bay.doorIndex == null) return null;
  const value = collectionTotalFromCards(door.cards).short;
  const cardsLabel = `${door.cards.length} ${door.cards.length === 1 ? "card" : "cards"}`;
  const doorIndex = bay.doorIndex;
  return (
    <BayFrame bay={bay} near={near} enter={entering}>
      <DoorButton
        door={door}
        wing={wing}
        doorIndex={doorIndex}
        near={near}
        showArt={showArt}
        value={value}
        cardsLabel={cardsLabel}
        onEnter={onEnter}
      />
    </BayFrame>
  );
}

function DoorButton({
  door,
  wing,
  doorIndex,
  near,
  showArt,
  value,
  cardsLabel,
  onEnter,
}: {
  door: SetGroup;
  wing: Wing;
  doorIndex: number;
  near: boolean;
  showArt: boolean;
  value: string | null;
  cardsLabel: string;
  onEnter: (doorIndex: number) => void;
}) {
  return (
    <button
      type="button"
      className={styles.door}
      data-hall-index={doorIndex}
      aria-label={`Enter the ${door.name} set, ${cardsLabel}${value ? `, ${value}` : ""}`}
      aria-current={near ? "true" : undefined}
      tabIndex={near ? 0 : -1}
      onClick={(event) => {
        if (event.detail !== 0) return;
        onEnter(doorIndex);
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
            <Preview card={showArt ? door.cards[0] : undefined} />
            <Preview card={showArt ? door.cards[1] : undefined} />
          </span>
        </span>
        <span className={styles.handle} aria-hidden="true" />
      </span>
    </button>
  );
}

function DecorBay({ bay }: { bay: HallBay }) {
  if (bay.kind === "door") return null;
  const featureClass =
    bay.kind === "glass" ? styles.glass : bay.kind === "books" ? styles.books : bay.kind === "nook" ? styles.nook : styles.pillar;
  return (
    <BayFrame bay={bay}>
      <div className={`${styles.feature} ${featureClass}`} />
    </BayFrame>
  );
}

function Preview({ card }: { card?: SetGroup["cards"][number] }) {
  if (!card) return <span className={styles.panel} />;
  return (
    <span className={styles.panel}>
      <CardPhoto card={card} alt="" sizes="64px" className={styles.thumb} />
    </span>
  );
}
