import { NextResponse } from "next/server";
import { parseCommand } from "@/lib/command-parser/index";

// Mark the route as dynamic to prevent static optimization
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { command } = await request.json();

    if (!command) {
      return NextResponse.json(
        { error: "No command provided" },
        { status: 400 }
      );
    }

    // Use the web interface parser for the agent frontend
    const parsedCommand = parseCommand(command, "web");
    return NextResponse.json(parsedCommand);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse command" },
      { status: 500 }
    );
  }
}
