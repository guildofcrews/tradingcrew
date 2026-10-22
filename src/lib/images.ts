export function getImageUrl(blobUrl: string): string {
  return `/api/images?url=${encodeURIComponent(blobUrl)}`;
}
