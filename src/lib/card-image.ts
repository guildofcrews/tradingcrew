import sharp from "sharp";

/** Long edge sent to the model. Phone originals are often 4000px and several MB. */
const MODEL_LONG_EDGE = 1280;

export type NormalizedCardPhoto = {
  bytes: Uint8Array;
  mediaType: "image/jpeg";
  width: number;
  height: number;
};

/**
 * Turn a stored card photo into the JPEG the model actually sees.
 * Phone uploads keep the camera file: EXIF orientation (the browser shows it
 * upright, the bytes do not), a multi-megapixel size, and sometimes HEIC or a
 * messy JPEG. Web scans are already small and upright, which is why only phone
 * photos were failing. The stored blob is left unchanged.
 */
export async function normalizeCardPhoto(input: Uint8Array): Promise<NormalizedCardPhoto> {
  const { data, info } = await sharp(Buffer.from(input), {
    failOn: "none",
    animated: false,
    limitInputPixels: 64_000_000,
  })
    .rotate()
    .resize({
      width: MODEL_LONG_EDGE,
      height: MODEL_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  if (!info.width || !info.height) {
    throw new Error("Card photo could not be decoded");
  }

  return {
    bytes: new Uint8Array(data),
    mediaType: "image/jpeg",
    width: info.width,
    height: info.height,
  };
}
