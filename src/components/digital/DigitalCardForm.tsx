"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { previewDigitalCard, saveDigitalCard, saveManualDigitalCard } from "@/app/actions/digital-cards";
import { DigitalMarks } from "@/components/gallery/DigitalMarks";
import styles from "@/components/gallery/shell.module.css";
import { allowlistedImageUrl, PLATFORM_LABEL, type NftPlatform, type SportsCategory } from "@/lib/nft/allowlist";
import type { NftDraft } from "@/lib/nft/page";

const SPORTS: { value: SportsCategory; label: string }[] = [
  { value: "basketball", label: "Basketball" },
  { value: "football", label: "Football" },
  { value: "baseball", label: "Baseball" },
];

export function DigitalCardForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<NftDraft | null>(null);
  const [manual, setManual] = useState(false);
  const [platform, setPlatform] = useState<NftPlatform>("nba_top_shot");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function lookUp() {
    setError(null);
    setDraft(null);
    startTransition(async () => {
      const result = await previewDigitalCard(url);
      if (!result.success || !result.draft) {
        setError(result.error ?? "We couldn't read that page.");
        if (result.platform) setPlatform(result.platform);
        setManual(true);
        return;
      }
      setDraft(result.draft);
      setManual(false);
    });
  }

  function saveLink() {
    setError(null);
    startTransition(async () => {
      const result = await saveDigitalCard(url);
      if (!result.success || !result.category) {
        setError(result.error ?? "We couldn't save that card.");
        return;
      }
      router.push(`/my-cards/${result.category}`);
      router.refresh();
    });
  }

  function saveManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const body = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveManualDigitalCard(body);
      if (!result.success || !result.category) {
        setError(result.error ?? "We couldn't save that card.");
        return;
      }
      router.push(`/my-cards/${result.category}`);
      router.refresh();
    });
  }

  const previewSrc = draft ? allowlistedImageUrl(draft.imageUrl) : null;

  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <label className={styles.field}>
          <span className={styles.label}>Link</span>
          <input
            className={styles.input}
            type="url"
            inputMode="url"
            name="lookup"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://nbatopshot.com/moment/…"
            autoComplete="off"
          />
        </label>
        <p className={styles.muted}>
          NBA Top Shot, NFL ALL DAY, or Sorare. We don&apos;t connect a wallet. You&apos;re saying this one is yours.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} disabled={pending || !url.trim()} onClick={lookUp}>
            {pending && !draft ? "Looking…" : "Look it up"}
          </button>
          <button type="button" className={styles.secondary} disabled={pending} onClick={() => { setError(null); setManual(true); }}>
            I&apos;ll type it in
          </button>
        </div>
      </section>

      {draft && previewSrc && (
        <section className={styles.panel} aria-label="Preview">
          {/* The src is an allowlisted still. It is copied into private storage only after confirm. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} alt="" width={240} height={336} style={{ width: 180, height: "auto", borderRadius: 12 }} />
          <h2 className={styles.h2}>{draft.title}</h2>
          <DigitalMarks card={{ kind: "digital" }} />
          <p className={styles.muted}>
            {draft.collection} · {draft.setName}
            {draft.serial ? ` · ${draft.serial}` : ""}
          </p>
          <p className={styles.lead}>Claimed, not checked on the blockchain. Soccer cards from Sorare go in the Football wing.</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={pending} onClick={saveLink}>
              {pending ? "Saving…" : "Add this card"}
            </button>
            <button type="button" className={styles.secondary} disabled={pending} onClick={() => setManual(true)}>
              I&apos;ll type it in
            </button>
          </div>
        </section>
      )}

      {manual && (
        <form className={styles.panel} onSubmit={saveManual}>
          <h2 className={styles.h2}>Type it in</h2>
          <p className={styles.muted}>Use this when the link doesn&apos;t load. Pick the official collection and add a picture.</p>
          <label className={styles.field}>
            <span className={styles.label}>Collection</span>
            <select className={styles.input} name="platform" value={platform} onChange={(event) => setPlatform(event.target.value as NftPlatform)}>
              {(Object.keys(PLATFORM_LABEL) as NftPlatform[]).map((key) => (
                <option key={key} value={key}>
                  {PLATFORM_LABEL[key]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Sport</span>
            <select
              key={platform}
              className={styles.input}
              name="category"
              defaultValue={platform === "nba_top_shot" ? "basketball" : platform === "sorare" ? "football" : "football"}
            >
              {SPORTS.map((sport) => (
                <option key={sport.value} value={sport.value}>
                  {sport.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <input className={styles.input} name="title" required maxLength={80} placeholder="Player and play" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Series or set</span>
            <input className={styles.input} name="setName" required maxLength={80} placeholder="Series 2" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Serial (optional)</span>
            <input className={styles.input} name="serial" maxLength={32} placeholder="#2/500" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Picture</span>
            <input className={styles.input} name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required />
          </label>
          <input type="hidden" name="sourceUrl" value={url} />
          <button type="submit" className={styles.primary} disabled={pending}>
            {pending ? "Saving…" : "Add this card"}
          </button>
        </form>
      )}

      {error && <p className={styles.error}>{error}</p>}
      <Link href="/my-cards" className={styles.back}>
        Back to My Cards
      </Link>
    </div>
  );
}
