import { logger } from "./logger";

let totalRequests = 0;
let failedRequests = 0;
let lastReset = Date.now();

// Reset counters every hour
setInterval(() => {
  const oldTotal = totalRequests;
  const oldFailed = failedRequests;

  totalRequests = 0;
  failedRequests = 0;
  lastReset = Date.now();

  logger.info("Metrics counters reset", {
    previousTotal: oldTotal,
    previousFailed: oldFailed,
    resetTimestamp: lastReset,
  });
}, 3600000);

export function incrementTotalRequests() {
  totalRequests++;
  logger.info("Total requests incremented", { totalRequests });
}

export function incrementFailedRequests() {
  failedRequests++;
  logger.info("Failed requests incremented", { failedRequests });
}

export function getMetrics() {
  return {
    totalRequests,
    failedRequests,
    lastReset,
  };
}
