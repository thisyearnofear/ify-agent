import { BaseCommandParser } from "./base-parser";
import { FarcasterCommandParser } from "./farcaster-parser";
import { AgentCommandParser } from "./agent-parser";
import { CommandParserFactory, InterfaceType } from "./parser-factory";
import { ParsedCommand } from "../agent-types";

/**
 * Parse a command string into a structured ParsedCommand object
 * This is the main function that should be called by clients
 */
export function parseCommand(
  input: string,
  interfaceType: InterfaceType = "default"
): ParsedCommand {
  const parser = CommandParserFactory.getParser(interfaceType);
  return parser.parse(input);
}

export {
  BaseCommandParser,
  FarcasterCommandParser,
  AgentCommandParser,
  CommandParserFactory,
};

export type { InterfaceType };
