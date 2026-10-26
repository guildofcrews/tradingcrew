"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { guideToFrame } from "@/lib/card-scan/frame-map";
import { processCardCanvas } from "@/lib/card-scan/process";
import { detectCardQuad, rgbaToGray } from "@/lib/card-scan/detect";
import { meanAbsDiff, nextArm, type ArmState } from "@/lib/card-scan/steady";
import styles from "./CaptureStudio.module.css";

type Thumb = { id: string; url: string };
type UploadJob = { original: Blob; cleaned: Blob | null; tries: number };

export function CaptureStudio() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const sampleRef = useRef<HTMLCanvasElement | null>(null);
  const previousGray = useRef<Float32Array | null>(null);
  const armRef = useRef<{ state: ArmState; frames: number }>({ state: "armed", frames: 0 });
  const streamRef = useRef<MediaStream | null>(null);
  const batchId = useRef(crypto.randomUUID());
  const queue = useRef<UploadJob[]>([]);
  const failedJobs = useRef<UploadJob[]>([]);
  const active = useRef(0);
  const chain = useRef(Promise.resolve());
  const previews = useRef<string[]>([]);
  const cooldown = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const destination = useRef("/my-cards");
  const captureRef = useRef<() => void>(() => {});
  const statusRef = useRef("");

  const [mode, setMode] = useState<"choose" | "camera">("choose");
  const cameraAvailable = useSyncExternalStore(emptySubscribe, cameraSnapshot, () => false);
  const [count, setCount] = useState(0);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [thumbs, setThumbs] = useState<Thumb[]>([]);
  const [hint, setHint] = useState("Fit the card in the frame");
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryNote, setLibraryNote] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const bucket = previews.current;
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      bucket.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (mode !== "camera") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => {
      setError("Tap the shutter if the picture doesn't start on its own.");
    });
  }, [mode]);

  useEffect(() => {
    if (mode !== "camera") return;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      const guide = guideRef.current;
      if (!video || !guide || video.readyState < 2 || Date.now() < cooldown.current) return;
      const sample = sampleGuide(video, guide, sampleRef);
      const diff = meanAbsDiff(sample.gray, previousGray.current);
      previousGray.current = sample.gray;
      const decision = nextArm(armRef.current.state, armRef.current.frames, diff, sample.quadFound);
      armRef.current = { state: decision.state, frames: decision.steadyFrames };
      const nextHint =
        decision.state === "wait-for-motion"
          ? "Next card"
          : decision.steadyFrames > 0
            ? "Hold still"
            : sample.quadFound
              ? "Hold still"
              : "Fit the card in the frame";
      if (nextHint !== statusRef.current) {
        statusRef.current = nextHint;
        setHint(nextHint);
      }
      if (decision.shouldSnap) captureRef.current();
    }, 160);
    return () => window.clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    if (!leaving || pending > 0 || failed > 0) return;
    router.push(destination.current);
  }, [leaving, pending, failed, router]);

  useEffect(() => {
    if (pending === 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [pending]);

  async function startCamera() {
    setError(null);
    setStarting(true);
    try {
      streamRef.current = await openCamera();
      armRef.current = { state: "armed", frames: 0 };
      previousGray.current = null;
      setMode("camera");
    } catch (caught) {
      setError(cameraMessage(caught));
      setMode("choose");
    } finally {
      setStarting(false);
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    if (Date.now() < cooldown.current) return;
    cooldown.current = Date.now() + 800;
    armRef.current = { state: "wait-for-motion", frames: 0 };
    statusRef.current = "Next card";
    setHint("Next card");

    const frame = grabFrame(video);
    if (!frame) return;
    const guide = guideRef.current;
    const guideRect =
      guide &&
      guideToFrame(
        video.videoWidth,
        video.videoHeight,
        video.getBoundingClientRect(),
        guide.getBoundingClientRect(),
        frame.width,
        frame.height,
      );

    setCount((value) => value + 1);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 220);
    if (typeof navigator.vibrate === "function") navigator.vibrate(40);

    chain.current = chain.current.then(async () => {
      try {
        const result = await processCardCanvas(frame, guideRect);
        const preview = URL.createObjectURL(result.cleaned ?? result.original);
        previews.current.push(preview);
        setThumbs((current) => [{ id: crypto.randomUUID(), url: preview }, ...current].slice(0, 8));
        enqueue({ original: result.original, cleaned: result.cleaned, tries: 0 });
      } catch {
        setCount((value) => Math.max(0, value - 1));
        setError("That photo didn't come out. Try the shutter again.");
      }
    });
  }
  captureRef.current = captureFrame;

  function enqueue(job: UploadJob) {
    queue.current.push(job);
    syncPending();
    void pump();
  }

  function syncPending() {
    setPending(queue.current.length + active.current);
  }

  async function pump() {
    while (active.current < 2 && queue.current.length > 0) {
      const job = queue.current.shift();
      if (!job) return;
      active.current += 1;
      syncPending();
      void runUpload(job);
    }
  }

  async function runUpload(job: UploadJob) {
    try {
      const body = new FormData();
      body.set("original", new File([job.original], "original.jpg", { type: "image/jpeg" }));
      if (job.cleaned) body.set("cleaned", new File([job.cleaned], "cleaned.jpg", { type: "image/jpeg" }));
      body.set("batchId", batchId.current);
      const response = await fetch("/api/cards/capture", { method: "POST", body });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Save failed");
      }
    } catch (caught) {
      if (job.tries < 1) {
        queue.current.push({ ...job, tries: job.tries + 1 });
      } else {
        failedJobs.current.push(job);
        setFailed(failedJobs.current.length);
        setError(caught instanceof Error ? caught.message : "Couldn't save a card");
      }
    } finally {
      active.current -= 1;
      syncPending();
      void pump();
    }
  }

  function retryFailed() {
    const jobs = failedJobs.current.splice(0);
    setFailed(0);
    setError(null);
    for (const job of jobs) queue.current.push({ ...job, tries: 0 });
    syncPending();
    void pump();
  }

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    setLibraryNote(null);
    let opened = 0;
    let skipped = 0;
    for (let index = 0; index < files.length; index += 1) {
      setLibraryNote(`Cleaning ${index + 1} of ${files.length}`);
      try {
        const canvas = await fileToCanvas(files[index]);
        const result = await processCardCanvas(canvas, null);
        const preview = URL.createObjectURL(result.cleaned ?? result.original);
        previews.current.push(preview);
        setThumbs((current) => [{ id: crypto.randomUUID(), url: preview }, ...current].slice(0, 8));
        setCount((value) => value + 1);
        enqueue({ original: result.original, cleaned: result.cleaned, tries: 0 });
        opened += 1;
      } catch {
        skipped += 1;
      }
    }
    setLibraryNote(
      skipped > 0
        ? `${opened} added. ${skipped} couldn't be opened — try a JPEG.`
        : opened > 0
          ? `${opened} ready.`
          : null,
    );
    if (fileRef.current) fileRef.current.value = "";
  }

  function leave(path: string) {
    destination.current = path;
    if (pending === 0 && failed === 0) {
      router.push(path);
      return;
    }
    setLeaving(true);
  }

  const reviewPath = `/my-cards/review?batch=${batchId.current}`;

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <button type="button" className={styles.ghost} onClick={() => leave("/my-cards")}>
          Close
        </button>
        <div className={styles.count} aria-live="polite">
          <strong>{count}</strong>
          <span>snapped</span>
        </div>
        <button type="button" className={styles.ghost} onClick={() => fileRef.current?.click()}>
          Photos
        </button>
      </div>

      {mode === "camera" ? (
        <div className={styles.stage}>
          <video ref={videoRef} className={styles.video} playsInline muted autoPlay />
          <div ref={guideRef} className={styles.guide}>
            <div className={styles.corners} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <p className={styles.hint}>{hint}</p>
          <div className={`${styles.flash} ${flash ? styles.flashOn : ""}`} aria-hidden="true" />
        </div>
      ) : (
        <section className={styles.choose}>
          <div>
            <p className={styles.eyebrow}>Batch snap</p>
            <h1>Add a stack</h1>
          </div>
          <p className={styles.lead}>
            Hold each card in the frame. We snap it when you hold still, then you can check the names.
          </p>
          <div className={styles.actions}>
            {cameraAvailable && (
              <button type="button" className={styles.primary} onClick={startCamera} disabled={starting}>
                {starting ? "Opening camera…" : "Use camera"}
              </button>
            )}
            <button type="button" className={styles.secondary} onClick={() => fileRef.current?.click()}>
              Choose photos
            </button>
          </div>
          {!cameraAvailable && (
            <p className={styles.note}>This browser has no camera. You can still pick a bunch of photos at once.</p>
          )}
          {libraryNote && <p className={styles.note}>{libraryNote}</p>}
        </section>
      )}

      {thumbs.length > 0 && (
        <div className={styles.film} aria-hidden="true">
          {thumbs.map((thumb) => (
            // Blob previews are local object URLs, which the image optimizer cannot fetch.
            // eslint-disable-next-line @next/next/no-img-element
            <img key={thumb.id} src={thumb.url} alt="" />
          ))}
        </div>
      )}

      <div className={styles.controls}>
        <div>
          {pending > 0 && <p className={styles.note}>Saving {pending}…</p>}
          {failed > 0 && (
            <div>
              <button type="button" className={styles.textButton} onClick={retryFailed}>
                Retry {failed}
              </button>
              <button
                type="button"
                className={styles.textButton}
                onClick={() => {
                  failedJobs.current = [];
                  setFailed(0);
                  setError(null);
                }}
              >
                Skip those
              </button>
            </div>
          )}
        </div>
        {mode === "camera" ? (
          <button type="button" className={styles.shutter} aria-label="Snap card" onClick={() => captureFrame()} />
        ) : (
          <span />
        )}
        <div style={{ justifySelf: "end" }}>
          <button
            type="button"
            className={styles.primary}
            onClick={() => leave(count > 0 ? reviewPath : "/my-cards")}
            disabled={count === 0 && pending === 0}
          >
            {leaving && pending > 0 ? "Saving…" : "Done"}
          </button>
        </div>
      </div>
      {error && (
        <p className={styles.error} role="alert" style={{ padding: "0 20px 16px" }}>
          {error}
        </p>
      )}
      <input
        ref={fileRef}
        className={styles.hidden}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
        multiple
        onChange={(event) => void onFiles(event.target.files)}
      />
    </div>
  );
}

