# Resolution Guide: Query Deduplication

**Priority:** High  
**Effort:** Low  
**Impact:** Reduces duplicate code, improves maintainability, ensures consistent query behavior

---

## Problem Summary

Multiple React Query calls for the same data exist across different components. This leads to:
- Inconsistent query key patterns
- Duplicate fetch logic
- Risk of cache misses due to mismatched keys
- Harder maintenance when API changes

---

## Affected Files & Queries

| Query Purpose | Duplicated In | Target Hook File |
|---------------|---------------|------------------|
| Pending staging transaction count | `Dashboard.tsx`, `Transactions.tsx` | `hooks/queries/usePendingStagingCount.ts` |
| Budget data by year | `Dashboard.tsx`, `Budget.tsx` | `hooks/queries/useBudgetData.ts` |
| Missing recurring transactions | `Dashboard.tsx`, `MissingRecurringTransactionsModal.tsx` | `hooks/queries/useMissingRecurringTransactions.ts` |
| Reconciliation checks | `Transactions.tsx`, `TransactionDrilldown.tsx` | `hooks/queries/useReconciliationChecks.ts` |
| Auth configuration | `AuthPage.tsx`, `Settings.tsx` | `hooks/queries/useAuthConfig.ts` |
| Bank connections | `ManageAccounts.tsx` | `hooks/queries/useBankConnections.ts` |

---

## Resolution Steps

### Step 1: Create the queries directory structure

```bash
mkdir -p client/src/hooks/queries
```

### Step 2: Create `usePendingStagingCount.ts`

**File:** `client/src/hooks/queries/usePendingStagingCount.ts`

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

### Step 3: Create `useBudgetData.ts`

**File:** `client/src/hooks/queries/useBudgetData.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import type { Category, BudgetCell, PlannedExpense, RecurringExpense } from "@shared/schema";

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
    enabled: !!year,
  });
}
```

### Step 4: Create `useMissingRecurringTransactions.ts`

**File:** `client/src/hooks/queries/useMissingRecurringTransactions.ts`

```typescript
import { useQuery } from "@tanstack/react-query";

interface MissingRecurringTransaction {
  id: number;
  name: string;
  amount: number;
  categoryId: number;
  accountId: number;
  expectedDate: string;
  dayOfMonth: number;
}

export function useMissingRecurringTransactions() {
  return useQuery<MissingRecurringTransaction[]>({
    queryKey: ["/api/recurring/missing"],
    queryFn: async () => {
      const res = await fetch("/api/recurring/missing");
      if (!res.ok) throw new Error("Failed to fetch missing recurring transactions");
      return res.json();
    },
  });
}
```

### Step 5: Create `useAuthConfig.ts`

**File:** `client/src/hooks/queries/useAuthConfig.ts`

```typescript
import { useQuery } from "@tanstack/react-query";

interface AuthConfig {
  authEnabled: boolean;
  registrationEnabled: boolean;
}

export function useAuthConfig() {
  return useQuery<AuthConfig>({
    queryKey: ["/api/auth/config"],
    queryFn: async () => {
      const res = await fetch("/api/auth/config");
      if (!res.ok) throw new Error("Failed to fetch auth config");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - auth config rarely changes
  });
}
```

### Step 6: Create `useReconciliationChecks.ts`

**File:** `client/src/hooks/queries/useReconciliationChecks.ts`

```typescript
import { useQuery } from "@tanstack/react-query";

interface ReconciliationStatus {
  isReconciled: boolean;
  reconciledAt?: string;
  bankTransactionId?: string;
}

export function useReconciliationStatus(transactionId: number | undefined) {
  return useQuery<ReconciliationStatus>({
    queryKey: ["/api/transactions/reconciliation", transactionId],
    queryFn: async () => {
      const res = await fetch(`/api/transactions/${transactionId}/reconciliation`);
      if (!res.ok) throw new Error("Failed to fetch reconciliation status");
      return res.json();
    },
    enabled: !!transactionId,
  });
}
```

### Step 7: Create `useBankConnections.ts`

**File:** `client/src/hooks/queries/useBankConnections.ts`

