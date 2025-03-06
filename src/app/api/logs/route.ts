import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "100");
  const level = searchParams.get("level") as
    | "info"
    | "warn"
    | "error"
    | undefined;

  // Basic auth for production
  if (process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const logs = logger.getLogs(limit, level);
  return NextResponse.json({ logs });
}
