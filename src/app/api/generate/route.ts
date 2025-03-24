import { NextResponse } from "next/server";
import { getRateLimitInfo } from "@/lib/rate-limiter";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";
import { incrementTotalRequests, incrementFailedRequests } from "@/lib/metrics";

const ALLOWED_MODELS = ["stable-diffusion-3.5", "fluently-xl"] as const;
const DEFAULT_MODEL = "stable-diffusion-3.5";
const TIMEOUT_MS = 10000; // 10 seconds timeout - Vercel has 10s limit

// Mark the route as dynamic to prevent static optimization
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    incrementTotalRequests();

    // Get client IP
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0] || realIp || "unknown";

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
      incrementFailedRequests();
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

    // Validate API configuration
    if (!process.env.VENICE_API_KEY) {
      logger.error("VENICE_API_KEY is not configured");
      incrementFailedRequests();
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      logger.warn("Invalid JSON in request body", {
        ip,
        error: error instanceof Error ? error.message : "Unknown parsing error",
      });
      incrementFailedRequests();
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: responseHeaders }
      );
    }

    const { prompt, model = DEFAULT_MODEL, hide_watermark = true } = body;

    if (!prompt) {
      logger.warn("Missing prompt in request", { ip });
      incrementFailedRequests();
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400, headers: responseHeaders }
      );
    }

    if (!ALLOWED_MODELS.includes(model)) {
      logger.warn("Invalid model requested", { ip, model });
      incrementFailedRequests();
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
        hide_watermark,
        model,
        prompt,
        width: 768,
        height: 768,
      }),
    };

    try {
      // Use fetch with runtime configuration
      const apiUrl = new URL("https://api.venice.ai/api/v1/image/generate").toString();
      
      // Add model-specific timeout adjustments
      if (model === "stable-diffusion-3.5") {
        // For slower models, reduce batch size and increase timeout
        options.body = JSON.stringify({
          ...JSON.parse(options.body),
          batch_size: 1, // Reduce batch size to speed up generation
        });
      }

      const response = await fetch(apiUrl, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        logger.error("Failed to parse Venice API response", {
          status: response.status,
          statusText: response.statusText,
          responseText,
          error:
            error instanceof Error ? error.message : "Unknown parsing error",
        });
        throw new Error("Invalid response from image generation service");
      }

      if (!response.ok) {
        throw new Error(
          `Venice API error: ${data.error || response.statusText}`
        );
      }

      logger.info("Image generation successful", { ip });
      return NextResponse.json(data, { headers: responseHeaders });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.error("Request timeout", { ip });
        incrementFailedRequests();
        return NextResponse.json(
          {
            error:
              "Image generation timed out. Please try again with a simpler prompt.",
          },
          { status: 504, headers: responseHeaders }
        );
      }

      logger.error("Venice API error", {
        error: error instanceof Error ? error.message : "Unknown error",
        ip,
      });
      incrementFailedRequests();
      return NextResponse.json(
        { error: "Failed to wowowify. Please try again." },
        { status: 500, headers: responseHeaders }
      );
    }
  } catch (error) {
    logger.error("Unexpected error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    incrementFailedRequests();

    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again.",
      },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
