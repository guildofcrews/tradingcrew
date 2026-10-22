import { NextRequest, NextResponse } from "next/server";
import { head } from "@vercel/blob";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const blobUrl = searchParams.get("url");

  if (!blobUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const blobDetails = await head(blobUrl);

    if (!blobDetails.downloadUrl) {
      return new NextResponse("Could not generate download URL", { status: 500 });
    }

    const response = await fetch(blobDetails.downloadUrl);
    
    if (!response.ok) {
      return new NextResponse("Failed to fetch image", { status: response.status });
    }

    const contentType = blobDetails.contentType || "image/jpeg";
    const body = response.body;

    return new NextResponse(body, {
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
