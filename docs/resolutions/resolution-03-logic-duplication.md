# Resolution Guide: Logic Duplication

**Priority:** High  
**Effort:** Low  
**Impact:** Eliminates redundant code, ensures consistent behavior

---

## Problem Summary

Identical business logic is duplicated across multiple components, leading to:
- Inconsistent behavior when one instance is updated but not others
- Increased maintenance burden
- Higher risk of bugs

---

## Identified Duplications

### 1. Transfer Submit Logic (~35 lines)

**Duplicated in:**
- `Dashboard.tsx` (lines ~103-137)
- `Transactions.tsx` (lines ~153-187)

**Pattern:**
1. Find transfer category by name ("trasferimenti" or "transfer")
2. Create category if not found
3. Show error if creation fails
4. Call `addTransfer` with formatted data
5. Close dialog

**Solution:** See `resolution-02-hook-extraction.md` → `useTransferSubmit.ts`

---

### 2. Query Invalidation Patterns

**Issue:** Inconsistent cache invalidation after mutations

**Current patterns observed:**

```typescript
// Pattern 1: Specific key
queryClient.invalidateQueries({ queryKey: ['budget', currentYear] });

// Pattern 2: Broad key (invalidates all related)
queryClient.invalidateQueries({ queryKey: ['budget'] });

// Pattern 3: Multiple manual invalidations
queryClient.invalidateQueries({ queryKey: ["accounts"] });
queryClient.invalidateQueries({ queryKey: ["transactions"] });
queryClient.invalidateQueries({ queryKey: ["staging"] });
```

**Solution:** Create centralized invalidation helpers

---

## Resolution Steps

### Step 1: Create Query Invalidation Helpers

**File:** `client/src/lib/queryInvalidation.ts`

```typescript
import { QueryClient } from "@tanstack/react-query";

/**
 * Invalidation helpers for consistent cache management
 */
export const invalidationHelpers = {
  /**
   * Invalidate all transaction-related queries
   */
  transactions: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/transactions/staging"] });
    queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
  },

  /**
   * Invalidate all account-related queries
   */
  accounts: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
  },

  /**
   * Invalidate budget for a specific year
   */
  budget: (queryClient: QueryClient, year?: number) => {
    if (year) {
      queryClient.invalidateQueries({ queryKey: ["budget", year] });
    } else {
      queryClient.invalidateQueries({ queryKey: ["budget"] });
    }
    // Also invalidate dashboard which may show budget summaries
    queryClient.invalidateQueries({ queryKey: ["/api/reports/summary"] });
  },

  /**
   * Invalidate all portfolio-related queries
   */
  portfolio: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
    queryClient.invalidateQueries({ queryKey: ["/api/portfolio/holdings"] });
    queryClient.invalidateQueries({ queryKey: ["/api/portfolio/trades"] });
    queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
  },

  /**
   * Invalidate staging transactions
   */
  staging: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: ["/api/transactions/staging"] });
  },

  /**
   * Invalidate category-related queries
   */
  categories: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    queryClient.invalidateQueries({ queryKey: ["budget"] });
  },

  /**
   * Invalidate tag-related queries
   */
  tags: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
  },

  /**
   * Invalidate recurring expense/income queries
   */
  recurring: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: ["/api/recurring"] });
    queryClient.invalidateQueries({ queryKey: ["/api/recurring/missing"] });
    queryClient.invalidateQueries({ queryKey: ["budget"] });
  },

  /**
   * Full refresh - use sparingly
   */
  all: (queryClient: QueryClient) => {
    queryClient.invalidateQueries();
  },
};

/**
 * Hook for using invalidation helpers with built-in queryClient
 */
export function useInvalidation() {
  const queryClient = useQueryClient();

  return {
    invalidateTransactions: () => invalidationHelpers.transactions(queryClient),
    invalidateAccounts: () => invalidationHelpers.accounts(queryClient),
    invalidateBudget: (year?: number) => invalidationHelpers.budget(queryClient, year),
    invalidatePortfolio: () => invalidationHelpers.portfolio(queryClient),
    invalidateStaging: () => invalidationHelpers.staging(queryClient),
    invalidateCategories: () => invalidationHelpers.categories(queryClient),
    invalidateTags: () => invalidationHelpers.tags(queryClient),
    invalidateRecurring: () => invalidationHelpers.recurring(queryClient),
    invalidateAll: () => invalidationHelpers.all(queryClient),
  };
}
```

### Step 2: Update Components to Use Helpers

