import { NextResponse } from "next/server";
import Redis from "ioredis";
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

    // Try to initialize Redis client directly with Upstash-specific options
    let redisStatus = "Not initialized";
    let pingResult = "Not attempted";
    let testWriteResult = "Not attempted";
    let testReadResult = "Not attempted";
    let errorDetails = "";

    try {
      // Check if it's an Upstash URL
      if (!redisUrl.includes("upstash.io")) {
        return NextResponse.json(
          {
            error: "This test is specifically for Upstash Redis URLs",
            redisUrl: maskedUrl,
          },
          { status: 400 }
        );
      }

      // Parse the URL
      const url = new URL(redisUrl);

      // Extract components
      const host = url.hostname;
      const port = url.port || "6379";
      const username = url.username || "default";
      const password = url.password;

      // Create a Redis client with explicit host, port, username, password
      const redis = new Redis({
        host,
        port: parseInt(port, 10),
        username,
        password,
        connectTimeout: 10000,
        maxRetriesPerRequest: 5,
        enableOfflineQueue: true,
        tls: {}, // Enable TLS for Upstash
        enableReadyCheck: true,
        maxLoadingRetryTime: 5000,
        retryStrategy(times: number) {
          const delay = Math.min(times * 100, 3000);
          return delay;
        },
      });

      // Set up event handlers
      redis.on("error", (err) => {
        errorDetails = `Redis error: ${err.message}`;
        logger.error("Direct Redis client error", {
          error: err.message,
          stack: err.stack,
        });
      });

      // Wait for ready state or timeout
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

      // Only proceed with tests if we're ready
      if (redisStatus === "ready") {
        // Try a simple PING command
        pingResult = await redis.ping();

        // Try to write a test value
        const testKey = `upstash-test-${Date.now()}`;
        testWriteResult = await redis.set(
          testKey,
          "upstash-test-value",
          "EX",
          60
        );

        // Try to read the test value back
        testReadResult = await redis.get(testKey);

        logger.info("Upstash Redis test completed", {
          status: redisStatus,
          ping: pingResult,
          write: testWriteResult,
          read: testReadResult,
        });
      } else {
        logger.warn("Upstash Redis not ready for tests", {
          status: redisStatus,
        });
      }

      // Close the connection
      await redis.quit();
    } catch (error) {
      errorDetails = error instanceof Error ? error.message : String(error);
      logger.error("Upstash Redis test failed", { error: errorDetails });
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
      errorDetails,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to test Upstash Redis", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to test Upstash Redis connection" },
      { status: 500 }
    );
  }
}
