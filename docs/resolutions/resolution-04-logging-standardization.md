# Resolution Guide: Logging Standardization

**Priority:** Medium | **Effort:** Medium | **Impact:** Consistent logging, easier debugging

---

## Problem Summary

- **24 `console.log`** and **70+ `console.error`** calls with inconsistent patterns
- No log levels, no structured logging, inconsistent prefixes

---

## Resolution Steps

### Step 1: Create Logger Utility

**File:** `server/lib/logger.ts`

```typescript
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
};
export { createLogger };
```

### Step 2: Update Files

| File | Logger |
|------|--------|
| `server/services/gocardless.ts` | `logger.gocardless` |
| `server/services/reconciliation.ts` | `logger.reconciliation` |
| `server/routes/reports.ts` | `logger.api` |
| `server/seed.ts` | `createLogger("Seed")` |

**Replace pattern:**
```typescript
// Before
console.log("[GoCardless] Token refreshed");
// After
logger.gocardless.info("Token refreshed");
```

---

## Verification

```bash
grep -rn "console\." server/ --include="*.ts" | grep -v "logger.ts"
npm run check
```

## Checklist
- [ ] Created `server/lib/logger.ts`
- [ ] Updated all console calls to use logger
- [ ] Tested with `LOG_LEVEL=debug`
