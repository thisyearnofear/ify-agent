import { NextResponse } from "next/server";
import { AgentCommand, AgentResponse } from "@/lib/agent-types";
import { parseCommand } from "@/lib/command-parser";
import { logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import { getRateLimitInfo } from "@/lib/rate-limiter";
import { incrementTotalRequests, incrementFailedRequests } from "@/lib/metrics";
import { createCanvas, loadImage } from "canvas";
import { storeImage } from "@/lib/image-store";

// Mark the route as dynamic to prevent static optimization
export const dynamic = "force-dynamic";

// Set a timeout for the entire request processing
const TIMEOUT_MS = 25000; // 25 seconds

// For serverless environment, we'll use these URLs for overlays
const OVERLAY_URLS = {
  degenify: "https://wowowifyer.vercel.app/degen/degenify.png",
  higherify: "https://wowowifyer.vercel.app/higher/arrows/Arrow-png-white.png",
  scrollify: "https://wowowifyer.vercel.app/scroll/scrollify.png",
};

export async function POST(request: Request): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    incrementTotalRequests();

    // Get client IP for rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
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

    // Parse request body
    let body: AgentCommand;
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

    // Validate request
    if (!body.command) {
      logger.warn("Missing command in request", { ip });
      incrementFailedRequests();
      return NextResponse.json(
        { error: "Command is required" },
        { status: 400, headers: responseHeaders }
      );
    }

    // Generate a unique ID for this request
    const id = uuidv4();

    // Parse the command
    const parsedCommand = parseCommand(body.command);

    // Override with explicit parameters if provided
    if (body.parameters) {
      if (body.parameters.baseImageUrl) {
        parsedCommand.baseImageUrl = body.parameters.baseImageUrl;
      }
      if (body.parameters.prompt) {
        parsedCommand.prompt = body.parameters.prompt;
      }
      if (body.parameters.overlayMode) {
        // Validate overlay mode
        if (
          body.parameters.overlayMode === "degenify" ||
          body.parameters.overlayMode === "higherify" ||
          body.parameters.overlayMode === "scrollify"
        ) {
          parsedCommand.overlayMode = body.parameters.overlayMode;
        } else {
          logger.warn("Invalid overlay mode", {
            overlayMode: body.parameters.overlayMode,
            ip,
          });
          return NextResponse.json(
            {
              error: `Invalid overlay mode: ${body.parameters.overlayMode}. Supported modes are: degenify, higherify, scrollify.`,
            },
            { status: 400, headers: responseHeaders }
          );
        }
      }
      if (body.parameters.controls) {
        parsedCommand.controls = {
          ...parsedCommand.controls,
          ...body.parameters.controls,
        };
      }
      // If parameters are provided directly, use them as the parsed command
      if (body.parameters.action) {
        parsedCommand.action = body.parameters.action;
      }
    }

    // Validate overlay mode
    if (
      parsedCommand.overlayMode &&
      parsedCommand.overlayMode !== "degenify" &&
      parsedCommand.overlayMode !== "higherify" &&
      parsedCommand.overlayMode !== "scrollify"
    ) {
      logger.warn("Invalid overlay mode", {
        overlayMode: parsedCommand.overlayMode,
        ip,
      });
      return NextResponse.json(
        {
          error: `Invalid overlay mode: ${parsedCommand.overlayMode}. Supported modes are: degenify, higherify, scrollify.`,
        },
        { status: 400, headers: responseHeaders }
      );
    }

    try {
      logger.info("Processing agent command", {
        id,
        action: parsedCommand.action,
        ip,
      });

      // Step 1: Generate or get base image
      let baseImageBuffer: Buffer;
      if (parsedCommand.baseImageUrl) {
        // Download image from URL
        try {
          const response = await fetch(parsedCommand.baseImageUrl, {
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          baseImageBuffer = Buffer.from(arrayBuffer);
        } catch (error) {
          logger.error("Error downloading image", {
            error: error instanceof Error ? error.message : "Unknown error",
            url: parsedCommand.baseImageUrl,
          });
          throw new Error("Failed to download base image");
        }
      } else if (parsedCommand.prompt) {
        // Generate image from prompt
        try {
          // Validate API configuration
          if (!process.env.VENICE_API_KEY) {
            logger.error("VENICE_API_KEY is not configured");
            throw new Error("Server configuration error");
          }

          logger.info("Generating image with Venice API", {
            prompt: parsedCommand.prompt,
          });

          const veniceResponse = await fetch(
            "https://api.venice.ai/api/v1/image/generate",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
              },
              body: JSON.stringify({
                prompt: parsedCommand.prompt,
                model: "stable-diffusion-3.5",
                hide_watermark: true,
                width: 512,
                height: 512,
              }),
              signal: controller.signal,
            }
          );

          if (!veniceResponse.ok) {
            const text = await veniceResponse.text();
            logger.error("Venice API error", {
              status: veniceResponse.status,
              statusText: veniceResponse.statusText,
              responseText: text,
            });
            throw new Error(
              `Failed to generate image: ${veniceResponse.statusText}`
            );
          }

          const data = await veniceResponse.json();
          if (!data.images?.[0]) {
            throw new Error("No image generated");
          }

          baseImageBuffer = Buffer.from(data.images[0], "base64");
        } catch (error) {
          logger.error("Error generating image", {
            error: error instanceof Error ? error.message : "Unknown error",
            prompt: parsedCommand.prompt,
          });
          throw error;
        }
      } else {
        throw new Error("No base image URL or prompt provided");
      }

      // Step 2: Process the image with overlay
      const resultId = uuidv4();
      const previewId = uuidv4();

      try {
        // Load base image
        const baseImage = await loadImage(baseImageBuffer);

        // Create canvas with base image dimensions
        const canvas = createCanvas(baseImage.width, baseImage.height);
        const ctx = canvas.getContext("2d");

        // Draw base image
        ctx.drawImage(baseImage, 0, 0);

        // Apply color overlay if specified
        if (
          parsedCommand.controls?.overlayAlpha &&
          parsedCommand.controls.overlayAlpha > 0
        ) {
          ctx.fillStyle = parsedCommand.controls.overlayColor || "#000000";
          ctx.globalAlpha = parsedCommand.controls.overlayAlpha;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1;
        }

        // Load and apply overlay image if mode is specified
        if (parsedCommand.overlayMode) {
          logger.info("Applying overlay", {
            overlayMode: parsedCommand.overlayMode,
          });

          const overlayUrl =
            OVERLAY_URLS[
              parsedCommand.overlayMode as keyof typeof OVERLAY_URLS
            ];
          if (!overlayUrl) {
            throw new Error(
              `Unsupported overlay mode: ${parsedCommand.overlayMode}`
            );
          }

          try {
            // Download the overlay image
            const overlayResponse = await fetch(overlayUrl, {
              signal: controller.signal,
            });
            if (!overlayResponse.ok) {
              throw new Error(
                `Failed to download overlay: ${overlayResponse.statusText}`
              );
            }
            const overlayArrayBuffer = await overlayResponse.arrayBuffer();
            const overlayBuffer = Buffer.from(overlayArrayBuffer);
            const overlayImage = await loadImage(overlayBuffer);

            // Calculate scale and position
            const scale = parsedCommand.controls?.scale || 1;
            const scaledWidth = overlayImage.width * scale;
            const scaledHeight = overlayImage.height * scale;

            // Calculate position (centered by default)
            const x =
              (canvas.width - scaledWidth) / 2 +
              (parsedCommand.controls?.x || 0);
            const y =
              (canvas.height - scaledHeight) / 2 +
              (parsedCommand.controls?.y || 0);

            // Draw overlay
            ctx.drawImage(overlayImage, x, y, scaledWidth, scaledHeight);
            logger.info("Overlay applied successfully", {
              overlayMode: parsedCommand.overlayMode,
              scale,
              x,
              y,
            });
          } catch (error) {
            logger.error("Error applying overlay", {
              error: error instanceof Error ? error.message : "Unknown error",
              overlayMode: parsedCommand.overlayMode,
            });
            // Continue without the overlay rather than failing completely
          }
        }

        // Get result image buffer
        const resultBuffer = canvas.toBuffer("image/png");

        // Create preview (smaller version)
        const previewSize = 300;
        const previewCanvas = createCanvas(
          previewSize,
          previewSize * (baseImage.height / baseImage.width)
        );
        const previewCtx = previewCanvas.getContext("2d");
        previewCtx.drawImage(
          canvas,
          0,
          0,
          canvas.width,
          canvas.height,
          0,
          0,
          previewCanvas.width,
          previewCanvas.height
        );

        // Get preview buffer
        const previewBuffer = previewCanvas.toBuffer("image/png");

        // Store images in memory
        storeImage(resultId, resultBuffer);
        storeImage(previewId, previewBuffer);

        // Construct the response
        const response: AgentResponse = {
          id,
          status: "completed",
          resultUrl: `/api/image?id=${resultId}`,
          previewUrl: `/api/image?id=${previewId}`,
        };

        return NextResponse.json(response, {
          status: 200,
          headers: responseHeaders,
        });
      } catch (error) {
        logger.error("Error processing image", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    } catch (error) {
      logger.error("Error processing command", {
        id,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        ip,
      });
      incrementFailedRequests();

      return NextResponse.json(
        {
          id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500, headers: responseHeaders }
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.error("Request processing timed out", {
        error: "Timeout",
      });
      incrementFailedRequests();
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Request processing timed out. Please try again with a simpler prompt.",
        },
        { status: 504 }
      );
    }

    logger.error("Unexpected error in agent API", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    incrementFailedRequests();

    return NextResponse.json(
      {
        status: "failed",
        error: "An unexpected error occurred. Please try again.",
      },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
