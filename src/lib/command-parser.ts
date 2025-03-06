import { ParsedCommand } from "./agent-types";
import { logger } from "./logger";

// Regular expressions for parsing commands
const URL_PATTERN = /https?:\/\/[^\s]+/;
const OVERLAY_PATTERNS = [
  /apply\s+(higherify|degenify|scrollify)/i,
  /use\s+(higherify|degenify|scrollify)/i,
  /with\s+(higherify|degenify|scrollify)/i,
];
const POSITION_PATTERNS = [
  /position\s+(?:at|to)?\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/i,
  /move\s+(?:to)?\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/i,
  /place\s+(?:at)?\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/i,
];
const SCALE_PATTERNS = [
  /scale\s+(?:to|by)?\s*(-?\d+\.?\d*)/i,
  /resize\s+(?:to|by)?\s*(-?\d+\.?\d*)/i,
  /size\s+(?:to|of)?\s*(-?\d+\.?\d*)/i,
];
const COLOR_PATTERNS = [
  /color\s+(?:to|of)?\s*([a-z]+)/i,
  /set\s+color\s+(?:to|of)?\s*([a-z]+)/i,
];
const OPACITY_PATTERNS = [
  /opacity\s+(?:to|of)?\s*(-?\d+\.?\d*)/i,
  /alpha\s+(?:to|of)?\s*(-?\d+\.?\d*)/i,
  /transparent\s+(?:to|of)?\s*(-?\d+\.?\d*)/i,
];
const GENERATE_PATTERNS = [
  /generate\s+(?:an?\s+image\s+(?:of|with))?\s*(.*)/i,
  /create\s+(?:an?\s+image\s+(?:of|with))?\s*(.*)/i,
  /make\s+(?:an?\s+image\s+(?:of|with))?\s*(.*)/i,
];

// Control instruction patterns to remove from prompt
const CONTROL_INSTRUCTION_PATTERNS = [
  /scale\s+(?:to|by)?\s*-?\d+\.?\d*/gi,
  /resize\s+(?:to|by)?\s*-?\d+\.?\d*/gi,
  /size\s+(?:to|of)?\s*-?\d+\.?\d*/gi,
  /position\s+(?:at|to)?\s*-?\d+\.?\d*[,\s]+-?\d+\.?\d*/gi,
  /move\s+(?:to)?\s*-?\d+\.?\d*[,\s]+-?\d+\.?\d*/gi,
  /place\s+(?:at)?\s*-?\d+\.?\d*[,\s]+-?\d+\.?\d*/gi,
  /color\s+(?:to|of)?\s*[a-z]+/gi,
  /set\s+color\s+(?:to|of)?\s*[a-z]+/gi,
  /opacity\s+(?:to|of)?\s*-?\d+\.?\d*/gi,
  /alpha\s+(?:to|of)?\s*-?\d+\.?\d*/gi,
  /transparent\s+(?:to|of)?\s*-?\d+\.?\d*/gi,
  /set\s+opacity\s+(?:to)?\s*-?\d+\.?\d*/gi,
];

/**
 * Clean a prompt by removing overlay and control instructions
 */
function cleanPrompt(text: string): string {
  let cleanedText = text;

  // Remove overlay mode terms
  cleanedText = cleanedText
    .replace(/\b(higherify|degenify|scrollify)\b/gi, "")
    .replace(/\b(overlay|style|effect)\b/gi, "");

  // Remove control instructions
  for (const pattern of CONTROL_INSTRUCTION_PATTERNS) {
    cleanedText = cleanedText.replace(pattern, "");
  }

  // Clean up multiple spaces, dots, commas at the end
  cleanedText = cleanedText
    .replace(/\s{2,}/g, " ")
    .replace(/[.,\s]+$/, "")
    .trim();

  return cleanedText;
}

/**
 * Parse a natural language command into structured parameters
 */
