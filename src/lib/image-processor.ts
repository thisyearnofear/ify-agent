import { ParsedCommand } from "./agent-types";
import { logger } from "./logger";
import { v4 as uuidv4 } from "uuid";
import canvas from "canvas";
import { storeImage } from "./image-store";

// Add type declarations for canvas
const { createCanvas, loadImage } = canvas;

// For serverless environment, we'll use these URLs for overlays
const OVERLAY_URLS = {
  degenify: "https://wowowifyer.vercel.app/degen/degenify.png",
  higherify: "https://wowowifyer.vercel.app/higher/arrows/Arrow-png-white.png",
  scrollify: "https://wowowifyer.vercel.app/scroll/scrollify.png",
};

// Preload overlay images to speed up processing
const OVERLAY_PROMISES = {
  degenify: loadImage(OVERLAY_URLS.degenify).catch((err): null => {
    logger.error("Failed to preload degenify overlay", { error: err.message });
    return null;
  }),
  higherify: loadImage(OVERLAY_URLS.higherify).catch((err): null => {
    logger.error("Failed to preload higherify overlay", { error: err.message });
    return null;
  }),
  scrollify: loadImage(OVERLAY_URLS.scrollify).catch((err): null => {
    logger.error("Failed to preload scrollify overlay", { error: err.message });
    return null;
  }),
};

interface ProcessResult {
  resultUrl: string;
  previewUrl: string;
  resultId: string;
  previewId: string;
}

/**
 * Generate an image using the Venice API
 */
export async function generateImage(prompt: string): Promise<string> {
  logger.info("Generating image", { prompt });

  try {
    // Call Venice API directly instead of going through our own API
    const apiUrl = "https://api.venice.ai/api/v1/image/generate";

    logger.info("Calling Venice API directly", { apiUrl });

    if (!process.env.VENICE_API_KEY) {
      logger.error("VENICE_API_KEY is not configured");
      throw new Error("Server configuration error: Missing API key");
    }

    // Set a timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          model: "stable-diffusion-3.5",
          hide_watermark: true,
          width: 512, // Smaller size for faster generation
          height: 512,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text();
        logger.error("Venice API error", {
          status: response.status,
          statusText: response.statusText,
          responseText: text,
        });
        throw new Error(`Failed to wowowify: ${response.statusText}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (error) {
        logger.error("Error parsing JSON from Venice API", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw new Error("Failed to parse response from Venice API");
      }

      if (data.images?.[0]) {
        return data.images[0]; // Return base64 image
      }

      throw new Error("No image generated");
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        throw new Error(
          "Image generation timed out - please try again with a simpler prompt"
        );
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    logger.error("Error generating image", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      prompt,
    });
    throw error;
  }
}

/**
 * Download an image from a URL
 */
export async function downloadImage(url: string): Promise<Buffer> {
  logger.info("Downloading image", { url });

  try {
    // Set a timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        throw new Error("Image download timed out");
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    logger.error("Error downloading image", {
      error: error instanceof Error ? error.message : "Unknown error",
      url,
    });
    throw error;
  }
}

/**
 * Process an image based on the parsed command
 */
export async function processImage(
  command: ParsedCommand
): Promise<ProcessResult> {
  logger.info("Processing image", { action: command.action });

  const resultId = uuidv4();
  const previewId = uuidv4();

  try {
    // Get base image
    let baseImageBuffer: Buffer;

    if (command.baseImageUrl) {
      // Download image from URL
      baseImageBuffer = await downloadImage(command.baseImageUrl);
    } else if (command.prompt) {
      // wowowify from prompt
      const base64Image = await generateImage(command.prompt);
      baseImageBuffer = Buffer.from(base64Image, "base64");
    } else {
      throw new Error("No base image URL or prompt provided");
    }

    // Load base image
    const baseImage = await loadImage(baseImageBuffer);

    // Create canvas with base image dimensions
    const canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext("2d");

    // Draw base image
    ctx.drawImage(baseImage, 0, 0);

    // Apply color overlay if specified
    if (command.controls?.overlayAlpha && command.controls.overlayAlpha > 0) {
      ctx.fillStyle = command.controls.overlayColor || "#000000";
      ctx.globalAlpha = command.controls.overlayAlpha;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }

    // Load and apply overlay image if mode is specified
    if (command.overlayMode) {
      logger.info("Applying overlay", { overlayMode: command.overlayMode });

      try {
        // Try to get the preloaded overlay image
        let overlayImage = null;
        if (command.overlayMode === "degenify") {
          overlayImage = await OVERLAY_PROMISES.degenify;
        } else if (command.overlayMode === "higherify") {
          overlayImage = await OVERLAY_PROMISES.higherify;
        } else if (command.overlayMode === "scrollify") {
          overlayImage = await OVERLAY_PROMISES.scrollify;
        }

        // If preloaded image failed, try to load it directly
        if (!overlayImage) {
          const overlayUrl =
            OVERLAY_URLS[command.overlayMode as keyof typeof OVERLAY_URLS];
          if (!overlayUrl) {
            throw new Error(`Unsupported overlay mode: ${command.overlayMode}`);
          }

          logger.info("Loading overlay image directly", { overlayUrl });
          const overlayBuffer = await downloadImage(overlayUrl);
          overlayImage = await loadImage(overlayBuffer);
        }

        // Calculate scale and position
        const scale = command.controls?.scale || 1;
        const scaledWidth = overlayImage.width * scale;
        const scaledHeight = overlayImage.height * scale;

        // Calculate position (centered by default)
        const x = (canvas.width - scaledWidth) / 2 + (command.controls?.x || 0);
        const y =
          (canvas.height - scaledHeight) / 2 + (command.controls?.y || 0);

        // Draw overlay
        ctx.drawImage(overlayImage, x, y, scaledWidth, scaledHeight);
        logger.info("Overlay applied successfully", {
          overlayMode: command.overlayMode,
          scale,
          x,
          y,
        });
      } catch (error) {
        logger.error("Error applying overlay", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          overlayMode: command.overlayMode,
        });
        // Continue without the overlay rather than failing completely
      }
    }

    // Get result image buffer
    const resultBuffer = canvas.toBuffer("image/png");

    // Create preview (smaller version) - use a smaller size for faster processing
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

    return {
      resultUrl: `/api/image?id=${resultId}`,
      previewUrl: `/api/image?id=${previewId}`,
      resultId,
      previewId,
    };
  } catch (error) {
    logger.error("Error processing image", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      action: command.action,
    });
    throw error;
  }
}