```typescript
import { useQuery } from "@tanstack/react-query";

interface BankConnection {
  id: number;
  institutionId: string;
  institutionName: string;
  requisitionId: string;
  status: string;
  createdAt: string;
  linkedAccounts: number[];
}

export function useBankConnections() {
  return useQuery<BankConnection[]>({
    queryKey: ["/api/bank/connections"],
    queryFn: async () => {
      const res = await fetch("/api/bank/connections");
      if (!res.ok) throw new Error("Failed to fetch bank connections");
      return res.json();
    },
  });
}
```

### Step 8: Create index file for exports

**File:** `client/src/hooks/queries/index.ts`

```typescript
export { usePendingStagingCount } from "./usePendingStagingCount";
export { useBudgetData } from "./useBudgetData";
export { useMissingRecurringTransactions } from "./useMissingRecurringTransactions";
export { useAuthConfig } from "./useAuthConfig";
export { useReconciliationStatus } from "./useReconciliationChecks";
export { useBankConnections } from "./useBankConnections";
```

### Step 9: Update components to use new hooks

**Dashboard.tsx Changes:**

```typescript
// BEFORE
const { data: stagingCount } = useQuery({
  queryKey: ["/api/transactions/staging"],
  queryFn: async () => { /* inline logic */ }
});

// AFTER
import { usePendingStagingCount } from "@/hooks/queries";
const { data: stagingCount } = usePendingStagingCount();
```

**Transactions.tsx Changes:**

```typescript
// BEFORE
const { data: stagingCount } = useQuery({
  queryKey: ["/api/transactions/staging"],
  queryFn: async () => { /* inline logic */ }
});

// AFTER  
import { usePendingStagingCount } from "@/hooks/queries";
const { data: stagingCount } = usePendingStagingCount();
```

---

## Query Key Convention

Adopt this consistent pattern for all query keys:

```typescript
// API-based queries (match the endpoint path)
queryKey: ["/api/resource"]
queryKey: ["/api/resource", id]
queryKey: ["/api/resource", { filter: value }]

// Computed/derived queries
queryKey: ["resource", "computed-name", params]
```

---

## Verification Steps

1. **Search for inline useQuery calls:**
   ```bash
   grep -r "useQuery({" client/src/pages/ --include="*.tsx"
   ```

2. **Run TypeScript check:**
   ```bash
   npm run check
   ```

3. **Test affected features:**
   - Dashboard staging count badge
   - Budget page data loading
   - Missing recurring transactions modal
   - Auth configuration in Settings

4. **Verify query caching works:**
   - Navigate between Dashboard and Transactions
   - Count should not re-fetch (check Network tab)

---

## Files to Modify Summary

| Action | File Path |
|--------|-----------|
| CREATE | `client/src/hooks/queries/usePendingStagingCount.ts` |
| CREATE | `client/src/hooks/queries/useBudgetData.ts` |
| CREATE | `client/src/hooks/queries/useMissingRecurringTransactions.ts` |
| CREATE | `client/src/hooks/queries/useAuthConfig.ts` |
| CREATE | `client/src/hooks/queries/useReconciliationChecks.ts` |
| CREATE | `client/src/hooks/queries/useBankConnections.ts` |
| CREATE | `client/src/hooks/queries/index.ts` |
| MODIFY | `client/src/pages/Dashboard.tsx` |
| MODIFY | `client/src/pages/Transactions.tsx` |
| MODIFY | `client/src/pages/Budget.tsx` |
| MODIFY | `client/src/pages/AuthPage.tsx` |
| MODIFY | `client/src/pages/settings/Settings.tsx` |
| MODIFY | `client/src/components/MissingRecurringTransactionsModal.tsx` |
| MODIFY | `client/src/components/ManageAccounts.tsx` |

---

## Completion Checklist

- [ ] Created `hooks/queries/` directory
- [ ] Created all 6 query hook files
- [ ] Created index.ts for barrel exports
- [ ] Updated Dashboard.tsx to use hooks
- [ ] Updated Transactions.tsx to use hooks
- [ ] Updated Budget.tsx to use hooks
- [ ] Updated AuthPage.tsx to use hooks
- [ ] Updated Settings.tsx to use hooks
- [ ] Verified build passes (`npm run check`)
- [ ] Tested all affected features
