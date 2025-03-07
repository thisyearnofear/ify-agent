import { NextResponse } from "next/server";
import { getRedisClient, executeWithTimeout } from "@/lib/redis";
import { logger } from "@/lib/logger";

// Mark the route as dynamic to prevent static optimization
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    // Get the Redis URL from environment (but mask the password)
    const redisUrl = process.env.REDIS_URL || "";
    const maskedUrl = redisUrl.replace(
      /(redis:\/\/[^:]+:)([^@]+)(@.+)/,
      "$1****$3"
    );

    // Parse the URL components for debugging
    let urlComponents = {
      protocol: "",
      username: "",
      passwordLength: 0,
      host: "",
      port: "",
      error: "",
    };

    try {
      // Parse the URL to check if it's valid
      if (redisUrl) {
        const url = new URL(redisUrl);
        urlComponents = {
          protocol: url.protocol,
          username: url.username,
          passwordLength: url.password ? url.password.length : 0,
          host: url.hostname,
          port: url.port,
          error: "",
        };
      } else {
        urlComponents.error = "REDIS_URL is not set";
      }
    } catch (error) {
      urlComponents.error = `Invalid URL format: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }

    // Try to initialize Redis client
    let redisStatus = "Not initialized";
    let pingResult = "Not attempted";
    let testWriteResult = "Not attempted";
    let testReadResult = "Not attempted";

    try {
      const redis = getRedisClient();
      redisStatus = redis.status || "Unknown status";

      // Wait for ready state or timeout
      if (redisStatus !== "ready") {
        redisStatus = await new Promise<string>((resolve) => {
          const timeout = setTimeout(() => {
            resolve("Connection timeout");
          }, 5000);

          redis.on("ready", () => {
            clearTimeout(timeout);
            resolve("ready");
          });

          redis.on("error", (err) => {
            clearTimeout(timeout);
            resolve(`Error: ${err.message}`);
          });
        });
      }

      // Only proceed with tests if we're ready
      if (redisStatus === "ready") {
        // Try a simple PING command
        pingResult = await executeWithTimeout(
          () => redis.ping(),
          5000,
          "Timeout"
        );

        // Try to write a test value
        const testKey = `debug-test-${Date.now()}`;
        testWriteResult = await executeWithTimeout(
          () => redis.set(testKey, "test-value", "EX", 60),
          5000,
          "Timeout"
        );

        // Try to read the test value back
        testReadResult = await executeWithTimeout(
          () => redis.get(testKey),
          5000,
          "Timeout"
        );

        logger.info("Redis debug test successful", {
          status: redisStatus,
          ping: pingResult,
          write: testWriteResult,
          read: testReadResult,
        });
      } else {
        logger.warn("Redis not ready for tests", { status: redisStatus });
      }
    } catch (error) {
      logger.error("Redis debug test failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Return the debug information
    return NextResponse.json({
      environment: process.env.NODE_ENV,
      redisUrl: maskedUrl,
      urlComponents,
      redisStatus,
      pingResult,
      testWriteResult,
      testReadResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to debug Redis", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to debug Redis connection" },
      { status: 500 }
    );
  }
}
