import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getMetrics } from "@/lib/metrics";

export async function GET() {
  const { totalRequests, failedRequests, lastReset } = getMetrics();

  logger.info("Metrics requested", {
    totalRequests,
    failedRequests,
    lastReset,
  });

  const metrics = [
    "# HELP api_requests_total Total number of API requests",
    "# TYPE api_requests_total counter",
    `api_requests_total ${totalRequests}`,
    "# HELP api_requests_failed_total Total number of failed API requests",
    "# TYPE api_requests_failed_total counter",
    `api_requests_failed_total ${failedRequests}`,
    "# HELP api_last_reset_timestamp Last time the counters were reset",
    "# TYPE api_last_reset_timestamp gauge",
    `api_last_reset_timestamp ${lastReset}`,
  ].join("\n");

  return new NextResponse(metrics, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
