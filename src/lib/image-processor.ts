import { ParsedCommand } from "./agent-types";
import { logger } from "./logger";
import { v4 as uuidv4 } from "uuid";
import canvas from "canvas";
import { storeImage } from "./image-store";
import { CanvasRenderingContext2D as NodeCanvasRenderingContext2D } from "canvas";
import fs from "fs";
import path from "path";
import https from "https";

// Add type declarations for canvas
const { createCanvas, loadImage, registerFont } = canvas;

// Font paths for bundled fonts
const FONT_DIRECTORY = path.join(process.cwd(), "public/fonts");
const ROBOTO_REGULAR_PATH = path.join(FONT_DIRECTORY, "Roboto-Regular.ttf");
const ROBOTO_BOLD_PATH = path.join(FONT_DIRECTORY, "Roboto-Bold.ttf");
const ROBOTO_MONO_PATH = path.join(FONT_DIRECTORY, "RobotoMono-Regular.ttf");

// Font URLs from Google Fonts - using TTF files for better compatibility
const ROBOTO_REGULAR_URL =
  "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf";
const ROBOTO_BOLD_URL =
  "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc-.ttf";
const ROBOTO_MONO_URL =
  "https://fonts.gstatic.com/s/robotomono/v22/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_3vq_SuW4.ttf";

// Flag to track if fonts have been registered
let fontsRegistered = false;

// Function to download and register fonts
export async function ensureFontsAreRegistered() {
  // If fonts are already registered, don't try again
  if (fontsRegistered) {
    return true;
  }

  try {
    // In production (Vercel), use a memory-based approach
    if (process.env.VERCEL === "1") {
      try {
        // In Vercel, we'll use the system fonts directly
        logger.info("Running in Vercel environment, using system fonts");

        // Register system fonts as fallbacks
        registerFont(
          path.join(process.cwd(), "public/fonts/Roboto-Regular.ttf"),
          {
            family: "Roboto",
            weight: "normal",
          }
        );

        registerFont(path.join(process.cwd(), "public/fonts/Roboto-Bold.ttf"), {
          family: "Roboto",
          weight: "bold",
        });

        registerFont(
          path.join(process.cwd(), "public/fonts/RobotoMono-Regular.ttf"),
          {
            family: "RobotoMono",
          }
        );

        fontsRegistered = true;
        logger.info(
          "Successfully registered bundled fonts in Vercel environment"
        );
        return true;
      } catch (vercelError) {
        logger.error("Error registering bundled fonts in Vercel", {
          error:
            vercelError instanceof Error
              ? vercelError.message
              : "Unknown error",
        });
        // Continue with system fonts
        fontsRegistered = true;
        return true;
      }
    }

    // For local development, use the file-based approach
    // Create font directory if it doesn't exist
    if (!fs.existsSync(FONT_DIRECTORY)) {
      fs.mkdirSync(FONT_DIRECTORY, { recursive: true });
      logger.info("Created font directory", { path: FONT_DIRECTORY });
    }

    try {
      // Download and register Roboto Regular if needed
      if (!fs.existsSync(ROBOTO_REGULAR_PATH)) {
        await downloadFont(ROBOTO_REGULAR_URL, ROBOTO_REGULAR_PATH);
        logger.info("Downloaded Roboto Regular font", {
          path: ROBOTO_REGULAR_PATH,
        });
      }

      // Download and register Roboto Bold if needed
      if (!fs.existsSync(ROBOTO_BOLD_PATH)) {
        await downloadFont(ROBOTO_BOLD_URL, ROBOTO_BOLD_PATH);
        logger.info("Downloaded Roboto Bold font", {
          path: ROBOTO_BOLD_PATH,
        });
      }

      // Download and register Roboto Mono if needed
      if (!fs.existsSync(ROBOTO_MONO_PATH)) {
        await downloadFont(ROBOTO_MONO_URL, ROBOTO_MONO_PATH);
        logger.info("Downloaded Roboto Mono font", {
          path: ROBOTO_MONO_PATH,
        });
      }

      // Register fonts with canvas
      registerFont(ROBOTO_REGULAR_PATH, { family: "Roboto", weight: "normal" });
      registerFont(ROBOTO_BOLD_PATH, { family: "Roboto", weight: "bold" });
      registerFont(ROBOTO_MONO_PATH, { family: "RobotoMono" });

      fontsRegistered = true;
      logger.info("Successfully registered fonts for canvas");
    } catch (downloadError) {
      logger.error(
        "Error downloading or registering fonts, using embedded fallback",
        {
          error:
            downloadError instanceof Error
              ? downloadError.message
              : "Unknown error",
        }
      );

      // Use embedded fallback fonts if downloading fails
      try {
        // Register the default sans-serif font as a fallback
        logger.info("Using system fonts as fallback");
        fontsRegistered = true;
      } catch (fallbackError) {
        logger.error("Failed to use fallback fonts", {
          error:
            fallbackError instanceof Error
              ? fallbackError.message
              : "Unknown error",
        });
      }
    }

    return fontsRegistered;
  } catch (error) {
    logger.error("Error in font registration process", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}

// Function to download a font file
function downloadFont(url: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(destination, () => {}); // Delete the file if there's an error
        reject(err);
      });
  });
}

