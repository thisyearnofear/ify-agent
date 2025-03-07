import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getAllowedUsers,
  setAllowedUsers,
} from "@/lib/farcaster-allowed-users";

// Mark as dynamic to prevent static optimization
export const dynamic = "force-dynamic";

// GET endpoint to retrieve allowed users
export async function GET(request: Request) {
  try {
    // Simple API key check for admin access
    const url = new URL(request.url);
    const apiKey = url.searchParams.get("apiKey");

    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Set a timeout for the operation
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Operation timed out"));
      }, 5000); // 5 second timeout
    });

    // Race the operation against the timeout
    const allowedUsers = await Promise.race([
      getAllowedUsers(),
      timeoutPromise,
    ]);

    return NextResponse.json({ allowedUsers });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Error in GET /api/farcaster/allowed-users", {
      error: errorMessage,
    });

    // Return a more specific error message
    if (errorMessage.includes("timed out")) {
      return NextResponse.json(
        {
          error:
            "The request timed out. This may be due to Redis connection issues.",
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST endpoint to update allowed users
export async function POST(request: Request) {
  try {
    // Simple API key check for admin access
    const url = new URL(request.url);
    const apiKey = url.searchParams.get("apiKey");

    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.users || !Array.isArray(body.users)) {
      return NextResponse.json(
        { error: "Invalid request body. Expected { users: number[] }" },
        { status: 400 }
      );
    }

    // Validate that all users are numbers
    const users = body.users;
    if (!users.every((user: unknown) => typeof user === "number")) {
      return NextResponse.json(
        { error: "Invalid user IDs. All users must be numbers" },
        { status: 400 }
      );
    }

    // Set a timeout for the operation
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Operation timed out"));
      }, 5000); // 5 second timeout
    });

    // Race the operation against the timeout
    const success = await Promise.race([
      setAllowedUsers(users),
      timeoutPromise,
    ]);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update allowed users" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, users });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Error in POST /api/farcaster/allowed-users", {
      error: errorMessage,
    });

    // Return a more specific error message
    if (errorMessage.includes("timed out")) {
      return NextResponse.json(
        {
          error:
            "The request timed out. This may be due to Redis connection issues.",
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
