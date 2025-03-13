import { ParsedCommand } from "../agent-types";
import { logger } from "../logger";
import { BaseCommandParser } from "./base-parser";

/**
 * Specialized command parser for the agent frontend
 * Optimized for handling commands from the web UI
 */
export class AgentCommandParser extends BaseCommandParser {
  /**
   * Override the internal parsing method to add agent-specific logic
   */
  protected parseInternal(input: string, result: ParsedCommand): void {
    // Check for structured format first (more common in web UI)
    const hasStructuredFormat = this.checkForStructuredFormat(input);

    if (hasStructuredFormat) {
      // Parse structured format
      this.parseStructuredFormat(input, result);
    } else {
      // Continue with standard parsing
      super.parseInternal(input, result);
    }

    // Special handling for photograph pattern which is common in the web UI
    this.handlePhotographPattern(input, result);

    // Ensure we have a valid overlay mode if action is overlay
    if (result.action === "overlay" && !result.overlayMode) {
      result.overlayMode = "higherify"; // Default for web UI
      logger.info(
        "No overlay mode specified for overlay action, defaulting to higherify"
      );
    }
  }

  /**
   * Check if the command uses a structured format with sections
   */
  private checkForStructuredFormat(input: string): boolean {
    return (
      this.PROMPT_SECTION_PATTERN.test(input) ||
      this.OVERLAY_SECTION_PATTERN.test(input) ||
      this.TEXT_SECTION_PATTERN.test(input) ||
      this.PROMPT_ALT_PATTERN.test(input) ||
      this.OVERLAY_ALT_PATTERN.test(input) ||
      this.TEXT_ALT_PATTERN.test(input) ||
      this.CAPTION_PATTERN.test(input) ||
      this.WOWOW_PATTERN.test(input)
    );
  }

  /**
   * Parse a command in structured format
   */
  private parseStructuredFormat(input: string, result: ParsedCommand): void {
    // Extract sections
    let promptSection = input.match(this.PROMPT_SECTION_PATTERN)?.[1]?.trim();
    let overlaySection = input.match(this.OVERLAY_SECTION_PATTERN)?.[1]?.trim();
    let textSection = input.match(this.TEXT_SECTION_PATTERN)?.[1]?.trim();

    // Check alternative formats if section markers not found
    if (!promptSection && !overlaySection && !textSection) {
      promptSection = input.match(this.PROMPT_ALT_PATTERN)?.[1]?.trim();
      overlaySection = input.match(this.OVERLAY_ALT_PATTERN)?.[1]?.trim();
      textSection = input.match(this.TEXT_ALT_PATTERN)?.[1]?.trim();
    }

    // Check even more alternative formats
    if (!promptSection && !overlaySection && !textSection) {
      promptSection = input.match(this.WOWOW_PATTERN)?.[1]?.trim();
      textSection = input.match(this.CAPTION_PATTERN)?.[1]?.trim();
    }

    // Process prompt section
    if (promptSection) {
      // Extract URL if present
      const urlMatch = promptSection.match(this.URL_PATTERN);
      if (urlMatch) {
        result.baseImageUrl = urlMatch[0];
        // Remove URL from prompt
        promptSection = promptSection.replace(this.URL_PATTERN, "").trim();
      }

      // Set the prompt
      result.prompt = this.cleanPrompt(promptSection);
    }

    // Process overlay section
    if (overlaySection) {
      // Extract overlay mode
      for (const pattern of this.OVERLAY_PATTERNS) {
        const match = overlaySection.match(pattern);
        if (match && match[1]) {
          result.overlayMode = match[1].toLowerCase() as any;
          result.action = "overlay";
          break;
        }
      }

      // If no overlay mode was found but the section exists, check for keywords
      if (!result.overlayMode) {
        for (const keyword of this.overlayKeywords) {
          if (overlaySection.toLowerCase().includes(keyword)) {
            result.overlayMode = keyword as any;
            result.action = "overlay";
            break;
          }
        }
      }

      // Extract controls
      this.extractControlsFromSection(overlaySection, result);
    }

    // Process text section
    if (textSection) {
      this.extractTextFromSection(textSection, result);
    }
  }

  /**
   * Extract controls from an overlay section
   */
  private extractControlsFromSection(
    section: string,
    result: ParsedCommand
  ): void {
    // Extract position
    for (const pattern of this.POSITION_PATTERNS) {
      const match = section.match(pattern);
      if (match && match[1] && match[2]) {
        if (!result.controls) result.controls = {};
        result.controls.x = parseFloat(match[1]);
        result.controls.y = parseFloat(match[2]);
        break;
      }
    }

    // Extract scale
    for (const pattern of this.SCALE_PATTERNS) {
      const match = section.match(pattern);
      if (match && match[1]) {
        if (!result.controls) result.controls = {};
        result.controls.scale = parseFloat(match[1]);
        break;
      }
    }

    // Extract color
    for (const pattern of this.COLOR_PATTERNS) {
      const match = section.match(pattern);
      if (match && match[1]) {
        if (!result.controls) result.controls = {};
        result.controls.overlayColor = match[1].toLowerCase();
        break;
      }
    }

    // Extract opacity
    for (const pattern of this.OPACITY_PATTERNS) {
      const match = section.match(pattern);
      if (match && match[1]) {
        if (!result.controls) result.controls = {};
        result.controls.overlayAlpha = parseFloat(match[1]);
        break;
      }
    }
  }

  /**
   * Extract text parameters from a text section
   */
  private extractTextFromSection(section: string, result: ParsedCommand): void {
    // Split by commas to extract different parts
    const parts = section.split(",");

    if (parts.length > 0) {
      // First part is the text content
      if (!result.text) result.text = { content: parts[0].trim() };
      else result.text.content = parts[0].trim();

      // Process remaining parts for text properties
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].trim().toLowerCase();

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
  }

  /**
   * Special handling for the "photograph of..." pattern which is common in the web UI
   */
  private handlePhotographPattern(input: string, result: ParsedCommand): void {
    // If we already have a prompt, skip this
    if (result.prompt && result.prompt.length > 0) {
      return;
    }

    // Check for "a photograph of..." pattern
    const photoMatch = input.match(/a\s+photograph\s+of\s+(.+)/i);
    if (photoMatch && photoMatch[1]) {
      const photoDescription = photoMatch[1];

      // Extract scale if present
      const scaleMatch = photoDescription.match(
        /(.+?)(?:\.\s*scale\s+(?:to|by)?\s*(-?\d+\.?\d*))/i
      );

      if (scaleMatch) {
        // We have both a description and scale
        result.prompt = scaleMatch[1].trim();

        if (scaleMatch[2]) {
          if (!result.controls) result.controls = {};
          result.controls.scale = parseFloat(scaleMatch[2]);
          logger.info(
            `Extracted scale from photo description: ${result.controls.scale}`
          );
        }
      } else {
        // Just the photo description
        result.prompt = photoDescription.trim();
      }

      logger.info(`Extracted photo description: "${result.prompt}"`);
    }
  }

  /**
   * Override the clean prompt method to be more thorough for web UI
   * Web UI commands tend to be more detailed and structured
   */
  protected cleanPrompt(text: string): string {
    // First try the standard cleaning
    let cleanedText = super.cleanPrompt(text);

    // Additional cleaning for web UI specific patterns
    cleanedText = cleanedText
      .replace(/\b(generate|create|make)\b/gi, "")
      .replace(/\b(an?|the)\s+(image|picture|photo)\s+(of|with)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    return cleanedText;
  }
}
