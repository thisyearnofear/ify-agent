type LogLevel = "info" | "warn" | "error";

interface LogMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: LogMetadata;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private addLog(level: LogLevel, message: string, data?: LogMetadata) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };

    this.logs.unshift(entry);

    // Trim logs if they exceed maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Also log to console in development
    if (process.env.NODE_ENV === "development") {
      console[level](message, data || "");
    }
  }

  info(message: string, data?: LogMetadata) {
    this.addLog("info", message, data);
  }

  warn(message: string, data?: LogMetadata) {
    this.addLog("warn", message, data);
  }

  error(message: string, data?: LogMetadata) {
    this.addLog("error", message, data);
  }

  getLogs(limit = 100, level?: LogLevel): LogEntry[] {
    return this.logs
      .filter((log) => !level || log.level === level)
      .slice(0, limit);
  }
}

export const logger = Logger.getInstance();
