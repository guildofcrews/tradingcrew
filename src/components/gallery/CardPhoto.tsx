"use client";

import Image from "next/image";
import { useState } from "react";
import { displayImageSrc, resolvedOfficialUrl, showingOfficialArt, type ArtCard } from "@/lib/card-art";
import { getImageUrl } from "@/lib/images";

type Shared = {
  card: ArtCard;
  alt: string;
  className?: string;
  sizes?: string;
};

type Props =
  | (Shared & { fill?: true; width?: never; height?: never })
  | (Shared & { fill: false; width: number; height: number });

/**
 * Official art when the owner wants it, otherwise the kid's photo.
 * A failed catalog image falls back to the photo. Private photos stay on /api/images.
 */
export function CardPhoto({ card, alt, className, sizes, fill = true, width, height }: Props) {
  const [failedOfficial, setFailedOfficial] = useState<string | null>(null);
  const official = showingOfficialArt(card) ? resolvedOfficialUrl(card) : null;
  const useOfficial = Boolean(official) && official !== failedOfficial;
  const photo = card.imageUrl ? getImageUrl(card.imageUrl) : "";
  const src = useOfficial ? displayImageSrc(card) : photo;
  if (!src) return null;

  const unoptimized = src.startsWith("/api/images");
  const onError = () => {
    if (useOfficial && official) setFailedOfficial(official);
  };

  if (fill === false) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        unoptimized={unoptimized}
        className={className}
        onError={onError}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized={unoptimized}
      sizes={sizes}
      className={className}
      onError={onError}
    />
  );
}
