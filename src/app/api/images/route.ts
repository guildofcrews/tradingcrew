import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

const ALLOWED_BLOB_HOSTS = [
  ".public.blob.vercel-storage.com",
  ".private.blob.vercel-storage.com",
];

function isAllowedBlobUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_BLOB_HOSTS.some((host) => parsedUrl.hostname.endsWith(host));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const blobUrl = searchParams.get("url");

  if (!blobUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  if (!isAllowedBlobUrl(blobUrl)) {
    return new NextResponse("Invalid blob URL", { status: 403 });
  }

  try {
    const result = await get(blobUrl, { access: "private" });

    if (!result) {
      return new NextResponse("Blob not found", { status: 404 });
    }

    const { stream, blob } = result;
    const contentType = blob.contentType || "image/jpeg";

    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to serve image:", error);
    return new NextResponse("Failed to serve image", { status: 500 });
  }
}
