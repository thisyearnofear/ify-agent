import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

let totalRequests = 0;
let failedRequests = 0;
let lastReset = Date.now();

// Reset counters every hour
setInterval(() => {
  totalRequests = 0;
  failedRequests = 0;
  lastReset = Date.now();
}, 3600000);

export async function GET() {
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

// Export functions to update metrics
export function incrementTotalRequests() {
  totalRequests++;
}

export function incrementFailedRequests() {
  failedRequests++;
}
