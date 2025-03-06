import { NextResponse } from "next/server";
import { getRateLimitInfo } from "@/lib/rate-limiter";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";

const ALLOWED_MODELS = ["stable-diffusion-3.5", "fluently-xl"];
const DEFAULT_MODEL = "fluently-xl";

export async function POST(request: Request) {
  try {
    // Get client IP
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "unknown";

    // Check rate limit
    const rateLimitInfo = await getRateLimitInfo(ip);

    // Always add rate limit headers
    const responseHeaders = {
      "X-RateLimit-Limit": "20",
      "X-RateLimit-Remaining": rateLimitInfo.remaining?.toString() || "0",
      "X-RateLimit-Reset": rateLimitInfo.timeToReset.toString(),
    };

    if (!rateLimitInfo.isAllowed) {
      logger.warn("Rate limit exceeded", { ip });
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

    // Input validation
    if (!process.env.VENICE_API_KEY) {
      logger.error("VENICE_API_KEY is not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { prompt, model = DEFAULT_MODEL } = body;

    if (!prompt) {
      logger.warn("Missing prompt in request", { ip });
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400, headers: responseHeaders }
      );
    }

    if (!ALLOWED_MODELS.includes(model)) {
      logger.warn("Invalid model requested", { ip, model });
      return NextResponse.json(
        {
          error: `Invalid model. Allowed models are: ${ALLOWED_MODELS.join(
            ", "
          )}`,
        },
        { status: 400, headers: responseHeaders }
      );
    }

    logger.info("Starting image generation", {
      ip,
      model,
      promptLength: prompt.length,
    });

    // API request configuration
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hide_watermark: false,
        model,
        prompt,
        width: 768,
        height: 768,
      }),
    };

    // API request with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(
        "https://api.venice.ai/api/v1/image/generate",
        {
          ...options,
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          `Venice API error: ${data.error || response.statusText}`
        );
      }

      const data = await response.json();
      logger.info("Image generation successful", { ip });
      return NextResponse.json(data, { headers: responseHeaders });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.error("Request timeout", { ip });
        return NextResponse.json(
          { error: "Request timed out" },
          { status: 504, headers: responseHeaders }
        );
      }
      throw error;
    }
  } catch (error) {
    logger.error("Error generating image", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    const errorMessage =
      process.env.NODE_ENV === "development"
        ? error instanceof Error
          ? error.message
          : "Unknown error"
        : "Failed to generate image";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
