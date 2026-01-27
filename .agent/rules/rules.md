---
trigger: manual
---

# Personal Finance Hub - Workspace Rules

## Overview

This document defines development guidelines for AI and human developers working on the Personal Finance Hub (FinTrack) codebase. Following these rules ensures consistent, maintainable, and high-quality code.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts |
| **Backend** | Express.js, Node.js, Passport.js |
| **Database** | PostgreSQL, Drizzle ORM |
| **State Management** | React Query (TanStack Query) |
| **API Style** | RESTful |

---

## Project Structure

```
client/src/
├── components/         # Reusable UI components
│   ├── dashboard/      # Dashboard-specific charts and widgets
│   ├── transactions/   # Transaction-related components
│   ├── budget/         # Budget-related components
│   └── ui/             # shadcn/ui components
├── context/            # React Context providers
├── hooks/              # Custom hooks (queries, mutations, utilities)
│   └── queries/        # Data fetching hooks
├── lib/                # Utility functions and helpers
├── pages/              # Page components (route endpoints)
└── types/              # TypeScript type definitions

server/
├── routes/             # Express route handlers
├── services/           # Business logic and external integrations
├── repositories/       # Data access layer (follow this pattern)
└── lib/                # Server utilities (logger, responses)

shared/
└── schema.ts           # Shared TypeScript types and Zod schemas
```

---

## Code Organization Rules

### 1. Query Deduplication

**Always check if a query hook exists before creating inline queries.**

Create hooks in `client/src/hooks/queries/` for reusable data fetching:

| Query Purpose | Hook Location |
|---------------|---------------|
| Pending staging count | `hooks/queries/usePendingStagingCount.ts` |
| Budget data by year | `hooks/queries/useBudgetData.ts` |
| Missing recurring transactions | `hooks/queries/useMissingRecurringTransactions.ts` |
| Auth configuration | `hooks/queries/useAuthConfig.ts` |
| Bank connections | `hooks/queries/useBankConnections.ts` |

**Pattern for new query hooks:**

```typescript
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useMyData(params?: { id: number }) {
  return useQuery({
    queryKey: ['/api/my-endpoint', params?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/my-endpoint/${params?.id}`);
      return res.json();
    },
  });
}
```

### 2. Logic Extraction

**Extract repeated logic into custom hooks.** If logic appears in 2+ places, create a hook.

Example patterns that should be hooks:
- Transfer submission logic → `useTransferSubmit.ts`
- Bulk mutation operations → `useBudgetMutations.ts`, `useStagingMutations.ts`
- Form validation with complex dependencies

### 3. Type Safety

**Never use `any` or `any[]`.** Always provide proper types.

```typescript
// ❌ Bad
const data: any[] = await fetchData();

// ✅ Good
interface ChartDataPoint {
  label: string;
  value: number;
}
const data: ChartDataPoint[] = await fetchData();
```

Get types from `@shared/schema` or create component-specific interfaces in the component file or a dedicated types file. If types do not exist, create them.

---

## Error Handling

### Client-Side

Use the `getErrorMessage` utility for consistent error extraction:

```typescript
import { getErrorMessage } from "@/lib/errors";

try {
  await someOperation();
} catch (error) {
  toast({
    variant: "destructive",
    title: "Operation failed",
    description: getErrorMessage(error),
  });
}
```

**Standard error utility (`lib/errors.ts`):**

```typescript
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}
```

### Server-Side

Use consistent error response formats:

```typescript
// Standard error response
res.status(500).json({ error: "Failed to fetch transactions" });

// Validation error
res.status(400).json({ error: "Invalid input", details: validationErrors });

// Not found
res.status(404).json({ error: "Resource not found" });

// Authorization (use 403, NOT 400)
res.status(403).json({ error: "Access denied" });
```

---

## Logging Standards

### Server-Side Logging

Use the structured logger instead of raw `console.log/error`:

```typescript
import { logger } from "@/lib/logger";

// ❌ Bad
console.log("[GoCardless] Token refreshed");
console.error("API error:", error);

// ✅ Good
logger.gocardless.info("Token refreshed successfully");
logger.api.error("Request failed", error, { endpoint: "/api/users" });
```

**Available loggers:** `gocardless`, `reconciliation`, `scheduler`, `webhook`, `api`, `auth`, `db`

---

## Date Formatting

Use consistent date formats throughout the application:

| Format | Usage |
|--------|-------|
| `"dd/MM/yyyy"` | Tables and lists |
| `"MMM d, yyyy"` | User-friendly display |
| `"yyyy-MM-dd"` | API calls and exports |
| `"yyyy-MM-dd'T'HH:mm:ss"` | ISO format with time |

```typescript
import { format } from "date-fns";

// For display
format(date, "dd/MM/yyyy");

// For API
format(date, "yyyy-MM-dd'T'HH:mm:ss");
```

---

## Toast Notifications

Use consistent toast patterns:

```typescript
// Success
toast({ title: "Transaction created" });

// Error (always include variant and descriptive message)
toast({
  variant: "destructive",
  title: "Failed to create transaction",
  description: getErrorMessage(error),
});
```

**Naming conventions:**
- Success: Past tense action (e.g., "Transaction created", "Account updated")
- Error: "Failed to..." + action name

---

## Query Invalidation

Use consistent query key patterns after mutations:

```typescript
const queryClient = useQueryClient();

// After creating/updating a transaction
queryClient.invalidateQueries({ queryKey: ["transactions"] });
queryClient.invalidateQueries({ queryKey: ["accounts"] });

// After budget changes
queryClient.invalidateQueries({ queryKey: ["budget", currentYear] });
```

---

## Well-Structured Files to Reference

When unsure about patterns, reference these well-structured files:

| File | Good Patterns |
|------|---------------|
| `client/src/hooks/usePortfolioStats.ts` | Consolidated query hook |
| `client/src/hooks/useTransactionsData.ts` | Filtering/sorting logic extraction |
| `client/src/lib/api.ts` | Centralized API functions |
| `server/repositories/*.ts` | Repository pattern for data access |

---

## Pre-Commit Checklist

Before submitting changes:

- [ ] No `any` or `any[]` types used
- [ ] Queries extracted to hooks if reusable
- [ ] Error handling uses `getErrorMessage()`
- [ ] Server logging uses structured logger
- [ ] Toast notifications follow standard patterns
- [ ] Date formatting is consistent
- [ ] Query keys follow established patterns
- [ ] TypeScript compiles without errors (`npm run check`)

---

## Common Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run check      # TypeScript type checking
npm run db:push    # Push schema to database
```

---

## Integration Notes

### GoCardless (Bank Sync)
- Always log operations using `logger.gocardless`
- Handle token refresh errors gracefully
- Store sync timestamps for connected accounts

### Webhooks
- Support Tally.so integration format
- Support generic JSON payload format
- Log all webhook activity using `logger.webhook`

### Email Reports (Resend)
- Weekly automated reports
- Use `logger.scheduler` for cron job logging
