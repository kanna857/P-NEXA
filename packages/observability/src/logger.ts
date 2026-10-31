export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LogLevelsOrder: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
};

export interface LogContext {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  component?: string;
  [key: string]: unknown;
}

export class Logger {
  private level: LogLevel;
  private defaultContext: LogContext;

  constructor(level: LogLevel = 'info', defaultContext: LogContext = {}) {
    this.level = level;
    this.defaultContext = defaultContext;
  }

  private shouldLog(level: LogLevel): boolean {
    return LogLevelsOrder[level] >= LogLevelsOrder[this.level];
  }

  private format(level: LogLevel, message: string, context?: LogContext): string {
    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...this.defaultContext,
      ...context
    };
    return JSON.stringify(entry);
  }

  public child(extraContext: LogContext): Logger {
    return new Logger(this.level, { ...this.defaultContext, ...extraContext });
  }

  public trace(message: string, context?: LogContext): void {
    if (this.shouldLog('trace')) console.log(this.format('trace', message, context));
  }

  public debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) console.debug(this.format('debug', message, context));
  }

  public info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) console.info(this.format('info', message, context));
  }

  public warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) console.warn(this.format('warn', message, context));
  }

  public error(message: string, error?: unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errContext =
        error instanceof Error
          ? { ...context, error: { message: error.message, stack: error.stack } }
          : { ...context, error };
      console.error(this.format('error', message, errContext));
    }
  }

  public fatal(message: string, error?: unknown, context?: LogContext): void {
    if (this.shouldLog('fatal')) {
      const errContext =
        error instanceof Error
          ? { ...context, error: { message: error.message, stack: error.stack } }
          : { ...context, error };
      console.error(this.format('fatal', message, errContext));
    }
  }
}

export const rootLogger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) || 'info',
  { service: 'nexus-omega-x' }
);

