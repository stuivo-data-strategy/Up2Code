/**
 * Core Logger Module
 * Structured, levelled logging for Up2Code.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, unknown>;
}

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL: LogLevel =
    (process.env.LOG_LEVEL as LogLevel | undefined) ?? 'info';

function shouldLog(level: LogLevel): boolean {
    return LEVELS[level] >= LEVELS[MIN_LEVEL];
}

function format(entry: LogEntry): string {
    return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (!shouldLog(level)) return;
    const entry: LogEntry = { level, message, timestamp: new Date().toISOString(), context };
    const formatted = format(entry);
    if (level === 'error') console.error(formatted);
    else if (level === 'warn') console.warn(formatted);
    else console.log(formatted);
}

export const logger = {
    debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
    info: (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
    warn: (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
    error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
};
