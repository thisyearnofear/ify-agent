import { ParsedCommand } from "./agent-types";
import { logger } from "./logger";
import { OverlayMode } from "@/components/ImageOverlay";

// Regular expressions for parsing commands
const URL_PATTERN = /https?:\/\/[^\s]+/;
const OVERLAY_PATTERNS = [
  /apply\s+(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify)/i,
  /use\s+(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify)/i,
  /with\s+(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify)/i,
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

// Patterns for overlaying images from casts
const PARENT_IMAGE_PATTERNS = [
  /overlay\s+(?:on|to|onto)\s+(?:this|parent|above|previous)\s+image/i,
  /apply\s+(?:to|on|onto)\s+(?:this|parent|above|previous)\s+image/i,
  /use\s+(?:this|parent|above|previous)\s+image/i,
  /(?:this|parent|above|previous)\s+image/i,
  // Add more flexible patterns
  /overlay\s+this/i,
  /apply\s+to\s+this/i,
  /this\s+photo/i,
  /this\s+picture/i,
  /this\s+cast/i,
  /this\s+one/i,
  /^(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify)\s+this/i,
  /^(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify)\.?\s*$/i, // Just the overlay name alone
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
  /overlay\s+(?:on|to|onto)\s+(?:this|parent|above|previous)\s+image/gi,
  /apply\s+(?:to|on|onto)\s+(?:this|parent|above|previous)\s+image/gi,
  /use\s+(?:this|parent|above|previous)\s+image/gi,
  /(?:this|parent|above|previous)\s+image/gi,
  // Add text flag patterns to remove from prompt
  /--text\s+"[^"]+"/gi,
  /--text\s+'[^']+'/gi,
  /--text\s+[^,\.\s][^,\.]+/gi,
  /--text-position\s+\w+/gi,
  /--text-size\s+\d+/gi,
  /--text-color\s+\w+/gi,
  /--text-style\s+\w+/gi,
  /--caption\s+"[^"]+"/gi,
  /--caption\s+'[^']*'/gi,
  /--caption\s+[^,\.\s][^,\.]+/gi,
  /--caption-position\s+\w+/gi,
  /--caption-size\s+\d+/gi,
  /--caption-color\s+\w+/gi,
  /--caption-style\s+\w+/gi,
  /--font-size\s+\d+/gi,
  /--font-color\s+\w+/gi,
  /--font-style\s+\w+/gi,
];

// Simplify text patterns for more reliable detection
const TEXT_PATTERNS = [
  /--text\s+"([^"]+)"/i, // --text "Hello World"
  /--text\s+'([^']+)'/i, // --text 'Hello World'
  /--text\s+([^,\.]+)/i, // --text Hello World
  /--caption\s+"([^"]+)"/i, // --caption "Hello World"
  /--caption\s+'([^']+)'/i, // --caption 'Hello World'
  /--caption\s+([^,\.]+)/i, // --caption Hello World
];

const TEXT_POSITION_PATTERNS = [
  /--text-position\s+(\w+)/i, // --text-position bottom
  /--caption-position\s+(\w+)/i, // --caption-position bottom
];

const TEXT_SIZE_PATTERNS = [
  /--text-size\s+(\d+)/i, // --text-size 48
  /--font-size\s+(\d+)/i, // --font-size 48
  /--caption-size\s+(\d+)/i, // --caption-size 48
];

const TEXT_COLOR_PATTERNS = [
  /--text-color\s+(\w+)/i, // --text-color blue
  /--font-color\s+(\w+)/i, // --font-color blue
  /--caption-color\s+(\w+)/i, // --caption-color blue
];

const TEXT_STYLE_PATTERNS = [
  /--text-style\s+(\w+)/i, // --text-style bold
  /--font-style\s+(\w+)/i, // --font-style bold
  /--caption-style\s+(\w+)/i, // --caption-style bold
];

// Add section marker patterns
const PROMPT_SECTION_PATTERN = /\[PROMPT\]:\s*(.*?)(?=\[OVERLAY\]|\[TEXT\]|$)/i;
const OVERLAY_SECTION_PATTERN =
  /\[OVERLAY\]:\s*(.*?)(?=\[PROMPT\]|\[TEXT\]|$)/i;
