import { ParsedCommand, AgentResponse } from "@/lib/agent-types";
import { logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import { createCanvas, loadImage } from "canvas";
import { storeImage } from "@/lib/image-store";
import { uploadToGrove } from "@/lib/grove-storage";
import {
  addTextToImage,
  ensureFontsAreRegistered,
} from "@/lib/image-processor";
import { parseCommand } from "@/lib/command-parser/index";
import { InterfaceType } from "@/lib/command-parser/index";
import { storeImageUrl } from "@/lib/image-history";

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
  higherise:
    process.env.NODE_ENV === "production"
      ? "https://wowowifyer.vercel.app/higher/mantra/higherise.png"
      : "/higher/mantra/higherise.png",
  dickbuttify:
    process.env.NODE_ENV === "production"
      ? "https://wowowifyer.vercel.app/dickbutt/dickbuttify.png"
      : "/dickbutt/dickbuttify.png",
  nikefy:
    process.env.NODE_ENV === "production"
      ? "https://wowowifyer.vercel.app/nike/nikefy.png"
      : "/nike/nikefy.png",
  nounify:
    process.env.NODE_ENV === "production"
      ? "https://wowowifyer.vercel.app/nouns/nounify.png"
      : "/nouns/nounify.png",
  baseify:
    process.env.NODE_ENV === "production"
      ? "https://wowowifyer.vercel.app/base/baseify.png"
      : "/base/baseify.png",
  clankerify:
    process.env.NODE_ENV === "production"
      ? "https://wowowifyer.vercel.app/clanker/clankerify.png"
      : "/clanker/clankerify.png",
  mantleify:
    process.env.NODE_ENV === "production"
      ? "https://wowowifyer.vercel.app/mantle/mantleify.png"
      : "/mantle/mantleify.png",
};

// Timeout for image processing
const TIMEOUT_MS = 30000;

/**
 * Core image service that can be used by all API endpoints
 */
export class ImageService {
  /**
   * Parse a command string into a structured ParsedCommand object
   */
  public parseCommand(
    command: string,
    interfaceType: InterfaceType = "default",
    parentImageUrl?: string
  ): ParsedCommand {
    // Parse the command using the appropriate parser
    const parsedCommand = parseCommand(command, interfaceType);

    // If parentImageUrl is provided, use it as the baseImageUrl
    if (parentImageUrl) {
      logger.info("Using parent image URL", { parentImageUrl });
      parsedCommand.baseImageUrl = parentImageUrl;

      // Only force overlay mode if the command parser hasn't already made a decision
      // This allows explicit "generate:" commands to override the parent image
      if (
        !parsedCommand.useParentImage &&
        !parsedCommand.action.startsWith("generate")
      ) {
        // If the command doesn't have a descriptive prompt beyond the overlay keyword,
        // assume it's meant to apply to the parent image
        const hasDescriptivePrompt =
          parsedCommand.prompt && parsedCommand.prompt.length > 10;

        if (!hasDescriptivePrompt && parsedCommand.overlayMode) {
          // If there's just an overlay mode without a descriptive prompt, apply to parent
          parsedCommand.useParentImage = true;
          parsedCommand.action = "overlay";
          logger.info(
            "No descriptive prompt with overlay mode, applying to parent image",
            {
              overlayMode: parsedCommand.overlayMode,
            }
          );
        } else if (!parsedCommand.overlayMode && !parsedCommand.text) {
          // If there's no overlay mode and no text, but we have a parent image,
          // default to degenify overlay
          parsedCommand.overlayMode = "degenify"; // Default to degenify if not specified
          parsedCommand.useParentImage = true;
          parsedCommand.action = "overlay";
          logger.info(
            "No overlay mode specified with parent image, defaulting to degenify"
          );
        }
      }
    }

    return parsedCommand;
  }