// Try to register fonts on module load
ensureFontsAreRegistered().catch((err) => {
  logger.error("Failed to register fonts on startup", {
    error: err instanceof Error ? err.message : String(err),
  });
});

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

  // Ensure fonts are registered before processing
  await ensureFontsAreRegistered();

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

    // Apply text overlay if specified
    if (command.text && command.text.content) {
      logger.info("Applying text overlay", {
        text: command.text.content,
        position: command.text.position,
        fontSize: command.text.fontSize,
        color: command.text.color,
        style: command.text.style,
      });

      try {
        // Get result image buffer from current canvas
        const currentBuffer = canvas.toBuffer("image/png");

        // Determine text position
        const textPosition: {
          x: number | "center" | "left" | "right";
          y: number | "center" | "top" | "bottom";
        } = { x: "center", y: "center" };

        if (command.text.position) {
          switch (command.text.position.toLowerCase()) {
            case "top":
              textPosition.y = "top";
              break;
            case "bottom":
              textPosition.y = "bottom";
              break;
            case "left":
              textPosition.x = "left";
              break;
            case "right":
              textPosition.x = "right";
              break;
            case "top-left":
              textPosition.x = "left";
              textPosition.y = "top";
              break;
            case "top-right":
              textPosition.x = "right";
              textPosition.y = "top";
              break;
            case "bottom-left":
              textPosition.x = "left";
              textPosition.y = "bottom";
              break;
            case "bottom-right":
              textPosition.x = "right";
              textPosition.y = "bottom";
              break;
          }
        }

        // Determine font style
        let fontFamily = "Arial";
        let fontWeight = "bold";

        if (command.text.style) {
          switch (command.text.style.toLowerCase()) {
            case "serif":
              fontFamily = "Times New Roman";
              break;
            case "monospace":
              fontFamily = "Courier New";
              break;
            case "handwriting":
              fontFamily = "Comic Sans MS";
              break;
            case "thin":
              fontWeight = "normal";
              break;
            case "bold":
              fontWeight = "bold";
              break;
          }
        }

        // Apply text to image
        const textBuffer = await addTextToImage(
          currentBuffer,
          command.text.content,
          {
            x: textPosition.x,
            y: textPosition.y,
            fontSize: command.text.fontSize || 32,
            fontFamily,
            fontWeight,
            color: command.text.color || "white",
            strokeColor: "black",
            strokeWidth: 2,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            padding: 10,
            maxWidth: canvas.width - 40,
            lineHeight: 1.2,
            align: "center",
            shadow: {
              color: "rgba(0, 0, 0, 0.7)",
              offsetX: 2,
              offsetY: 2,
              blur: 3,
            },
          }
        );

        // Load the new image with text
        const imageWithText = await loadImage(textBuffer);

        // Clear canvas and draw the new image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageWithText, 0, 0);

        logger.info("Text overlay applied successfully", {
          text: command.text.content,
        });
      } catch (error) {
        logger.error("Error applying text overlay", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          text: command.text.content,
        });
        // Continue without the text overlay rather than failing completely
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

/**
 * Adds text to an image
 * @param imageBuffer The image buffer to add text to
 * @param text The text to add
 * @param options Text options including position, font, color, etc.
 * @returns A buffer containing the image with text
 */
export async function addTextToImage(
  imageBuffer: Buffer,
  text: string,
  options: {
    x?: number | "center" | "left" | "right";
    y?: number | "center" | "top" | "bottom";
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    color?: string;
    strokeColor?: string;
    strokeWidth?: number;
    backgroundColor?: string;
    padding?: number;
    maxWidth?: number;
    lineHeight?: number;
    align?: "left" | "center" | "right";
    rotation?: number;
    shadow?: {
      color: string;
      offsetX: number;
      offsetY: number;
      blur: number;
    };
  } = {}
): Promise<Buffer> {
  // Ensure fonts are registered before proceeding
  await ensureFontsAreRegistered();

  // Load the image
  const image = await loadImage(imageBuffer);

  // Create a canvas with the same dimensions as the image
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");

  // Draw the original image on the canvas
  ctx.drawImage(image, 0, 0, image.width, image.height);

  // Set default options
  const {
    x = "center",
    y = "center",
    fontSize = 32,
    fontFamily = "sans-serif", // Use system sans-serif font
    fontWeight = "bold",
    color = "white",
    strokeColor,
    strokeWidth = 0,
    backgroundColor,
    padding = 10,
    maxWidth = image.width - 40,
    lineHeight = 1.2,
    align = "center",
    rotation = 0,
    shadow,
  } = options;

  // Map style to system fonts or our registered fonts
  let actualFontFamily = "sans-serif";

  // Try to use our registered Roboto fonts first
  if (fontFamily.toLowerCase().includes("mono")) {
    actualFontFamily = "RobotoMono, monospace";
  } else if (
    fontFamily.toLowerCase().includes("serif") &&
    !fontFamily.toLowerCase().includes("sans")
  ) {
    actualFontFamily = "serif";
  } else {
    // Default to Roboto for sans-serif
    actualFontFamily = "Roboto, sans-serif";
  }

  // Set font - use system fonts only
  try {
    // Calculate font size that will fit the image width
    let adaptedFontSize = fontSize;

    // Set initial font to measure text
    ctx.font = `${fontWeight} ${fontSize}px ${actualFontFamily}`;

    // Measure the text width
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;

    // If text is too wide, scale down the font
    if (textWidth > maxWidth) {
      adaptedFontSize = Math.floor(fontSize * (maxWidth / textWidth) * 0.9); // 0.9 for some margin
      adaptedFontSize = Math.max(12, adaptedFontSize); // Don't go below 12px
    }

    // Set the adapted font
    ctx.font = `${fontWeight} ${adaptedFontSize}px ${actualFontFamily}`;

    // Log the font being used
    logger.info("Setting font for text overlay", {
      fontString: ctx.font,
      fontSize: adaptedFontSize,
      originalFontSize: fontSize,
      fontFamily: actualFontFamily,
      fontWeight,
      textWidth,
      maxWidth,
    });
  } catch (error) {
    // Fallback to a very basic font if there's an error
    logger.error("Error setting font, using fallback", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    ctx.font = `${fontSize}px sans-serif`;
  }

  // Set text alignment
  ctx.textAlign = align as CanvasTextAlign;
  ctx.textBaseline = "middle";

  // Apply shadow if specified
  if (shadow) {
    ctx.shadowColor = shadow.color;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
    ctx.shadowBlur = shadow.blur;
  }

  // Calculate position with better precision
  let posX: number;
  if (x === "center") {
    posX = image.width / 2;
  } else if (x === "left") {
    posX = padding;
    ctx.textAlign = "left";
  } else if (x === "right") {
    posX = image.width - padding;
    ctx.textAlign = "right";
  } else {
    posX = x;
  }

  let posY: number;
  if (y === "center") {
    posY = image.height / 2;
  } else if (y === "top") {
    posY = padding + fontSize / 2;
  } else if (y === "bottom") {
    posY = image.height - padding - fontSize / 2;
  } else {
    posY = y;
  }

  // Apply rotation if specified
  if (rotation !== 0) {
    ctx.save();
    ctx.translate(posX, posY);
    ctx.rotate((rotation * Math.PI) / 180);
    posX = 0;
    posY = 0;
  }

  // Split text into lines if it exceeds maxWidth
  const lines = wrapText(ctx, text, maxWidth);
  const totalHeight = lines.length * fontSize * lineHeight;

  // Draw background if specified
  if (backgroundColor) {
    const bgPadding = padding;
    const bgX =
      align === "left"
        ? posX
        : align === "right"
        ? posX - maxWidth
        : posX - maxWidth / 2;
    const bgY = posY - totalHeight / 2 - bgPadding;
    const bgWidth = maxWidth + bgPadding * 2;
    const bgHeight = totalHeight + bgPadding * 2;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
  }

  // Draw each line of text
  ctx.fillStyle = color;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineY =
      posY - totalHeight / 2 + i * fontSize * lineHeight + fontSize / 2;

    // Draw stroke if specified
    if (strokeColor && strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.strokeText(line, posX, lineY);
    }

    // Draw text
    ctx.fillText(line, posX, lineY);
  }

  // Restore context if rotated
  if (rotation !== 0) {
    ctx.restore();
  }

  // Convert canvas to buffer
  return canvas.toBuffer("image/png");
}

/**
 * Wraps text to fit within a maximum width
 * @param ctx Canvas context
 * @param text Text to wrap
 * @param maxWidth Maximum width in pixels
 * @returns Array of lines
 */
function wrapText(
  ctx: NodeCanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && i > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
