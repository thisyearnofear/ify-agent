import { GoogleGenerativeAI } from "@google/generative-ai";
import { ParsedCommand } from "./agent-types";
import { logger } from "./logger";
import { OverlayMode } from "@/components/ImageOverlay";

// Initialize the Gemini API
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// Define the model
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Define the prompt template
const SYSTEM_PROMPT = `
You are a command parser for an image generation and overlay application.
Your task is to extract structured information from natural language commands.

The application supports the following actions:
1. generate - Generate a new image from a text prompt
2. overlay - Apply an overlay to an existing image
3. adjust - Adjust the position, scale, color, or opacity of an overlay

The application supports the following overlay modes:
1. degenify - Apply a "degen" style overlay
2. higherify - Apply a "higher" style overlay
3. scrollify - Apply a "scroll" style overlay

Note: The "wowowify" overlay is not currently supported.

The application supports the following control parameters:
1. scale - A number representing the scale of the overlay (default: 1.0)
2. x - A number representing the x-coordinate offset of the overlay (default: 0)
3. y - A number representing the y-coordinate offset of the overlay (default: 0)
4. overlayColor - A string representing the color of the overlay (default: "#000000")
5. overlayAlpha - A number between 0 and 1 representing the opacity of the overlay (default: 0.5)

Extract the following information from the user's command:
1. action: "generate", "overlay", or "adjust"
2. prompt: The text prompt for image generation (if action is "generate")
3. overlayMode: The overlay mode to apply (if action is "overlay" or if overlay is mentioned)
4. baseImageUrl: The URL of an existing image (if provided)
5. controls: An object containing any control parameters mentioned

Return the information in JSON format.
`;

/**
 * Parse a command using Gemini AI
 */
export async function parseWithGemini(command: string): Promise<ParsedCommand> {
  if (!apiKey) {
    logger.warn("GEMINI_API_KEY not configured, falling back to basic parsing");
    throw new Error("GEMINI_API_KEY not configured");
  }

  try {
    logger.info("Parsing command with Gemini", { command });

    // Generate content with Gemini
    const result = await model.generateContent([
      SYSTEM_PROMPT,
      `User command: "${command}"`,
    ]);

    const response = result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch =
      text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*?}/);

    if (!jsonMatch) {
      logger.error("Failed to extract JSON from Gemini response", { text });
      throw new Error("Failed to parse command with Gemini");
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    // Validate and normalize the parsed command
    const parsedCommand: ParsedCommand = {
      action: validateAction(parsed.action),
      prompt: parsed.prompt,
      overlayMode: validateOverlayMode(parsed.overlayMode),
      baseImageUrl: parsed.baseImageUrl,
      controls: parsed.controls,
    };

    logger.info("Gemini parsed command", {
      action: parsedCommand.action,
      prompt: parsedCommand.prompt,
      overlayMode: parsedCommand.overlayMode,
      baseImageUrl: parsedCommand.baseImageUrl,
      hasControls: parsedCommand.controls ? true : false,
    });
    return parsedCommand;
  } catch (error) {
    logger.error("Error parsing with Gemini", {
      error: error instanceof Error ? error.message : "Unknown error",
      command,
    });
    throw error;
  }
}

/**
 * Validate and normalize the action
 */
function validateAction(
  action: string
): "generate" | "overlay" | "adjust" | "download" {
  const normalizedAction = action?.toLowerCase();

  if (
    normalizedAction === "generate" ||
    normalizedAction === "overlay" ||
    normalizedAction === "adjust" ||
    normalizedAction === "download"
  ) {
    return normalizedAction;
  }

  return "generate"; // Default action
}

/**
 * Validate and normalize the overlay mode
 */
function validateOverlayMode(mode: string): OverlayMode | undefined {
  if (!mode) return undefined;

  const normalizedMode = mode.toLowerCase();

  if (normalizedMode === "degenify" || normalizedMode === "degen") {
    return "degenify";
  }

  if (normalizedMode === "higherify" || normalizedMode === "higher") {
    return "higherify";
  }

  if (normalizedMode === "scrollify" || normalizedMode === "scroll") {
    return "scrollify";
  }

  return undefined;
}
