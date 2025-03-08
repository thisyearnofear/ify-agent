import { NextResponse } from "next/server";
import { AgentResponse, ParsedCommand } from "@/lib/agent-types";
import { parseCommand } from "@/lib/command-parser";
import { logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import { getRateLimitInfo } from "@/lib/rate-limiter";
import {
  incrementTotalRequests,
  incrementFailedRequests,
  storeImageUrl,
} from "@/lib/metrics";
import { createCanvas, loadImage } from "canvas";
import { storeImage } from "@/lib/image-store";
import { uploadToGrove } from "@/lib/grove-storage";

// Mark the route as dynamic to prevent static optimization
export const dynamic = "force-dynamic";

// Set a timeout for the entire request processing
const TIMEOUT_MS = 25000; // 25 seconds

// For serverless environment, we'll use these URLs for overlays
const OVERLAY_URLS = {
  degenify:
    process.env.NODE_ENV === "production"
      ? "https://wowowifyer.vercel.app/degen/degenify.png"
      : "/degen/degenify.png",
  higherify:
    process.env.NODE_ENV === "production"
      ? "https://wowowifyer.vercel.app/higher/arrows/Arrow-png-white.png"
      : "/higher/arrows/Arrow-png-white.png",
  scrollify:
    process.env.NODE_ENV === "production"
      ? "https://wowowifyer.vercel.app/scroll/scrollify.png"
      : "/scroll/scrollify.png",
  lensify:
    process.env.NODE_ENV === "production"
      ? "https://wowowifyer.vercel.app/lens/lensify.png"
      : "/lens/lensify.png",
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

    // Generate a unique ID for this request
    const requestId = uuidv4();

    // Get base URL for constructing image URLs
    const baseUrl = request.headers.get("x-forwarded-proto")
      ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get(
          "x-forwarded-host"
        )}`
      : "";

    // Extract parameters from the request body
    const body = await request.json();
    const command = body.command;
    const providedParameters = body.parameters;
    // Extract wallet address for Grove storage
    const walletAddressForOverlay = body.walletAddress as string;
    const parentImageUrl = body.parentImageUrl; // Extract parent image URL

    // Parse the command if not provided explicitly
    let parsedCommand: ParsedCommand;
    if (providedParameters) {
      parsedCommand = providedParameters as ParsedCommand;
    } else if (!command) {
      return NextResponse.json(
        { error: "No command or parameters provided" },
        { status: 400 }
      );
    } else {
      parsedCommand = parseCommand(command);
    }

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
          body.parameters.overlayMode === "scrollify" ||
          body.parameters.overlayMode === "lensify"
        ) {
          parsedCommand.overlayMode = body.parameters.overlayMode;
        } else {
          logger.warn("Invalid overlay mode", {
            overlayMode: body.parameters.overlayMode,
            ip,
          });
          return NextResponse.json(
            {
              error: `Invalid overlay mode: ${body.parameters.overlayMode}. Supported modes are: degenify, higherify, scrollify, lensify.`,
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

    // If parentImageUrl is provided, use it as the baseImageUrl
    if (parentImageUrl) {
      logger.info("Using parent image URL from Farcaster", { parentImageUrl });
      parsedCommand.baseImageUrl = parentImageUrl;
      parsedCommand.useParentImage = true;
      parsedCommand.action = "overlay";

      // If no overlay mode is specified but we have a parent image, default to a mode
      if (!parsedCommand.overlayMode) {
        parsedCommand.overlayMode = "degenify"; // Default to degenify if not specified
        logger.info("No overlay mode specified, defaulting to degenify");
      }
    }

    // Validate overlay mode
    if (
      parsedCommand.overlayMode &&
      parsedCommand.overlayMode !== "degenify" &&
      parsedCommand.overlayMode !== "higherify" &&
      parsedCommand.overlayMode !== "scrollify" &&
      parsedCommand.overlayMode !== "lensify"
    ) {
      logger.warn("Invalid overlay mode", {
        overlayMode: parsedCommand.overlayMode,
        ip,
      });
      return NextResponse.json(
        {
          error: `Invalid overlay mode: ${parsedCommand.overlayMode}. Supported modes are: degenify, higherify, scrollify, lensify.`,
        },
        { status: 400, headers: responseHeaders }
      );
    }

    try {
      logger.info("Processing agent command", {
        requestId,
        action: parsedCommand.action,
        ip,
        baseImageUrl: parsedCommand.baseImageUrl ? "provided" : "not provided",
        useParentImage: parsedCommand.useParentImage,
        overlayMode: parsedCommand.overlayMode,
      });

      // Step 1: Generate or get base image
      let baseImageBuffer: Buffer;
      if (parsedCommand.baseImageUrl) {
        // Download image from URL
        try {
          logger.info("Downloading image from URL", {
            url: parsedCommand.baseImageUrl.substring(0, 100), // Log truncated URL for privacy
          });

          // Special handling for imagedelivery.net URLs (Farcaster images)
          const imageUrl = parsedCommand.baseImageUrl;
          const isFarcasterImage = imageUrl.includes("imagedelivery.net");

          // For Farcaster images, ensure we're requesting the original size
          const finalImageUrl =
            isFarcasterImage && !imageUrl.includes("/original")
              ? `${imageUrl.split("?")[0]}/original`
              : imageUrl;

          if (finalImageUrl !== imageUrl) {
            logger.info("Modified image URL to request original size", {
              originalUrl: imageUrl.substring(0, 100),
              modifiedUrl: finalImageUrl.substring(0, 100),
            });
          }

          const response = await fetch(finalImageUrl, {
            signal: controller.signal,
            headers: {
              // Add headers that might be needed for certain image hosts
              "User-Agent": "Mozilla/5.0 (compatible; WOWOWIFYAgent/1.0)",
              Accept: "image/*, */*",
            },
          });

          if (!response.ok) {
            throw new Error(
              `Failed to download image: ${response.status} ${response.statusText}`
            );
          }

          const contentType = response.headers.get("content-type");
          if (contentType && !contentType.includes("image")) {
            logger.warn("URL did not return an image content type", {
              contentType,
              url: finalImageUrl.substring(0, 100),
            });
            // Continue anyway as some servers might not set the correct content type
          }

          const arrayBuffer = await response.arrayBuffer();
          baseImageBuffer = Buffer.from(arrayBuffer);

          if (baseImageBuffer.length < 100) {
            throw new Error("Downloaded image is too small or invalid");
          }

          logger.info("Successfully downloaded image", {
            size: baseImageBuffer.length,
            url: finalImageUrl.substring(0, 100),
          });
        } catch (error) {
          logger.error("Error downloading image", {
            error: error instanceof Error ? error.message : "Unknown error",
            url: parsedCommand.baseImageUrl.substring(0, 100),
          });
          throw new Error(
            `Failed to download base image: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
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
            model: "stable-diffusion-3.5",
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
      } else if (parsedCommand.overlayMode) {
        // If an overlay is requested but no prompt or base image is provided,
        // generate a default image based on the overlay type
        try {
          // Validate API configuration
          if (!process.env.VENICE_API_KEY) {
            logger.error("VENICE_API_KEY is not configured");
            throw new Error("Server configuration error");
          }

          // Create a default prompt based on the overlay type
          let defaultPrompt = "a simple background";
          if (parsedCommand.overlayMode === "higherify") {
            defaultPrompt = "a mountain landscape with clear sky";
          } else if (parsedCommand.overlayMode === "degenify") {
            defaultPrompt = "a colorful abstract pattern";
          } else if (parsedCommand.overlayMode === "scrollify") {
            defaultPrompt = "a minimalist tech background";
          } else if (parsedCommand.overlayMode === "lensify") {
            defaultPrompt = "a professional photography background";
          }

          logger.info("Generating default image for overlay", {
            overlayMode: parsedCommand.overlayMode,
            defaultPrompt,
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
                prompt: defaultPrompt,
                model: "stable-diffusion-3.5",
                hide_watermark: true,
                width: 512,
                height: 512,
              }),
              signal: controller.signal,
            }
          );

          if (!veniceResponse.ok) {
            throw new Error(`Venice API error: ${veniceResponse.statusText}`);
          }

          const veniceData = await veniceResponse.json();
          const imageBase64 = veniceData.images[0];
          baseImageBuffer = Buffer.from(imageBase64, "base64");
        } catch (error) {
          logger.error("Error generating default image", {
            error: error instanceof Error ? error.message : "Unknown error",
            overlayMode: parsedCommand.overlayMode,
          });
          throw new Error("Failed to generate default image for overlay");
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

          // Handle relative URLs for local development
          const fullOverlayUrl = overlayUrl.startsWith("/")
            ? `${baseUrl}${overlayUrl}`
            : overlayUrl;

          logger.info("Fetching overlay", { url: fullOverlayUrl });

          try {
            const overlayResponse = await fetch(fullOverlayUrl, {
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

        // Store the image in memory
        storeImage(resultId, resultBuffer, "image/png");
        storeImage(previewId, previewBuffer, "image/png");

        // Create result URLs
        const resultUrl = `${baseUrl}/api/image?id=${resultId}`;
        const previewUrl = `${baseUrl}/api/image?id=${previewId}`;

        // Store all images in Grove, not just lensify
        let groveUri, groveUrl;
        if (resultBuffer) {
          logger.info(
            `Storing ${parsedCommand.overlayMode || "generated"} image in Grove`
          );
          try {
            const fileName = `${
              parsedCommand.overlayMode || "generated"
            }-${resultId}.png`;

            // Check if this request is coming from Farcaster webhook
            const isFarcasterRequest =
              request.headers
                .get("referer")
                ?.includes("/api/farcaster/webhook") ||
              request.headers.get("x-source") === "farcaster-webhook";

            if (isFarcasterRequest) {
              logger.info(
                "Request is from Farcaster webhook, prioritizing Grove storage"
              );
            }

            // Always attempt Grove storage, even without a wallet address
            // This is especially important for Farcaster integration
            const groveResult = await uploadToGrove(
              resultBuffer,
              fileName,
              walletAddressForOverlay // Pass the wallet address for ACL if available
            );

            // Only set the Grove URI and URL if they're not empty
            if (groveResult.uri && groveResult.gatewayUrl) {
              groveUri = groveResult.uri;
              groveUrl = groveResult.gatewayUrl;
              logger.info("Successfully stored image in Grove", {
                groveUri,
                groveUrl,
                walletAddress: walletAddressForOverlay || "none",
                isFarcasterRequest: isFarcasterRequest || false,
              });
            } else {
              logger.warn("Grove storage returned empty URI or URL", {
                uri: groveResult.uri,
                gatewayUrl: groveResult.gatewayUrl,
                walletAddress: walletAddressForOverlay || "none",
                isFarcasterRequest: isFarcasterRequest || false,
              });
            }
          } catch (error) {
            logger.error("Failed to store image in Grove", {
              error: error instanceof Error ? error.message : String(error),
              walletAddress: walletAddressForOverlay || "none",
            });
          }
        }

        // Store the image URL in history
        await storeImageUrl(requestId, resultUrl, groveUri, groveUrl);

        // Return the response
        const response: AgentResponse = {
          id: requestId,
          status: "completed",
          resultUrl,
          previewUrl,
          groveUri,
          groveUrl,
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
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        ip,
      });
      incrementFailedRequests();

      return NextResponse.json(
        {
          id: requestId,
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
