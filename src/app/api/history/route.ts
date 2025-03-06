import { NextResponse } from "next/server";
import { getImageHistory } from "@/lib/metrics";
import { logger } from "@/lib/logger";

// Mark the route as dynamic to prevent static optimization
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    // Get the limit parameter from the URL, default to 100
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    // Validate the limit
    const validLimit = Math.min(Math.max(1, limit), 1000);

    logger.info("Fetching image history", { limit: validLimit });

    // Get the image history
    const history = await getImageHistory(validLimit);

    // Extract some sample IDs for logging
    const sampleIds = history
      .slice(0, 3)
      .map((img) => img.id)
      .join(", ");

    logger.info("Retrieved image history", {
      count: history.length,
      hasGroveImages: history.some((img) => img.groveUri && img.groveUrl),
      sampleIds,
    });

    // Return the history
    return NextResponse.json({ history }, { status: 200 });
  } catch (error) {
    logger.error("Failed to retrieve image history", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to retrieve image history" },
      { status: 500 }
    );
  }
}
