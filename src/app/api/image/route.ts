import { NextRequest, NextResponse } from "next/server";
import { getImage } from "@/lib/image-store";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    logger.warn("No image ID provided");
    return new NextResponse("No image ID provided", { status: 400 });
  }

  try {
    // Get image from memory store
    const imageData = getImage(id);

    if (!imageData) {
      logger.warn("Image not found", { id });
      return new NextResponse("Image not found", { status: 404 });
    }

    // Return the image with appropriate headers
    return new NextResponse(imageData.buffer, {
      headers: {
        "Content-Type": imageData.contentType,
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": `inline; filename="image-${id}.png"`,
      },
    });
  } catch (error) {
    logger.error("Error serving image", {
      error: error instanceof Error ? error.message : "Unknown error",
      id,
    });
    return new NextResponse("Error serving image", { status: 500 });
  }
}
