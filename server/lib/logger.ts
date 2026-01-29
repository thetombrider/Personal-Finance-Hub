type LogLevel = "debug" | "info" | "warn" | "error";

const levelPriority: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function createLogger(source: string) {
    const minLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
    const shouldLog = (level: LogLevel) => levelPriority[level] >= levelPriority[minLevel];
    const format = (level: LogLevel, msg: string) =>
        `${new Date().toISOString()} [${source}] ${level.toUpperCase()}: ${msg}`;

    return {
        debug: (msg: string, meta?: object) => shouldLog("debug") && console.log(format("debug", msg), meta ?? ""),
        info: (msg: string, meta?: object) => shouldLog("info") && console.log(format("info", msg), meta ?? ""),
        warn: (msg: string, meta?: object) => shouldLog("warn") && console.warn(format("warn", msg), meta ?? ""),
        error: (msg: string, err?: unknown, meta?: object) => shouldLog("error") && console.error(format("error", msg), err, meta ?? ""),
    };
}

export const logger = {
    gocardless: createLogger("GoCardless"),
    reconciliation: createLogger("Reconciliation"),
    scheduler: createLogger("Scheduler"),
    webhook: createLogger("Webhook"),
    api: createLogger("API"),
    auth: createLogger("Auth"),
    db: createLogger("Database"),
    stock: createLogger("StockAPI"),
    openai: createLogger("OpenAI"),
    transfers: createLogger("Transfers"),
};
export { createLogger };
