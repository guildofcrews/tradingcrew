"use client";

import { useEffect, useRef, useState } from "react";
import { warpBlobFromCorners } from "@/lib/card-scan/process";
import type { Quad } from "@/lib/card-scan/geometry";
import styles from "./CornerAdjust.module.css";

const START: Quad = [
  { x: 0.12, y: 0.08 },
  { x: 0.88, y: 0.08 },
  { x: 0.88, y: 0.92 },
  { x: 0.12, y: 0.92 },
];

type Layout = { left: number; top: number; width: number; height: number };

export function CornerAdjust({
  imageUrl,
  busy,
  onCancel,
  onApply,
}: {
  imageUrl: string;
  busy: boolean;
  onCancel: () => void;
  onApply: (blob: Blob) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [corners, setCorners] = useState<Quad>(START);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const image = imageRef.current;
    if (!stage || !image) return;

    const update = () => {
      setLayout(measureLayout(stage, image));
    };
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    image.addEventListener("load", update);
    const frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      image.removeEventListener("load", update);
    };
  }, [imageUrl]);

  function move(index: number, clientX: number, clientY: number) {
    const stage = stageRef.current;
    const image = imageRef.current;
    if (!stage || !image) return;
    const box = containedBox(stage.getBoundingClientRect(), image.naturalWidth, image.naturalHeight);
    const x = clamp((clientX - box.left) / box.width, 0.02, 0.98);
    const y = clamp((clientY - box.top) / box.height, 0.02, 0.98);
    setCorners((current) => {
      const next = current.map((point) => ({ ...point })) as Quad;
      next[index] = { x, y };
      return next;
    });
  }

  async function apply() {
    const image = imageRef.current;
    if (!image || !image.naturalWidth) {
      setError("Wait for the photo to load.");
      return;
    }
    setError(null);
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      setError("Couldn't read that photo.");
      return;
    }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const quad = corners.map((point) => ({
      x: point.x * canvas.width,
      y: point.y * canvas.height,
    })) as Quad;
    try {
      const blob = await warpBlobFromCorners(canvas, quad);
      if (!blob) {
        setError("Those corners didn't make a card. Spread them to the edges.");
        return;
      }
      onApply(blob);
    } catch {
      setError("Couldn't straighten that photo.");
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.help}>Drag the gold dots to the corners of the card.</p>
      <div ref={stageRef} className={styles.stage}>
        {/* The original photo is drawn onto a canvas for the warp, so it stays a plain img. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imageRef} src={imageUrl} alt="Original photo" />
        {layout && (
          <svg className={styles.svg} aria-hidden="true">
            <polygon
              points={corners
                .map((point) => {
                  const x = layout.left + point.x * layout.width;
                  const y = layout.top + point.y * layout.height;
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="rgba(232, 194, 122, 0.18)"
              stroke="#e8c27a"
              strokeWidth="2"
            />
          </svg>
        )}
        {layout &&
          corners.map((point, index) => (
            <button
              key={index}
              type="button"
              className={styles.handle}
              aria-label={`Corner ${index + 1}`}
              style={{
                left: layout.left + point.x * layout.width,
                top: layout.top + point.y * layout.height,
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  move(index, event.clientX, event.clientY);
                }
              }}
            />
          ))}
      </div>
      {error && <p className={styles.help}>{error}</p>}
      <div className={styles.row}>
        <button type="button" className={styles.cancel} onClick={onCancel} disabled={busy}>
          Back
        </button>
        <button type="button" className={styles.use} onClick={() => void apply()} disabled={busy}>
          {busy ? "Saving…" : "Use this crop"}
        </button>
      </div>
    </div>
  );
}

function measureLayout(stage: HTMLDivElement, image: HTMLImageElement): Layout | null {
  if (!image.naturalWidth || !image.naturalHeight) return null;
  const container = stage.getBoundingClientRect();
  if (container.width < 1 || container.height < 1) return null;
  const box = containedBox(container, image.naturalWidth, image.naturalHeight);
  return {
    left: box.left - container.left,
    top: box.top - container.top,
    width: box.width,
    height: box.height,
  };
}

function containedBox(container: DOMRect, imageWidth: number, imageHeight: number) {
  const scale = Math.min(container.width / imageWidth, container.height / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    left: container.left + (container.width - width) / 2,
    top: container.top + (container.height - height) / 2,
    width,
    height,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
