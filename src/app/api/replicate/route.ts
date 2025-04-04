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

    // Handle both FormData and JSON requests
    let dataUrl: string;
    const contentType = request.headers.get("content-type");

    if (contentType?.includes("multipart/form-data")) {
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
      dataUrl = `data:${imageFile.type};base64,${base64Image}`;
    } else {
      // Handle JSON request
      const body = await request.json();
      if (!body.imageUrl) {
        return NextResponse.json(
          { error: "Image URL is required" },
          { status: 400, headers: responseHeaders }
        );
      }

      // Download the image and convert to base64
      try {
        const imageResponse = await fetch(body.imageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; WOWOWIFYAgent/1.0)",
            Accept: "image/*, */*",
          },
        });

        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }

        const buffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString("base64");
        const contentType =
          imageResponse.headers.get("content-type") || "image/jpeg";
        dataUrl = `data:${contentType};base64,${base64Image}`;
      } catch (error) {
        logger.error("Error downloading image:", {
          error: error instanceof Error ? error.message : "Unknown error",
          url: body.imageUrl,
        });
        return NextResponse.json(
          { error: "Failed to download image" },
          { status: 400, headers: responseHeaders }
        );
      }
    }

    logger.info("Starting Replicate prediction", {
      ip,
      contentType,
    });

    // Create prediction
    const prediction = await replicate.predictions.create({
      version:
        "4b82bb7dbb3b153882a0c34d7f2cbc4f7012ea7eaddb4f65c257a3403c9b3253",
      input: {
        image: dataUrl,
        prompt: "Studio Ghibli style artwork",
        prompt_strength: 0.66,
        guidance_scale: 7.5,
        num_inference_steps: 50,
        lora_scale: 0.7,
      },
    });

    logger.info("Created Replicate prediction", {
      id: prediction.id,
      status: prediction.status,
    });

    // Return the prediction ID immediately
    return NextResponse.json(
      {
        id: prediction.id,
        status: prediction.status,
      },
      { status: 202, headers: responseHeaders }
    );
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

// Add GET endpoint to check prediction status
export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Prediction ID is required" },
        { status: 400 }
      );
    }

    const prediction = await replicate.predictions.get(id);

    if (prediction.error) {
      return NextResponse.json({ error: prediction.error }, { status: 400 });
    }

    // If the prediction is complete, return the output
    if (prediction.status === "succeeded") {
      return NextResponse.json({
        status: prediction.status,
        url: prediction.output?.[0],
      });
    }

    // Otherwise return the current status
    return NextResponse.json({
      status: prediction.status,
    });
  } catch (error) {
    logger.error("Error checking prediction status:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: "Failed to check prediction status",
      },
      { status: 500 }
    );
  }
}
