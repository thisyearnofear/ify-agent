import { NextResponse } from "next/server";
import { ParsedCommand } from "@/lib/agent-types";
import { logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import { incrementTotalRequests, incrementFailedRequests } from "@/lib/metrics";
import { getRateLimitInfo } from "@/lib/rate-limiter";
import { ensureFontsAreRegistered } from "@/lib/image-processor";
import { ServiceFactory } from "@/lib/services";

// Mark the route as dynamic to prevent static optimization
export const dynamic = "force-dynamic";

// Timeout for image processing
const TIMEOUT_MS = 30000;

export async function POST(request: Request): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    incrementTotalRequests();

    // Ensure fonts are registered before processing
    await ensureFontsAreRegistered();

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
    const isFarcaster = body.isFarcaster === true; // Check if request is from Farcaster

    // If this is a Farcaster request, log it
    if (isFarcaster) {
      logger.info("Processing request from Farcaster webhook", {
        ip,
        command: command?.substring(0, 100) || "No command",
        hasParentImage: !!parentImageUrl,
      });
    }

    // Get the appropriate service for this interface
    const interfaceType = isFarcaster ? "farcaster" : "web";
    const imageService = ServiceFactory.getServiceForInterface(interfaceType);

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
      // Parse the command using our service
      parsedCommand = imageService.parseCommand(
        command,
        interfaceType,
        parentImageUrl
      );
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
          body.parameters.overlayMode === "lensify" ||
          body.parameters.overlayMode === "higherise" ||
          body.parameters.overlayMode === "dickbuttify" ||
          body.parameters.overlayMode === "nikefy" ||
          body.parameters.overlayMode === "nounify" ||
          body.parameters.overlayMode === "baseify" ||
          body.parameters.overlayMode === "clankerify" ||
          body.parameters.overlayMode === "mantleify"
        ) {
          parsedCommand.overlayMode = body.parameters.overlayMode;
        } else {
          logger.warn("Invalid overlay mode", {
            overlayMode: body.parameters.overlayMode,
            ip,
          });
          return NextResponse.json(
            {
              error: `Invalid overlay mode: ${body.parameters.overlayMode}. Supported modes are: degenify, higherify, scrollify, lensify, higherise, dickbuttify, nikefy, nounify, baseify, clankerify, mantleify.`,
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

    try {
      logger.info("Processing agent command", {
        requestId,
        action: parsedCommand.action,
        ip,
        baseImageUrl: parsedCommand.baseImageUrl ? "provided" : "not provided",
        useParentImage: parsedCommand.useParentImage,
        overlayMode: parsedCommand.overlayMode,
      });

      // Process the command using our service
      const result = await imageService.processCommand(
        parsedCommand,
        baseUrl,
        walletAddressForOverlay,
        isFarcaster
      );

      return NextResponse.json(result, {
        status: 200,
        headers: responseHeaders,
      });
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
