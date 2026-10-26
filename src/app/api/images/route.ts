import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { findViewableCardByImage } from "@/lib/card-access";

export const dynamic = "force-dynamic";

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
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!db) {
    return new NextResponse("Service unavailable", { status: 503 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { status: true },
  });

  if (!user || user.status !== "approved") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const blobUrl = searchParams.get("url");

  if (!blobUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  if (!isAllowedBlobUrl(blobUrl)) {
    return new NextResponse("Invalid blob URL", { status: 403 });
  }

  const card = await findViewableCardByImage(session.user.id, blobUrl);

  if (!card) {
    return new NextResponse("Not found", { status: 404 });
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
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Failed to serve image:", error);
    return new NextResponse("Failed to serve image", { status: 500 });
  }
}