  /**
   * Process a command and generate an image
   */
  public async processCommand(
    parsedCommand: ParsedCommand,
    baseUrl: string = "",
    walletAddressForOverlay?: string,
    isFarcaster: boolean = false
  ): Promise<AgentResponse> {
    // Generate a unique ID for this request
    const requestId = uuidv4();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // Ensure fonts are registered before processing
      await ensureFontsAreRegistered();

      // Initialize the response
      // Commented out as it's not used
      // const response: AgentResponse = {
      //   id: requestId,
      //   status: "processing",
      // };

      // Validate overlay mode
      if (
        parsedCommand.overlayMode &&
        parsedCommand.overlayMode !== "degenify" &&
        parsedCommand.overlayMode !== "higherify" &&
        parsedCommand.overlayMode !== "scrollify" &&
        parsedCommand.overlayMode !== "lensify" &&
        parsedCommand.overlayMode !== "higherise" &&
        parsedCommand.overlayMode !== "dickbuttify" &&
        parsedCommand.overlayMode !== "nikefy" &&
        parsedCommand.overlayMode !== "nounify" &&
        parsedCommand.overlayMode !== "baseify" &&
        parsedCommand.overlayMode !== "clankerify" &&
        parsedCommand.overlayMode !== "mantleify"
      ) {
        logger.warn("Invalid overlay mode", {
          overlayMode: parsedCommand.overlayMode,
        });
        throw new Error(
          `Invalid overlay mode: ${parsedCommand.overlayMode}. Supported modes are: degenify, higherify, scrollify, lensify, higherise, dickbuttify, nikefy, nounify, baseify, clankerify, mantleify.`
        );
      }

      logger.info("Processing command", {
        requestId,
        action: parsedCommand.action,
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
        // wowowify from prompt
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
            throw new Error(`Failed to wowowify: ${veniceResponse.statusText}`);
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
        let resultBuffer: Buffer;
        resultBuffer = canvas.toBuffer("image/png");

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
        let previewBuffer = previewCanvas.toBuffer("image/png");

        // Add text to the image if specified
        if (parsedCommand.text?.content) {
          logger.info("Adding text to image", {
            text: parsedCommand.text.content,
            position: parsedCommand.text.position,
            fontSize: parsedCommand.text.fontSize,
            color: parsedCommand.text.color,
            style: parsedCommand.text.style,
          });

          // Map text style to font family
          let fontFamily = "Roboto, sans-serif";
          let fontWeight = "normal";
          const fontSize = parsedCommand.text.fontSize || 48;
          const color = parsedCommand.text.color || "white";
          const strokeColor: string | undefined = undefined;
          const strokeWidth = 0;
          const shadow:
            | {
                color: string;
                offsetX: number;
                offsetY: number;
                blur: number;
              }
            | undefined = undefined;

          // Position mapping
          let x: number | "center" | "left" | "right" = "center";
          let y: number | "center" | "top" | "bottom" = "bottom";

          // Map position
          if (parsedCommand.text.position) {
            const pos = parsedCommand.text.position.toLowerCase();
            if (
              pos === "top" ||
              pos === "bottom" ||
              pos === "center" ||
              pos === "left" ||
              pos === "right" ||
              pos === "top-left" ||
              pos === "top-right" ||
              pos === "bottom-left" ||
              pos === "bottom-right"
            ) {
              // Handle compound positions
              if (pos === "top-left") {
                x = "left";
                y = "top";
              } else if (pos === "top-right") {
                x = "right";
                y = "top";
              } else if (pos === "bottom-left") {
                x = "left";
                y = "bottom";
              } else if (pos === "bottom-right") {
                x = "right";
                y = "bottom";
              } else if (pos === "left" || pos === "right") {
                x = pos;
                y = "center";
              } else {
                y = pos as "top" | "bottom" | "center";
              }
            }
          }

          // Map text style to font
          if (parsedCommand.text.style) {
            const style = parsedCommand.text.style.toLowerCase();
            switch (style) {
              case "serif":
                fontFamily = "serif";
                break;
              case "monospace":
              case "mono":
                fontFamily = "RobotoMono, monospace";
                break;
              case "handwriting":
              case "script":
                // Fallback to sans-serif if handwriting font not available
                fontFamily = "Roboto, sans-serif";
                fontWeight = "normal";
                break;
              case "thin":
                fontWeight = "normal";
                break;
              case "bold":
                fontWeight = "bold";
                break;
              default:
                // Keep default Roboto sans-serif
                break;
            }
          }

          logger.info("Using font settings", {
            fontFamily,
            fontWeight,
            fontSize,
            textStyle: parsedCommand.text.style,
          });

          // Add text to the image
          resultBuffer = await addTextToImage(
            resultBuffer,
            parsedCommand.text.content,
            {
              x,
              y,
              fontSize,
              fontFamily,
              fontWeight,
              color,
              strokeColor,
              strokeWidth,
              shadow,
              backgroundColor: parsedCommand.text.backgroundColor,
              padding: 10,
              maxWidth: 800,
              lineHeight: 1.2,
              align: "center",
            }
          );

          // Update the preview with text as well
          previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
          const imageWithText = await loadImage(resultBuffer);
          previewCtx.drawImage(
            imageWithText,
            0,
            0,
            imageWithText.width,
            imageWithText.height,
            0,
            0,
            previewCanvas.width,
            previewCanvas.height
          );
          previewBuffer = previewCanvas.toBuffer("image/png");
        }

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

            // Check if this request is coming from Farcaster
            if (isFarcaster) {
              logger.info(
                "Request is from Farcaster, prioritizing Grove storage"
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
                isFarcaster: isFarcaster || false,
              });
            } else {
              logger.warn("Grove storage returned empty URI or URL", {
                uri: groveResult.uri,
                gatewayUrl: groveResult.gatewayUrl,
                walletAddress: walletAddressForOverlay || "none",
                isFarcaster: isFarcaster || false,
              });

              // If this is a Farcaster request and Grove storage failed, try again
              if (isFarcaster) {
                logger.info("Retrying Grove storage for Farcaster request");
                try {
                  // Try again with a different file name
                  const retryFileName = `retry-${
                    parsedCommand.overlayMode || "generated"
                  }-${resultId}.png`;

                  const retryResult = await uploadToGrove(
                    resultBuffer,
                    retryFileName
                  );

                  if (retryResult.uri && retryResult.gatewayUrl) {
                    groveUri = retryResult.uri;
                    groveUrl = retryResult.gatewayUrl;
                    logger.info("Successfully stored image in Grove on retry", {
                      groveUri,
                      groveUrl,
                    });
                  }
                } catch (retryError) {
                  logger.error("Failed to store image in Grove on retry", {
                    error:
                      retryError instanceof Error
                        ? retryError.message
                        : String(retryError),
                  });
                }
              }
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

        return response;
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
      });

      return {
        id: requestId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
