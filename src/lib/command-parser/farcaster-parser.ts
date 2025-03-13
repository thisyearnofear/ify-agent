import { ParsedCommand } from "../agent-types";
import { logger } from "../logger";
import { BaseCommandParser } from "./base-parser";

/**
 * Specialized command parser for Farcaster bot
 * Optimized for handling commands from Farcaster mentions and replies
 */
export class FarcasterCommandParser extends BaseCommandParser {
  /**
   * Override the internal parsing method to add Farcaster-specific logic
   */
  protected parseInternal(input: string, result: ParsedCommand): void {
    // First check if this is an explicit generation command
    const isExplicitGeneration = this.checkForExplicitGeneration(input);

    if (isExplicitGeneration) {
      result.action = "generate";
      // Extract prompt from generation command
      for (const pattern of this.GENERATE_PATTERNS) {
        const match = input.match(pattern);
        if (match && match[1]) {
          result.prompt = this.cleanPrompt(match[1]);
          logger.info("Extracted prompt from explicit generation command", {
            prompt: result.prompt,
          });
          break;
        }
      }

      // If we couldn't extract a prompt using patterns, use the whole input
      // after removing generation keywords
      if (!result.prompt || result.prompt.length < 3) {
        result.prompt = input
          .replace(/^(generate|create|make|draw)\s+/i, "")
          .replace(/^(a|an)\s+(image|picture|photo)\s+of\s+/i, "")
          .trim();

        logger.info("Using fallback prompt extraction for generation command", {
          prompt: result.prompt,
        });
      }
    }

    // Then check if this is a reply to a cast with an image
    const hasParentImageReference = this.checkForParentImageReference(input);

    if (hasParentImageReference && !isExplicitGeneration) {
      result.useParentImage = true;
      result.action = "overlay";
      logger.info("Detected parent image reference in Farcaster command");
    }

    // Continue with standard parsing
    super.parseInternal(input, result);

    // If we have a parent image reference but no overlay mode was detected,
    // default to degenify as a fallback
    if (result.useParentImage && !result.overlayMode) {
      result.overlayMode = "degenify";
      logger.info(
        "No overlay mode specified for parent image, defaulting to degenify"
      );
    }

    // Special handling for Farcaster commands that are very short
    // If the command is just an overlay keyword, assume it's meant for a parent image
    if (
      this.isJustOverlayKeyword(input) &&
      !result.useParentImage &&
      !isExplicitGeneration
    ) {
      result.useParentImage = true;
      result.action = "overlay";
      logger.info(
        "Command is just an overlay keyword, assuming it's for a parent image"
      );
    }

    // If we have an overlay mode but no parent image reference and no explicit generation,
    // we need to decide if this is a generation or overlay command
    if (
      result.overlayMode &&
      !result.useParentImage &&
      !isExplicitGeneration &&
      result.action !== "generate"
    ) {
      // Check if there's a descriptive prompt
      const hasDescriptivePrompt = result.prompt && result.prompt.length > 10;

      if (hasDescriptivePrompt) {
        // If there's a descriptive prompt, this is likely a generation command
        result.action = "generate";
        logger.info(
          "Detected generation command with overlay from descriptive prompt",
          {
            overlayMode: result.overlayMode,
            prompt: result.prompt,
          }
        );
      } else {
        // If there's no descriptive prompt, this is likely an overlay command
        // that will need a parent image
        result.useParentImage = true;
        result.action = "overlay";
        logger.info(
          "Command has overlay mode but no descriptive prompt, assuming parent image",
          {
            overlayMode: result.overlayMode,
          }
        );
      }
    }
  }

  /**
   * Check if the command is an explicit generation command
   */
  private checkForExplicitGeneration(input: string): boolean {
    const lowerInput = input.toLowerCase().trim();

    // Check for explicit generation commands
    if (
      lowerInput.startsWith("generate") ||
      lowerInput.startsWith("create") ||
      lowerInput.startsWith("make") ||
      lowerInput.startsWith("draw") ||
      /^(a|an)\s+(image|picture|photo)\s+of\s+/i.test(lowerInput)
    ) {
      return true;
    }

    // Check for generation patterns
    for (const pattern of this.GENERATE_PATTERNS) {
      if (pattern.test(lowerInput)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if the command contains a reference to a parent image
   */
  private checkForParentImageReference(input: string): boolean {
    const lowerInput = input.toLowerCase().trim();

    // Check for explicit parent image references
    for (const pattern of this.PARENT_IMAGE_PATTERNS) {
      if (pattern.test(lowerInput)) {
        return true;
      }
    }

    // Check for implicit parent image references (very short commands with overlay keywords)
    if (this.isJustOverlayKeyword(input)) {
      return true;
    }

    return false;
  }

  /**
   * Check if the command is just an overlay keyword with minimal additional text
   */
  private isJustOverlayKeyword(input: string): boolean {
    const lowerInput = input.toLowerCase().trim();

    // Check if the command is just an overlay keyword
    for (const keyword of this.overlayKeywords) {
      if (
        lowerInput === keyword ||
        lowerInput === `${keyword}.` ||
        lowerInput === `${keyword}!` ||
        lowerInput === `${keyword} this` ||
        lowerInput === `${keyword} it`
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Override the clean prompt method to be more conservative for Farcaster
   * Farcaster commands tend to be shorter and more direct
   */
  protected cleanPrompt(text: string): string {
    // First try the standard cleaning
    let cleanedText = super.cleanPrompt(text);

    // If the result is too short, try a more conservative approach
    if (cleanedText.length < 5 && text.length > 5) {
      // Only remove the most obvious control parameters
      cleanedText = text
        .replace(/scale\s+(?:to|by)?\s*-?\d+\.?\d*/gi, "")
        .replace(/position\s+(?:at|to)?\s*-?\d+\.?\d*[,\s]+-?\d+\.?\d*/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    return cleanedText;
  }
}
