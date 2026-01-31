---
trigger: always_on
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
│   ├── api.ts          # Centralized API functions
│   ├── toastHelpers.ts # Toast notification wrappers
│   ├── dateFormatters.ts # Date formatting utilities
│   └── queryInvalidation.ts # Cache invalidation helpers
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

### 1. Data Fetching & State

**Always check `client/src/lib/api.ts` and `client/src/hooks/queries` before writing new fetch logic.**

*   **API Calls**: Use the centralized functions in `@/lib/api`. Do not write inline `fetch` calls in components.
*   **Queries**: Create or reuse hooks in `client/src/hooks/queries/`.
    *   Examples: `useBudgetData`, `useBankConnections`.

**Pattern for new query hooks:**

```typescript
import { useQuery } from "@tanstack/react-query";
import { fetchMyData } from "@/lib/api"; // Centralized API function

export function useMyData(params?: { id: number }) {
  return useQuery({
    queryKey: ['/api/my-endpoint', params?.id],
    queryFn: () => fetchMyData(params?.id),
    enabled: !!params?.id,
  });
}
```

### 2. Logic Extraction

**Extract repeated logic into custom hooks.** If logic appears in 2+ places, create a hook.

Example patterns:
- Transfer submission logic → `useTransferSubmit.ts`
- Bulk mutation operations → `useBudgetMutations.ts`

### 3. Type Safety

**Never use `any` or `any[]`.** Always provide proper types.

*   Get types from `@shared/schema` whenever possible.
*   Create component-specific interfaces if needed, but prefer shared types.

---

## Error Handling

### Client-Side

Use the `getErrorMessage` utility for consistent error extraction:

```typescript
import { getErrorMessage } from "@/lib/errors";
import { toastHelpers } from "@/lib/toastHelpers"; // Use helpers!

try {
  await someOperation();
} catch (error) {
  // Use helper
  console.error(error);
}
```

### Server-Side

Use consistent error response formats:

```typescript
// Standard error response
res.status(500).json({ error: "Failed to fetch transactions" });

// Validation error
res.status(400).json({ error: "Invalid input", details: validationErrors });
```

---

## Logging Standards

### Server-Side Logging

Use the structured logger instead of raw `console.log/error`:

```typescript
import { logger } from "@/lib/logger";

// ✅ Good
logger.gocardless.info("Token refreshed successfully");
logger.api.error("Request failed", error, { endpoint: "/api/users" });
```

**Available loggers:** `gocardless`, `reconciliation`, `scheduler`, `webhook`, `api`, `auth`, `db`

---

## Utility Usage (MANDATORY)

### 1. Toast Notifications

**Do NOT use `toast({ ... })` directly.** Use `toastHelpers.ts` functions.

```typescript
import { showSuccess, showError, toastPatterns } from "@/lib/toastHelpers";
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

// ✅ Success
showSuccess(toast, "Transaction created");

// ✅ Error
showError(toast, "Failed to create", "Description here");

// ✅ Patterns (Preferred for CRUD)
toastPatterns.created(toast, "Transaction");
toastPatterns.failed(toast, "update account", error);
```

### 2. Date Formatting

**Do NOT use `date-fns` `format` directly for display.** Use `dateFormatters.ts`.

```typescript
import { formatForDisplay, formatForApi, formatDateTime } from "@/lib/dateFormatters";

// ✅ Display in UI (e.g. "27/01/2026")
formatForDisplay(dateString);

// ✅ Send to API (ISO format)
formatForApi(dateObj);

// ✅ Display with time
formatDateTime(dateString);
```

### 3. Query Invalidation

**Do NOT use `queryClient.invalidateQueries` directly.** Use `useInvalidation`.

```typescript
import { useInvalidation } from "@/lib/queryInvalidation";

const { invalidateTransactions, invalidateBudget } = useInvalidation();

// ✅ Inside mutation onSuccess:
invalidateTransactions();
invalidateBudget(2026);
```

---

## Pre-Commit Checklist

Before submitting changes:

- [ ] **Toasts**: Used `toastHelpers` (no direct `toast()` calls)?
- [ ] **Dates**: Used `dateFormatters` (no direct `format()` calls)?
- [ ] **Invalidation**: Used `useInvalidation` hook?
- [ ] **API**: Used functions from `@/lib/api`?
- [ ] **Types**: No `any` types used?
- [ ] **Logging**: Server logging uses `logger`?
- [ ] **Check**: TypeScript compiles without errors (`npm run check`)

---

## Common Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run check      # TypeScript type checking
npm run db:push    # Push schema to database
```