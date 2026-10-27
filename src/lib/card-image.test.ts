import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { normalizeCardPhoto } from "./card-image";

async function fixture(width: number, height: number, orientation?: number): Promise<Buffer> {
  let pipeline = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 220, g: 30, b: 40 },
    },
  }).jpeg();
  if (orientation) pipeline = pipeline.withMetadata({ orientation });
  return pipeline.toBuffer();
}

test("EXIF orientation is applied and the photo is re-encoded as JPEG", async () => {
  const source = await fixture(8, 4, 6);
  const before = await sharp(source).metadata();
  assert.equal(before.width, 8);
  assert.equal(before.height, 4);
  assert.equal(before.orientation, 6);

  const photo = await normalizeCardPhoto(new Uint8Array(source));
  assert.equal(photo.mediaType, "image/jpeg");
  assert.equal(photo.bytes[0], 0xff);
  assert.equal(photo.bytes[1], 0xd8);
  assert.equal(photo.width, 4);
  assert.equal(photo.height, 8);

  const after = await sharp(Buffer.from(photo.bytes)).metadata();
  assert.equal(after.width, 4);
  assert.equal(after.height, 8);
  assert.equal(after.orientation, undefined);
});

test("a large photo is scaled so the long edge is 1280", async () => {
  const source = await fixture(2400, 1600);
  const photo = await normalizeCardPhoto(new Uint8Array(source));
  assert.equal(Math.max(photo.width, photo.height), 1280);
  assert.equal(photo.width, 1280);
  assert.equal(photo.height, 853);
});

test("a small photo is not enlarged", async () => {
  const source = await fixture(100, 80);
  const photo = await normalizeCardPhoto(new Uint8Array(source));
  assert.equal(photo.width, 100);
  assert.equal(photo.height, 80);
});

test("a buffer that is not an image fails decode", async () => {
  await assert.rejects(() => normalizeCardPhoto(new Uint8Array([1, 2, 3, 4, 5])));
});
