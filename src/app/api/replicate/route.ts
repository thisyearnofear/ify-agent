import { NextResponse } from "next/server";
import Replicate from "replicate";
import { logger } from "@/lib/logger";
import { getRateLimitInfo } from "@/lib/rate-limiter";

// Mark the route as dynamic to prevent static optimization
export const dynamic = "force-dynamic";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: Request): Promise<Response> {
  try {
    // Get client IP for rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Check rate limit
    const rateLimitInfo = await getRateLimitInfo(ip);

    // Add rate limit headers
    const responseHeaders = {
      "X-RateLimit-Limit": "20",
      "X-RateLimit-Remaining": rateLimitInfo.remaining?.toString() || "0",
      "X-RateLimit-Reset": rateLimitInfo.timeToReset.toString(),
    };

    if (!rateLimitInfo.isAllowed) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Try again in ${rateLimitInfo.timeToReset} seconds`,
        },
        {
          status: 429,
          headers: responseHeaders,
        }
      );
    }

    // Handle FormData
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400, headers: responseHeaders }
      );
    }

    // Convert the image file to base64
    const buffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${imageFile.type};base64,${base64Image}`;

    logger.info("Processing image with Replicate", {
      ip,
      imageType: imageFile.type,
    });

    const output = await replicate.run(
      "grabielairu/ghibli:4b82bb7dbb3b153882a0c34d7f2cbc4f7012ea7eaddb4f65c257a3403c9b3253",
      {
        input: {
          image: dataUrl,
          prompt: "Studio Ghibli style artwork",
          prompt_strength: 0.66,
          guidance_scale: 7.5,
          num_inference_steps: 50,
          lora_scale: 0.7,
        },
      }
    );

    // The model returns an array with one image
    if (Array.isArray(output) && output.length > 0) {
      return NextResponse.json(
        { url: output[0] },
        { status: 200, headers: responseHeaders }
      );
    }

    throw new Error("No output received from Replicate API");
  } catch (error) {
    logger.error("Error processing image with Replicate:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: "Failed to process image with Ghibli style",
      },
      { status: 500 }
    );
  }
}