function emptySubscribe() {
  return () => {};
}

function cameraSnapshot() {
  return typeof navigator.mediaDevices?.getUserMedia === "function";
}

function sampleGuide(
  video: HTMLVideoElement,
  guide: HTMLDivElement,
  sampleRef: { current: HTMLCanvasElement | null },
): { gray: Float32Array; quadFound: boolean } {
  const width = 280;
  const height = Math.max(1, Math.round((width * video.videoHeight) / video.videoWidth));
  const canvas = sampleRef.current ?? document.createElement("canvas");
  sampleRef.current = canvas;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { gray: new Float32Array(), quadFound: false };
  ctx.drawImage(video, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  const gray = rgbaToGray(pixels.data, width * height);
  const rect = guideToFrame(
    video.videoWidth,
    video.videoHeight,
    video.getBoundingClientRect(),
    guide.getBoundingClientRect(),
    width,
    height,
  );
  if (!rect) return { gray, quadFound: false };
  return { gray, quadFound: detectCardQuad(gray, width, height, rect) !== null };
}

function grabFrame(video: HTMLVideoElement): HTMLCanvasElement | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function openCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } },
    { audio: false, video: { facingMode: "environment" } },
    { audio: false, video: true },
  ];
  let last: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      last = error;
      if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")) {
        throw error;
      }
    }
  }
  throw last instanceof Error ? last : new Error("Camera unavailable");
}

function cameraMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera is off. Allow it in the browser settings, or choose photos instead.";
  }
  if (name === "NotFoundError" || name === "NotReadableError") {
    return "No camera showed up. You can choose photos instead.";
  }
  return "The camera didn't start. You can choose photos instead.";
}

async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = drawSource(bitmap, bitmap.width, bitmap.height);
      bitmap.close();
      return canvas;
    } catch {
      // Some phone photos need the image element path.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return drawSource(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawSource(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const scale = Math.min(1, 1600 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not read the photo");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}
