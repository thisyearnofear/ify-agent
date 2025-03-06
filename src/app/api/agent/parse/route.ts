import { NextResponse } from "next/server";
import { parseCommand } from "@/lib/command-parser";

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

    const parsedCommand = parseCommand(command);
    return NextResponse.json(parsedCommand);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse command" },
      { status: 500 }
    );
  }
}
