export function getImageUrl(imageUrl: string): string {
  if (imageUrl.includes("blob.vercel-storage.com")) {
    return `/api/images?url=${encodeURIComponent(imageUrl)}`;
  }
  return imageUrl;
}
