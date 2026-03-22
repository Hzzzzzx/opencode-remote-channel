/**
 * 简单日志工具
 */

type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private prefix = "[remote]";

  private log(level: LogLevel, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    console[level](`${timestamp} ${this.prefix}`, ...args);
  }

  debug(...args: unknown[]): void {
    this.log("debug", ...args);
  }

  info(...args: unknown[]): void {
    this.log("info", ...args);
  }

  warn(...args: unknown[]): void {
    this.log("warn", ...args);
  }

  error(...args: unknown[]): void {
    this.log("error", ...args);
  }

  withAccount(accountId: string): Logger {
    const child = new Logger();
    child.prefix = `[remote:${accountId}]`;
    return child;
  }
}

export const logger = new Logger();