**Before (FinanceContext.tsx or component):**

```typescript
// After creating a transfer
await addTransfer(data);
queryClient.invalidateQueries({ queryKey: ["accounts"] });
queryClient.invalidateQueries({ queryKey: ["transactions"] });
```

**After:**

```typescript
import { invalidationHelpers } from "@/lib/queryInvalidation";

// In mutation onSuccess
onSuccess: () => {
  invalidationHelpers.transactions(queryClient);
},
```

**Or using the hook:**

```typescript
import { useInvalidation } from "@/lib/queryInvalidation";

function MyComponent() {
  const { invalidateTransactions } = useInvalidation();
  
  const handleSuccess = () => {
    invalidateTransactions();
  };
}
```

---

### Step 3: Additional Logic Consolidation

#### Category Finder Utility

**File:** `client/src/lib/categoryUtils.ts`

```typescript
import type { Category } from "@shared/schema";

/**
 * Find a category by name (case-insensitive, supports multiple names)
 */
export function findCategoryByName(
  categories: Category[],
  names: string | string[]
): Category | undefined {
  const searchNames = Array.isArray(names) ? names : [names];
  const lowerNames = searchNames.map((n) => n.toLowerCase());

  return categories.find((c) => lowerNames.includes(c.name.toLowerCase()));
}

/**
 * Find the transfer category
 */
export function findTransferCategory(categories: Category[]): Category | undefined {
  return findCategoryByName(categories, ["trasferimenti", "transfer", "transfers"]);
}

/**
 * Get categories by type
 */
export function getCategoriesByType(
  categories: Category[],
  type: "income" | "expense" | "transfer"
): Category[] {
  return categories.filter((c) => c.type === type);
}

/**
 * Sort categories by usage or name
 */
export function sortCategories(
  categories: Category[],
  sortBy: "name" | "usage" = "name"
): Category[] {
  return [...categories].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    // For usage, we'd need transaction count data
    return 0;
  });
}
```

#### Amount Formatting Utility

**File:** `client/src/lib/formatters.ts`

```typescript
/**
 * Format amount for API submission (string, positive)
 */
export function formatAmountForApi(amount: number): string {
  return Math.abs(amount).toString();
}

/**
 * Format amount for display with currency
 */
export function formatCurrency(
  amount: number,
  currency: string = "EUR",
  locale: string = "it-IT"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Parse amount string to number
 */
export function parseAmount(value: string): number {
  // Handle European format (1.234,56) and US format (1,234.56)
  const cleaned = value.replace(/[^\d,.-]/g, "");
  
  // If we have both comma and dot, determine format
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  
  if (lastComma > lastDot) {
    // European format: 1.234,56
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  
  // US format or simple number
  return parseFloat(cleaned.replace(/,/g, ""));
}
```

---

## Verification Steps

1. **Search for remaining duplications:**
   ```bash
   # Find transfer category lookups
   grep -r "trasferimenti\|transfer" client/src --include="*.tsx" -l
   
   # Find invalidateQueries patterns
   grep -r "invalidateQueries" client/src --include="*.tsx" -A 2
   ```

2. **Run type check:**
   ```bash
   npm run check
   ```

3. **Test affected features:**
   - Create transfer from Dashboard → verify accounts update
   - Create transfer from Transactions → verify accounts update
   - Create transaction → verify all related data refreshes
   - Update budget → verify budget table refreshes

---

## Files to Modify Summary

| Action | File Path |
|--------|-----------|
| CREATE | `client/src/lib/queryInvalidation.ts` |
| CREATE | `client/src/lib/categoryUtils.ts` |
| CREATE | `client/src/lib/formatters.ts` |
| MODIFY | `client/src/context/FinanceContext.tsx` (use invalidation helpers) |
| MODIFY | `client/src/pages/Dashboard.tsx` (use transfer hook) |
| MODIFY | `client/src/pages/Transactions.tsx` (use transfer hook) |
| MODIFY | Various components using inline invalidation |

---

## Completion Checklist

- [ ] Created `lib/queryInvalidation.ts`
- [ ] Created `lib/categoryUtils.ts`
- [ ] Created `lib/formatters.ts`
- [ ] Updated FinanceContext to use invalidation helpers
- [ ] Updated Dashboard.tsx to use `useTransferSubmit`
- [ ] Updated Transactions.tsx to use `useTransferSubmit`
- [ ] Searched for remaining duplications
- [ ] Verified build passes
- [ ] Tested transfer creation from both pages
- [ ] Tested cache invalidation works correctly