export function parseCommand(input: string): ParsedCommand {
  logger.info("Parsing command", { command: input });

  const result: ParsedCommand = {
    action: "generate", // Default action
  };

  // Check for image URL
  const urlMatch = input.match(URL_PATTERN);
  if (urlMatch) {
    result.baseImageUrl = urlMatch[1];
    result.action = "overlay";
  }

  // Check for overlay mode
  for (const pattern of OVERLAY_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      const overlayName = match[1].toLowerCase();
      if (
        overlayName === "higherify" ||
        overlayName === "degenify" ||
        overlayName === "scrollify"
      ) {
        result.overlayMode = overlayName;
        result.action = "overlay";
      }
      break;
    }
  }

  // Check for implicit overlay mode
  if (!result.overlayMode) {
    if (
      input.toLowerCase().includes("higherify") ||
      input.toLowerCase().includes("higher overlay") ||
      input.toLowerCase().includes("higher style")
    ) {
      result.overlayMode = "higherify";
      result.action = "overlay";
    } else if (
      input.toLowerCase().includes("degenify") ||
      input.toLowerCase().includes("degen overlay") ||
      input.toLowerCase().includes("degen style")
    ) {
      result.overlayMode = "degenify";
      result.action = "overlay";
    } else if (
      input.toLowerCase().includes("scrollify") ||
      input.toLowerCase().includes("scroll overlay") ||
      input.toLowerCase().includes("scroll style")
    ) {
      result.overlayMode = "scrollify";
      result.action = "overlay";
    }
  }

  // Initialize controls object if any control parameters are found
  const controls: ParsedCommand["controls"] = {};

  // Check for position
  for (const pattern of POSITION_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      controls.x = parseFloat(match[1]);
      controls.y = parseFloat(match[2]);
      result.action = "adjust";
      break;
    }
  }

  // Check for scale
  for (const pattern of SCALE_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      controls.scale = parseFloat(match[1]);
      result.action = "adjust";
      break;
    }
  }

  // Check for color
  for (const pattern of COLOR_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      controls.overlayColor = match[1];
      result.action = "adjust";
      break;
    }
  }

  // Check for opacity
  for (const pattern of OPACITY_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      let opacity = parseFloat(match[1]);
      // Normalize opacity to 0-1 range
      if (opacity > 1) {
        opacity = opacity / 100;
      }
      controls.overlayAlpha = opacity;
      result.action = "adjust";
      break;
    }
  }

  // Add controls to result if any were found
  if (Object.keys(controls).length > 0) {
    result.controls = controls;
  }

  // Extract the prompt from the input
  // First, try to find a specific generate command
  if (!result.baseImageUrl) {
    for (const pattern of GENERATE_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        const promptText = cleanPrompt(match[1]);
        if (promptText) {
          result.prompt = promptText;
          result.action = "generate";
        }
        break;
      }
    }
  }

  // If no specific generate command was found, try to extract a prompt from the whole input
  if (!result.prompt && !result.baseImageUrl && input.length > 10) {
    const promptText = cleanPrompt(input);

    if (promptText.length > 5) {
      result.prompt = promptText;
      result.action = "generate";
    }
  }

  // If we have an overlay mode but no action, set action to overlay
  if (
    !result.overlayMode &&
    (input.toLowerCase().includes("overlay") ||
      input.toLowerCase().includes("style") ||
      input.toLowerCase().includes("effect"))
  ) {
    // Default to higherify instead of wowowify
    result.overlayMode = "higherify";
    result.action = "overlay";
  }

  // If we have a prompt and overlay-related terms, add overlay mode
  if (
    result.action === "generate" &&
    result.prompt &&
    (input.toLowerCase().includes("overlay") ||
      input.toLowerCase().includes("style") ||
      input.toLowerCase().includes("effect"))
  ) {
    result.overlayMode = result.overlayMode || "higherify";
  }

  logger.info("Parsed command", {
    action: result.action,
    prompt: result.prompt,
    overlayMode: result.overlayMode,
    baseImageUrl: result.baseImageUrl,
    hasControls: result.controls ? true : false,
    ...(result.controls
      ? {
          scale: result.controls.scale,
          x: result.controls.x,
          y: result.controls.y,
          overlayColor: result.controls.overlayColor,
          overlayAlpha: result.controls.overlayAlpha,
        }
      : {}),
  });
  return result;
}