const TEXT_SECTION_PATTERN = /\[TEXT\]:\s*(.*?)(?=\[PROMPT\]|\[OVERLAY\]|$)/i;

// Alternative formats
const PROMPT_ALT_PATTERN = /PROMPT:\s*(.*?)(?=OVERLAY:|TEXT:|$)/i;
const OVERLAY_ALT_PATTERN = /OVERLAY:\s*(.*?)(?=PROMPT:|TEXT:|$)/i;
const TEXT_ALT_PATTERN = /TEXT:\s*(.*?)(?=PROMPT:|OVERLAY:|$)/i;

// Even more alternative formats
const CAPTION_PATTERN = /CAPTION:\s*(.*?)(?=PROMPT:|OVERLAY:|WOWOW:|$)/i;
const WOWOW_PATTERN = /WOWOW:\s*(.*?)(?=PROMPT:|CAPTION:|TEXT:|$)/i;

/**
 * Clean a prompt by removing overlay and control instructions
 */
function cleanPrompt(text: string): string {
  let cleanedText = text;

  // Remove overlay mode terms
  cleanedText = cleanedText
    .replace(
      /\b(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify)\b/gi,
      ""
    )
    .replace(/\b(overlay|style|effect)\b/gi, "");

  // Remove control instructions
  for (const pattern of CONTROL_INSTRUCTION_PATTERNS) {
    cleanedText = cleanedText.replace(pattern, "");
  }

  // Remove text flag patterns more aggressively
  cleanedText = cleanedText
    .replace(/--text\s+"[^"]*"/g, "")
    .replace(/--text\s+'[^']*'/g, "")
    .replace(/--text\s+[^-\s][^-]*(?=\s|$)/g, "")
    .replace(/--text-\w+\s+[^-\s][^-]*(?=\s|$)/g, "")
    .replace(/--caption\s+"[^"]*"/g, "")
    .replace(/--caption\s+'[^']*'/g, "")
    .replace(/--caption\s+[^-\s][^-]*(?=\s|$)/g, "")
    .replace(/--caption-\w+\s+[^-\s][^-]*(?=\s|$)/g, "");

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
  // Initialize the result with default values
  const result: ParsedCommand = {
    action: "generate",
    prompt: "",
  };

  // Extract text content and parameters
  let textContent: string | undefined;
  let textPosition: string | undefined;
  let textSize: number | undefined;
  let textColor: string | undefined;
  let textStyle: string | undefined;

  // First check for text content
  for (const pattern of TEXT_PATTERNS) {
    const match = input.match(pattern);
    if (match && match[1]) {
      textContent = match[1].trim();
      logger.info(`Extracted text content: "${textContent}"`);
      break;
    }
  }

  // Extract text position
  for (const pattern of TEXT_POSITION_PATTERNS) {
    const match = input.match(pattern);
    if (match && match[1]) {
      textPosition = match[1].toLowerCase();
      logger.info(`Extracted text position: ${textPosition}`);
      break;
    }
  }

  // Extract text size
  for (const pattern of TEXT_SIZE_PATTERNS) {
    const match = input.match(pattern);
    if (match && match[1]) {
      textSize = parseInt(match[1], 10);
      logger.info(`Extracted text size: ${textSize}`);
      break;
    }
  }

  // Extract text color
  for (const pattern of TEXT_COLOR_PATTERNS) {
    const match = input.match(pattern);
    if (match && match[1]) {
      textColor = match[1].toLowerCase();
      logger.info(`Extracted text color: ${textColor}`);
      break;
    }
  }

  // Extract text style
  for (const pattern of TEXT_STYLE_PATTERNS) {
    const match = input.match(pattern);
    if (match && match[1]) {
      textStyle = match[1].toLowerCase();
      logger.info(`Extracted text style: ${textStyle}`);
      break;
    }
  }

  // If we found any text parameters, add them to the result
  if (textContent || textPosition || textSize || textColor || textStyle) {
    // Create the text object if it doesn't exist
    if (!result.text) {
      result.text = {
        content: textContent || "Text", // Default text if none provided
      };
    } else {
      result.text.content = textContent || result.text.content || "Text";
    }

    if (textPosition) result.text.position = textPosition;
    if (textSize) result.text.fontSize = textSize;
    if (textColor) result.text.color = textColor;
    if (textStyle) result.text.style = textStyle;

    logger.info("Text parameters extracted", {
      content: result.text.content,
      position: textPosition,
      fontSize: textSize,
      color: textColor,
      style: textStyle,
    });

    // Check if this is a text-only command (no overlay mode specified)
    const hasOverlayMode =
      input.toLowerCase().includes("degenify") ||
      input.toLowerCase().includes("higherify") ||
      input.toLowerCase().includes("scrollify") ||
      input.toLowerCase().includes("lensify") ||
      input.toLowerCase().includes("higherise") ||
      input.toLowerCase().includes("dickbuttify") ||
      input.toLowerCase().includes("nikefy") ||
      input.toLowerCase().includes("nounify") ||
      input.toLowerCase().includes("baseify") ||
      input.toLowerCase().includes("clankerify") ||
      input.toLowerCase().includes("mantleify");

    // If no overlay mode is specified and we have text parameters,
    // this is likely a text-only command
    if (!hasOverlayMode) {
      // Check if this is just text parameters with no other content
      const cleanedInput = input
        .replace(/--text\s+"[^"]+"/gi, "")
        .replace(/--text\s+'[^']+'/gi, "")
        .replace(/--text\s+[^,\.\s][^,\.]+/gi, "")
        .replace(/--text-position\s+\w+/gi, "")
        .replace(/--text-size\s+\d+/gi, "")
        .replace(/--text-color\s+\w+/gi, "")
        .replace(/--text-style\s+\w+/gi, "")
        .replace(/--caption\s+"[^"]+"/gi, "")
        .replace(/--caption\s+'[^']*'/gi, "")
        .replace(/--caption\s+[^,\.\s][^,\.]+/gi, "")
        .replace(/--caption-position\s+\w+/gi, "")
        .replace(/--caption-size\s+\d+/gi, "")
        .replace(/--caption-color\s+\w+/gi, "")
        .replace(/--caption-style\s+\w+/gi, "")
        .trim();

      // If the cleaned input is empty or very short, this is a text-only command
      if (cleanedInput.length < 10) {
        result.action = "overlay";
        result.useParentImage = true;
        logger.info("Detected text-only command, will apply to parent image", {
          textContent: result.text.content,
          useParentImage: true,
        });
      }
    }
  }

  // Clean input from text flags before further processing
  let cleanedInput = input;
  for (const pattern of TEXT_PATTERNS.concat(
    TEXT_POSITION_PATTERNS,
    TEXT_SIZE_PATTERNS,
    TEXT_COLOR_PATTERNS,
    TEXT_STYLE_PATTERNS
  )) {
    cleanedInput = cleanedInput.replace(pattern, "");
  }

  // Check for structured format with section markers
  let promptSection = cleanedInput.match(PROMPT_SECTION_PATTERN)?.[1]?.trim();
  let overlaySection = cleanedInput.match(OVERLAY_SECTION_PATTERN)?.[1]?.trim();
  let textSection = cleanedInput.match(TEXT_SECTION_PATTERN)?.[1]?.trim();

  // Check alternative formats if section markers not found
  if (!promptSection && !overlaySection && !textSection) {
    promptSection = cleanedInput.match(PROMPT_ALT_PATTERN)?.[1]?.trim();
    overlaySection = cleanedInput.match(OVERLAY_ALT_PATTERN)?.[1]?.trim();
    textSection = cleanedInput.match(TEXT_ALT_PATTERN)?.[1]?.trim();
  }

  // Check even more alternative formats
  if (!promptSection && !overlaySection && !textSection) {
    promptSection = cleanedInput.match(WOWOW_PATTERN)?.[1]?.trim();
    textSection = cleanedInput.match(CAPTION_PATTERN)?.[1]?.trim();
  }

  // Process prompt section
  if (promptSection) {
    // Extract URL if present
    const urlMatch = promptSection.match(URL_PATTERN);
    if (urlMatch) {
      result.baseImageUrl = urlMatch[0];
      // Remove URL from prompt
      promptSection = promptSection.replace(URL_PATTERN, "").trim();
    }

    // Check for parent image references in the prompt
    for (const pattern of PARENT_IMAGE_PATTERNS) {
      if (pattern.test(promptSection)) {
        result.useParentImage = true;
        result.action = "overlay";
        // Remove parent image reference from prompt
        promptSection = promptSection.replace(pattern, "").trim();
        break;
      }
    }

    // Extract generation command
    for (const pattern of GENERATE_PATTERNS) {
      const match = promptSection.match(pattern);
      if (match && match[1]) {
        result.prompt = cleanPrompt(match[1].trim());
        break;
      }
    }

    // If no generation command was found, use the cleaned prompt
    if (!result.prompt) {
      result.prompt = cleanPrompt(promptSection);
    }
  }

  // Process overlay section
  if (overlaySection) {
    // Extract overlay mode
    for (const pattern of OVERLAY_PATTERNS) {
      const match = overlaySection.match(pattern);
      if (match && match[1]) {
        result.overlayMode = match[1].toLowerCase() as OverlayMode;
        break;
      }
    }

    // Extract position
    for (const pattern of POSITION_PATTERNS) {
      const match = overlaySection.match(pattern);
      if (match && match[1] && match[2]) {
        if (!result.controls) result.controls = {};
        result.controls.x = parseFloat(match[1]);
        result.controls.y = parseFloat(match[2]);
        break;
      }
    }

    // Extract scale
    for (const pattern of SCALE_PATTERNS) {
      const match = overlaySection.match(pattern);
      if (match && match[1]) {
        if (!result.controls) result.controls = {};
        result.controls.scale = parseFloat(match[1]);
        break;
      }
    }

    // Extract color
    for (const pattern of COLOR_PATTERNS) {
      const match = overlaySection.match(pattern);
      if (match && match[1]) {
        // Only set overlay color if we don't have a text color flag
        // This prevents text color from being applied to the overlay
        if (
          !input.match(/--text-color\s+\w+/i) &&
          !input.match(/--font-color\s+\w+/i) &&
          !input.match(/--caption-color\s+\w+/i)
        ) {
          if (!result.controls) result.controls = {};
          result.controls.overlayColor = match[1].toLowerCase();
        }
        break;
      }
    }

    // Extract opacity
    for (const pattern of OPACITY_PATTERNS) {
      const match = overlaySection.match(pattern);
      if (match && match[1]) {
        if (!result.controls) result.controls = {};
        result.controls.overlayAlpha = parseFloat(match[1]);
        break;
      }
    }
  } else {
    // If no overlay section, check the prompt for overlay commands (backward compatibility)
    // Extract overlay mode from the prompt
    for (const pattern of OVERLAY_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        result.overlayMode = match[1].toLowerCase() as OverlayMode;
        break;
      }
    }

    // Extract position from the prompt
    for (const pattern of POSITION_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1] && match[2]) {
        if (!result.controls) result.controls = {};
        result.controls.x = parseFloat(match[1]);
        result.controls.y = parseFloat(match[2]);
        break;
      }
    }

    // Extract scale from the prompt
    for (const pattern of SCALE_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        if (!result.controls) result.controls = {};
        result.controls.scale = parseFloat(match[1]);
        break;
      }
    }

    // Extract color from the prompt
    for (const pattern of COLOR_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        // Only set overlay color if we don't have a text color flag
        // This prevents text color from being applied to the overlay
        if (
          !input.match(/--text-color\s+\w+/i) &&
          !input.match(/--font-color\s+\w+/i) &&
          !input.match(/--caption-color\s+\w+/i)
        ) {
          if (!result.controls) result.controls = {};
          result.controls.overlayColor = match[1].toLowerCase();
        }
        break;
      }
    }

    // Extract opacity from the prompt
    for (const pattern of OPACITY_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        if (!result.controls) result.controls = {};
        result.controls.overlayAlpha = parseFloat(match[1]);
        break;
      }
    }
  }

  // Process text section
  if (textSection) {
    // Extract text content - first part before any comma is the text content
    const textParts = textSection.split(",");
    if (textParts.length > 0) {
      if (!result.text) result.text = {};
      result.text.content = textParts[0].trim();

      // Process the rest of the parts for text properties
      for (let i = 1; i < textParts.length; i++) {
        const part = textParts[i].trim().toLowerCase();

        // Check for position keywords
        if (
          [
            "top",
            "bottom",
            "left",
            "right",
            "center",
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
          ].includes(part)
        ) {
          result.text.position = part;
          continue;
        }

        // Check for size
        const sizeMatch = part.match(/size\s+(\d+)/i);
        if (sizeMatch && sizeMatch[1]) {
          result.text.fontSize = parseInt(sizeMatch[1], 10);
          continue;
        }

        // Check for color
        const colorMatch = part.match(/color\s+(\w+)/i);
        if (colorMatch && colorMatch[1]) {
          result.text.color = colorMatch[1];
          continue;
        }

        // Check for style
        const styleMatch =
          part.match(/style\s+(\w+)/i) ||
          part.match(/^(serif|monospace|handwriting|thin|bold)$/i);
        if (styleMatch && styleMatch[1]) {
          result.text.style = styleMatch[1];
          continue;
        }
      }
    }
  } else {
    // If no text section, check the prompt for text commands (backward compatibility)
    // Extract text content
    for (const pattern of TEXT_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        if (!result.text) result.text = {};
        result.text.content = match[1].trim();
        break;
      }
    }

    // Extract text position
    for (const pattern of TEXT_POSITION_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        if (!result.text) result.text = {};
        result.text.position = match[1].toLowerCase();
        break;
      }
    }

    // Extract text size
    for (const pattern of TEXT_SIZE_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        if (!result.text) result.text = {};
        result.text.fontSize = parseInt(match[1], 10);
        break;
      }
    }

    // Extract text color
    for (const pattern of TEXT_COLOR_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        if (!result.text) result.text = {};
        result.text.color = match[1].toLowerCase();
        break;
      }
    }

    // Extract text style
    for (const pattern of TEXT_STYLE_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        if (!result.text) result.text = {};
        result.text.style = match[1].toLowerCase();
        break;
      }
    }

    // Check for implicit text content
    if (!result.text?.content) {
      // Look for phrases like "a cat with the text hello world"
      const implicitTextMatch = input.match(
        /with (?:the\s+)?text\s+["']?([^"']+)["']?/i
      );
      if (implicitTextMatch && implicitTextMatch[1]) {
        if (!result.text) result.text = {};
        result.text.content = implicitTextMatch[1].trim();
      }
    }
  }

  // If we extracted text flags at the beginning, add them to the result
  if (textContent) {
    if (!result.text) result.text = {};
    result.text.content = textContent;

    if (textPosition) result.text.position = textPosition;
    if (textSize) result.text.fontSize = textSize;
    if (textColor) result.text.color = textColor;
    if (textStyle) result.text.style = textStyle;
  }

  // Check for implicit overlay mode detection
  if (!result.overlayMode) {
    // Helper function to extract prompt from overlay command
    const extractPromptFromOverlay = (overlayKeyword: string) => {
      if (!result.prompt || result.prompt.trim() === "") {
        // Remove the overlay keyword and any control parameters
        let promptText = input
          .replace(new RegExp(overlayKeyword, "gi"), "")
          .replace(/scale\s+to\s+[\d\.]+/gi, "")
          .replace(/scale\s+[\d\.]+/gi, "")
          .replace(/position\s+at\s+[\d\.]+\s*,\s*[\d\.]+/gi, "")
          .replace(/position\s+[\d\.]+\s*,\s*[\d\.]+/gi, "")
          .replace(/opacity\s+to\s+[\d\.]+/gi, "")
          .replace(/opacity\s+[\d\.]+/gi, "")
          .replace(/color\s+to\s+\w+/gi, "")
          .replace(/color\s+\w+/gi, "")
          // Also remove text parameters
          .replace(/--text\s+"[^"]+"/gi, "")
          .replace(/--text\s+'[^']+'/gi, "")
          .replace(/--text\s+[^,\.\s][^,\.]+/gi, "")
          .replace(/--text-position\s+\w+/gi, "")
          .replace(/--text-size\s+\d+/gi, "")
          .replace(/--text-color\s+\w+/gi, "")
          .replace(/--text-style\s+\w+/gi, "")
          .replace(/--caption\s+"[^"]+"/gi, "")
          .replace(/--caption\s+'[^']*'/gi, "")
          .replace(/--caption\s+[^,\.\s][^,\.]+/gi, "")
          .replace(/--caption-position\s+\w+/gi, "")
          .replace(/--caption-size\s+\d+/gi, "")
          .replace(/--caption-color\s+\w+/gi, "")
          .replace(/--caption-style\s+\w+/gi, "")
          .trim();

        // Clean up punctuation
        promptText = promptText.replace(/^\s*[a\.\,\:\;]+\s*/g, "").trim();

        if (promptText) {
          result.prompt = promptText;
          logger.info(`Extracted prompt from overlay command: "${promptText}"`);
        }
      }
    };

    // Check if the input contains any of the overlay mode keywords
    if (
      input.toLowerCase().includes("higherify") ||
      input.toLowerCase().includes("higher")
    ) {
      result.overlayMode = "higherify";
      extractPromptFromOverlay("higherify|higher");
    } else if (
      input.toLowerCase().includes("degenify") ||
      input.toLowerCase().includes("degen")
    ) {
      result.overlayMode = "degenify";
      extractPromptFromOverlay("degenify|degen");
    } else if (
      input.toLowerCase().includes("scrollify") ||
      input.toLowerCase().includes("scroll")
    ) {
      result.overlayMode = "scrollify";
      extractPromptFromOverlay("scrollify|scroll");
    } else if (
      input.toLowerCase().includes("lensify") ||
      input.toLowerCase().includes("lens")
    ) {
      result.overlayMode = "lensify";
      extractPromptFromOverlay("lensify|lens");
    } else if (input.toLowerCase().includes("higherise")) {
      result.overlayMode = "higherise";
      extractPromptFromOverlay("higherise");
    } else if (
      input.toLowerCase().includes("dickbuttify") ||
      input.toLowerCase().includes("dickbutt")
    ) {
      result.overlayMode = "dickbuttify";
      extractPromptFromOverlay("dickbuttify|dickbutt");
    } else if (
      input.toLowerCase().includes("nikefy") ||
      input.toLowerCase().includes("nike")
    ) {
      result.overlayMode = "nikefy";
      extractPromptFromOverlay("nikefy|nike");
    } else if (
      input.toLowerCase().includes("nounify") ||
      input.toLowerCase().includes("noun")
    ) {
      result.overlayMode = "nounify";
      extractPromptFromOverlay("nounify|noun");
    } else if (
      input.toLowerCase().includes("baseify") ||
      input.toLowerCase().includes("base")
    ) {
      result.overlayMode = "baseify";
      extractPromptFromOverlay("baseify|base");
    } else if (
      input.toLowerCase().includes("clankerify") ||
      input.toLowerCase().includes("clanker")
    ) {
      result.overlayMode = "clankerify";
      extractPromptFromOverlay("clankerify|clanker");
    } else if (
      input.toLowerCase().includes("mantleify") ||
      input.toLowerCase().includes("mantle")
    ) {
      result.overlayMode = "mantleify";
      extractPromptFromOverlay("mantleify|mantle");
    }
  }

  // If we found text parameters but no action was determined yet,
  // set the action to "overlay" and useParentImage to true
  if (textContent && !result.action) {
    result.action = "overlay";
    result.useParentImage = true;
    logger.info(
      "Detected standalone text command, will apply to parent image",
      {
        textContent,
        useParentImage: true,
      }
    );
  }

  // Before returning the result, log it
  logger.info(
    `Parsed command: action=${result.action}, overlayMode=${
      result.overlayMode || "none"
    }, hasText=${result.text ? "yes" : "no"}`
  );

  return result;
}
