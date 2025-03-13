import { BaseCommandParser } from "./base-parser";
import { FarcasterCommandParser } from "./farcaster-parser";
import { AgentCommandParser } from "./agent-parser";

/**
 * Interface type for selecting the appropriate parser
 */
export type InterfaceType = "web" | "farcaster" | "frame" | "default";

/**
 * Factory class for creating command parsers
 * This allows clients to get the appropriate parser for their interface
 */
export class CommandParserFactory {
  // Singleton instances of parsers
  private static webParser: AgentCommandParser;
  private static farcasterParser: FarcasterCommandParser;
  private static defaultParser: BaseCommandParser;

  /**
   * Get a parser instance for the specified interface
   */
  public static getParser(interfaceType: InterfaceType): BaseCommandParser {
    switch (interfaceType) {
      case "web":
        if (!this.webParser) {
          this.webParser = new AgentCommandParser();
        }
        return this.webParser;

      case "farcaster":
        if (!this.farcasterParser) {
          this.farcasterParser = new FarcasterCommandParser();
        }
        return this.farcasterParser;

      case "frame":
        // For now, frames use the same parser as web
        if (!this.webParser) {
          this.webParser = new AgentCommandParser();
        }
        return this.webParser;

      case "default":
      default:
        if (!this.defaultParser) {
          this.defaultParser = new BaseCommandParser();
        }
        return this.defaultParser;
    }
  }
}
