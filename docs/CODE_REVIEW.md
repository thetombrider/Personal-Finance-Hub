# Personal Finance Hub - Code Review & Refactoring Guide

**Last Updated:** January 27, 2026  
**Purpose:** Technical debt documentation and refactoring guidance for AI and human developers

---

## Overview

This document identifies structural issues, code duplications, and refactoring opportunities in the Personal Finance Hub codebase. It serves as a comprehensive reference for future development work to ensure consistent patterns and eliminate technical debt.

---

## Table of Contents

3. [Logic Duplication](#3-logic-duplication)
4. [Logging Standardization](#4-logging-standardization)
5. [Error Handling](#5-error-handling)
6. [Date Formatting](#6-date-formatting)
7. [Toast Patterns](#7-toast-patterns)
8. [Type Safety Issues](#8-type-safety-issues)
9. [Implementation Examples](#9-implementation-examples)
10. [Refactoring Checklist](#10-refactoring-checklist)

---

## 3. Logic Duplication

### Transfer Submit Logic (~35 lines)

**Duplicated in:** `Dashboard.tsx:103-137`, `Transactions.tsx:153-187`

**Pattern:**
1. Find transfer category by name ("trasferimenti" or "transfer")
2. Create category if not found
3. Show error if creation fails
4. Call `addTransfer` with formatted data
5. Close dialog

**Solution:** Create `useTransferSubmit.ts` hook (see Implementation Examples below)

### Query Invalidation Patterns

**Issue:** Inconsistent invalidation after mutations

```typescript
// Some places use specific keys
queryClient.invalidateQueries({ queryKey: ['budget', currentYear] });

// Others use broad keys
queryClient.invalidateQueries({ queryKey: ['budget'] });

// Some do multiple invalidations manually
queryClient.invalidateQueries({ queryKey: ["accounts"] });
queryClient.invalidateQueries({ queryKey: ["transactions"] });
```

**Solution:** Create `lib/queryInvalidation.ts` with helper functions

---

## 4. Logging Standardization

### Current State

- **24 `console.log` calls** across server files
- **70+ `console.error` calls** with inconsistent patterns
- No log levels (debug vs info vs warn vs error)
- No structured logging

### Issues Found

```typescript
// Inconsistent prefix patterns
console.log("[GoCardless] Token refreshed successfully");
console.log(`[scheduler] Found ${users.length} users`);
console.log("Seeding database...");  // No prefix

// Inconsistent error logging
console.error("[GoCardless] Failed to refresh token:", error);
console.error("Stock API error:", error);
console.error(error);  // Just the error object
```

### Solution

Create `server/lib/logger.ts`:

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logger = {
  gocardless: createLogger('GoCardless'),
  reconciliation: createLogger('Reconciliation'),
  scheduler: createLogger('Scheduler'),
  webhook: createLogger('Webhook'),
  api: createLogger('API'),
};
```

**Files to update:**
- `server/services/gocardless.ts` - 15+ log calls
- `server/services/reconciliation.ts` - 4 log calls
- `server/routes/reports.ts` - 6 log calls
- All route files with `console.error`

---

## 5. Error Handling

### Client-Side Issues

**Inconsistent catch patterns:**

| Pattern | Files |
|---------|-------|
| `} catch (error) {` | Most files |
| `} catch (error: any) {` | Settings.tsx, EmailReports.tsx, bank-callback.tsx |
| `} catch (e) {` | ImportTransactions.tsx |

**Solution:** Create `lib/errors.ts`:

```typescript
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}
```

### Server-Side Issues

**Inconsistent response formats:**

```typescript
// Pattern 1 (most common)
res.status(500).json({ error: "Failed to fetch transactions" });

// Pattern 2 (global error handler)
res.status(status).json({ message });

// Pattern 3 (Zod validation)
res.status(400).json({ error: error.errors });
```

**Solution:** Create `server/lib/responses.ts`:

```typescript
export function errorResponse(res, status, message, details?) { ... }
export function validationError(res, errors) { ... }
export function notFoundError(res, resource) { ... }
```

---

## 6. Date Formatting

### Current Formats Used

| Format | Usage |
|--------|-------|
| `"dd/MM/yyyy"` | Most tables and lists |
| `"MMM d, yyyy"` | TransactionsTable |
| `"dd MMM yyyy"` | ManageAccounts |
| `"dd MMMM yyyy"` | PlannedTransactionsTable |
| `"yyyy-MM-dd"` | Exports, API calls |
| `"dd/MM/yyyy HH:mm:ss"` | Webhook logs |

**Solution:** Create `lib/dateFormatters.ts`:

```typescript
export const dateFormats = {
  short: "dd/MM/yyyy",
  medium: "MMM d, yyyy",
  long: "dd MMMM yyyy",
  dateTime: "dd/MM/yyyy HH:mm",
  iso: "yyyy-MM-dd",
  isoDateTime: "yyyy-MM-dd'T'HH:mm:ss",
};

export function formatDate(date, formatKey) { ... }
export function formatForApi(date) { ... }
export function formatForDisplay(date) { ... }
```

---

## 7. Toast Patterns

### Current Issues

- **90+ toast calls** across the application
- Inconsistent property order (`variant` first vs `title` first)
- Different title conventions ("Error" vs "Failed to..." vs action-based)

**Example inconsistencies:**

```typescript
toast({ title: "Webhook deleted" });
toast({ title: "Error", description: error.message, variant: "destructive" });
toast({ variant: "destructive", title: "Failed to link" });
```

**Solution:** Create `lib/toastHelpers.ts`:

```typescript
export const showSuccess = (toast, title, description?) => { ... }
export const showError = (toast, title, description?) => { ... }
export const toastPatterns = {
  created: (toast, resource) => showSuccess(toast, `${resource} created`),
  updated: (toast, resource) => showSuccess(toast, `${resource} updated`),
  deleted: (toast, resource) => showSuccess(toast, `${resource} deleted`),
};
```

---

## 8. Type Safety Issues

### `any[]` Usage (25+ occurrences)

| File | Line | Fix |
|------|------|-----|
| `Budget.tsx` | 27 | `categories: Category[]` |
| `ImportTransactions.tsx` | 30-31 | Create `CsvRow` interface |
| `bank-callback.tsx` | 17 | Create `BankAccount` interface |
| `ManageAccounts.tsx` | 57 | Use proper connection type |
| All dashboard charts | Props | `data: ChartDataPoint[]` |

**Action:** Create proper interfaces in `@shared/schema` or component-specific type files.

### Chart Component Props

All chart components use `data: any[]`:
- `NetWorthEvolutionChart.tsx`
- `SpendingBreakdownChart.tsx`
- `WealthDistributionChart.tsx`
- `CashFlowChart.tsx`
- `BudgetComparisonChart.tsx`
- `CategoryTrendChart.tsx`
- `SankeyChart.tsx`
- `NetWorthProjectionChart.tsx`

**Solution:** Define chart-specific data interfaces:

```typescript
interface ChartDataPoint {
  label: string;
  value: number;
  [key: string]: unknown;
}

interface TimeSeriesDataPoint {
  date: string;
  value: number;
}
```

---

## 9. Implementation Examples

### usePendingStagingCount.ts

```typescript
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function usePendingStagingCount() {
  return useQuery({
    queryKey: ["/api/transactions/staging", "count"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/transactions/staging?status=pending");
      const data = await res.json();
      return Array.isArray(data) ? data.length : 0;
    },
  });
}
```

### useBudgetData.ts

```typescript
import { useQuery } from "@tanstack/react-query";

interface YearlyBudgetData {
  categories: Category[];
  budgetData: Record<number, Record<number, BudgetCell>>;
  plannedExpenses: PlannedExpense[];
  recurringExpenses: RecurringExpense[];
}

export function useBudgetData(year: number) {
  return useQuery<YearlyBudgetData>({
    queryKey: ['budget', year],
    queryFn: async () => {
      const res = await fetch(`/api/budget/${year}`);
      if (!res.ok) throw new Error('Failed to fetch budget');
      return res.json();
    },
  });
}
```

### useTransferSubmit.ts

```typescript
import { Category } from "@shared/schema";
import { format } from "date-fns";
import type { TransferFormValues } from "@/components/transactions/TransferForm";

interface UseTransferSubmitOptions {
  categories: Category[];
  addCategory: (cat: Omit<Category, 'id'>) => Promise<Category>;
  addTransfer: (data: TransferData) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useTransferSubmit(options: UseTransferSubmitOptions) {
  const { categories, addCategory, addTransfer, onSuccess, onError } = options;

  return async (data: TransferFormValues) => {
    try {
      const transferCategory = categories.find(
        c => c.name.toLowerCase() === "trasferimenti" || 
             c.name.toLowerCase() === "transfer"
      );
      
      let transferCategoryId = transferCategory?.id;

      if (!transferCategory) {
        const newCategory = await addCategory({
          name: "Transfers",
          type: "transfer",
          color: "#94a3b8",
          icon: "ArrowLeftRight",
        });
        transferCategoryId = newCategory.id;
      }

      if (!transferCategoryId) {
        throw new Error("Failed to get transfer category");
      }

      await addTransfer({
        amount: data.amount.toString(),
        description: data.description,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        categoryId: transferCategoryId,
        date: format(data.date, "yyyy-MM-dd'T'HH:mm:ss"),
      });

      onSuccess?.();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Transfer failed"));
    }
  };
}
```

### Server Logger (server/lib/logger.ts)

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  minLevel: LogLevel;
}

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function createLogger(source: string, config?: Partial<LoggerConfig>) {
  const minLevel = config?.minLevel || (process.env.LOG_LEVEL as LogLevel) || 'info';

  const shouldLog = (level: LogLevel) => 
    levelPriority[level] >= levelPriority[minLevel];

  const formatMessage = (level: LogLevel, message: string) => {
    const timestamp = new Date().toISOString();
    return `${timestamp} [${source}] ${level.toUpperCase()}: ${message}`;
  };

  return {
    debug: (message: string, meta?: object) => {
      if (shouldLog('debug')) {
        console.log(formatMessage('debug', message), meta ?? '');
      }
    },
    info: (message: string, meta?: object) => {
      if (shouldLog('info')) {
        console.log(formatMessage('info', message), meta ?? '');
      }
    },
    warn: (message: string, meta?: object) => {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', message), meta ?? '');
      }
    },
    error: (message: string, error?: unknown, meta?: object) => {
      if (shouldLog('error')) {
        console.error(formatMessage('error', message), error, meta ?? '');
      }
    },
  };
}

// Pre-configured loggers for each domain
export const logger = {
  gocardless: createLogger('GoCardless'),
  reconciliation: createLogger('Reconciliation'),
  scheduler: createLogger('Scheduler'),
  webhook: createLogger('Webhook'),
  api: createLogger('API'),
  auth: createLogger('Auth'),
  db: createLogger('Database'),
};

export { createLogger };
```

### Error Utilities (lib/errors.ts)

```typescript
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unexpected error occurred';
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && error.message === 'Failed to fetch';
}

export function isApiError(error: unknown): error is { status: number; message: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    'message' in error
  );
}
```

---

## 10. Refactoring Checklist

Use this checklist when working on refactoring tasks:

### Phase 1: Quick Wins (Priority: High, Effort: Low)
- [ ] Create `usePendingStagingCount` hook
- [ ] Create `useBudgetData` hook  
- [ ] Create `useTransferSubmit` hook
- [ ] Create `getErrorMessage` utility
- [ ] Create `useAuthConfig` hook
- [ ] Create `useMissingRecurringTransactions` hook

### Phase 2: Standardization (Priority: Medium, Effort: Medium)
- [ ] Create centralized server logger
- [ ] Replace all `console.log/error` with logger
- [ ] Create date formatting utilities
- [ ] Replace inline date formats with utilities
- [ ] Create toast helper functions
- [ ] Standardize error responses in routes

### Phase 3: Architecture (Priority: Medium, Effort: High)
- [ ] Create remaining query hooks
- [ ] Consider splitting FinanceContext mutations
- [ ] Create `useBudgetMutations` hook
- [ ] Create `useStagingMutations` hook
- [ ] Create `useTradeMutations` hook
- [ ] Add proper types for chart data
- [ ] Replace all `any[]` with proper types

### When Adding New Features
- [ ] Check if query already exists as a hook
- [ ] Use standardized date formats from utilities
- [ ] Use toast helpers for notifications
- [ ] Use logger for server-side logging
- [ ] Use `getErrorMessage` in catch blocks
- [ ] Ensure proper TypeScript types (no `any`)

---

## Files Reference

### Files with Most Issues

| File | Issues |
|------|--------|
| `client/src/context/FinanceContext.tsx` | 18 mutations could be split |
| `client/src/pages/Dashboard.tsx` | Duplicated queries, transfer logic |
| `client/src/pages/Transactions.tsx` | Duplicated queries, transfer logic |
| `client/src/pages/Budget.tsx` | `any[]` types, large component |
| `client/src/components/ImportedTransactions.tsx` | Large component, inline mutations |
| `server/services/gocardless.ts` | 15+ inconsistent log calls |

### Well-Structured Files (Examples to Follow)

| File | Good Patterns |
|------|---------------|
| `client/src/hooks/usePortfolioStats.ts` | Consolidated portfolio queries |
| `client/src/hooks/useTransactionsData.ts` | Filtering/sorting logic extraction |
| `client/src/lib/api.ts` | Centralized API functions |
| `server/repositories/*.ts` | Repository pattern |

---

## Notes for AI Developers

1. **Before creating inline queries:** Always check if a hook already exists or should be created
2. **When you see `any`:** Replace with proper types from `@shared/schema` or create new interfaces
3. **For error handling:** Use `getErrorMessage()` utility (create if doesn't exist)
4. **For date formatting:** Use centralized formatters (create if doesn't exist)
5. **For logging:** Use the logger utility, not raw `console.log/error`
6. **For toasts:** Use toast helpers for consistency
7. **Query keys:** Use consistent patterns - arrays with path and optional params
8. **After mutations:** Use query invalidation helpers for consistency
