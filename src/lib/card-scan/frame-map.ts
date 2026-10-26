import type { Rect } from "./detect";

type Box = { left: number; top: number; width: number; height: number };

/**
 * Map the on-screen card guide into the captured frame.
 * The video is drawn with object-fit: cover, so the element box is a crop of the sensor.
 */
export function guideToFrame(
  videoWidth: number,
  videoHeight: number,
  videoBox: Box,
  guideBox: Box,
  frameWidth: number,
  frameHeight: number,
): Rect | null {
  if (videoWidth < 2 || videoHeight < 2 || videoBox.width < 1 || videoBox.height < 1) return null;
  const cover = Math.max(videoBox.width / videoWidth, videoBox.height / videoHeight);
  const offsetX = (videoWidth * cover - videoBox.width) / 2;
  const offsetY = (videoHeight * cover - videoBox.height) / 2;
  const x = (guideBox.left - videoBox.left + offsetX) / cover;
  const y = (guideBox.top - videoBox.top + offsetY) / cover;
  const width = guideBox.width / cover;
  const height = guideBox.height / cover;
  const scaleX = frameWidth / videoWidth;
  const scaleY = frameHeight / videoHeight;
  return { x: x * scaleX, y: y * scaleY, width: width * scaleX, height: height * scaleY };
}
