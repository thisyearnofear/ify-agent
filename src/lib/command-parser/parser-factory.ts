import { BaseCommandParser } from "./base-parser";
import { AgentCommandParser } from "./agent-parser";
import { FarcasterCommandParser } from "./farcaster-parser";
import { logger } from "../logger";

/**
 * Interface type for selecting the appropriate parser
 */
export type InterfaceType =
  | "web"
  | "farcaster"
  | "frame"
  | "telegram"
  | "default";

/**
 * Factory class for command parsers
 * Creates and caches the appropriate parser for each interface type
 */
export class CommandParserFactory {
  private static parsers: Record<InterfaceType, BaseCommandParser> =
    {} as Record<InterfaceType, BaseCommandParser>;

  /**
   * Get the appropriate parser for the given interface type
   */
  public static getParser(interfaceType: InterfaceType): BaseCommandParser {
    // Use cached instance if available
    if (this.parsers[interfaceType]) {
      return this.parsers[interfaceType];
    }

    // Create a new parser based on the interface type
    let parser: BaseCommandParser;
    switch (interfaceType) {
      case "farcaster":
        parser = new FarcasterCommandParser();
        logger.info("Created FarcasterCommandParser");
        break;
      case "frame":
        // Frames use the same parser as web for now
        parser = new AgentCommandParser();
        logger.info("Created AgentCommandParser for frame");
        break;
      case "telegram":
        // Telegram uses the same parser as web for now
        parser = new AgentCommandParser();
        logger.info("Created AgentCommandParser for telegram");
        break;
      case "web":
      case "default":
      default:
        parser = new AgentCommandParser();
        logger.info("Created AgentCommandParser");
        break;
    }

    // Cache the parser for future use
    this.parsers[interfaceType] = parser;
    return parser;
  }
}
