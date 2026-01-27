# Resolution Guide: Hook Extraction Candidates

**Priority:** High  
**Effort:** Medium  
**Impact:** Improved code organization, reusability, and maintainability

---

## Problem Summary

Large components contain embedded query and mutation logic that should be extracted into dedicated hooks. The `FinanceContext.tsx` file alone contains 18 mutations (407 lines), making it difficult to maintain and test.

---

## Target Directory Structure

```
client/src/hooks/
├── queries/                         # Query hooks (from resolution-01)
│   ├── usePendingStagingCount.ts
│   ├── useBudgetData.ts
│   ├── useMissingRecurringTransactions.ts
│   ├── useReconciliationChecks.ts
│   ├── useAuthConfig.ts
│   ├── useBankConnections.ts
│   └── index.ts
├── mutations/                       # Mutation hooks (new)
│   ├── useBudgetMutations.ts
│   ├── useStagingMutations.ts
│   ├── useTradeMutations.ts
│   ├── useWebhookMutations.ts
│   └── index.ts
├── useTransferSubmit.ts            # Transfer creation logic
├── usePortfolioStats.ts            # Already exists
├── useTransactionsData.ts          # Already exists
└── dashboard/                       # Dashboard-specific hooks
    └── useDashboardQueries.ts
```

---

## Resolution Steps

### Part A: Create Mutation Hooks

#### Step 1: Create `useBudgetMutations.ts`

**File:** `client/src/hooks/mutations/useBudgetMutations.ts`

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface BudgetCellUpdate {
  categoryId: number;
  month: number;
  year: number;
  planned: number;
}

export function useBudgetMutations() {
  const queryClient = useQueryClient();

  const updateBudgetCell = useMutation({
    mutationFn: async (data: BudgetCellUpdate) => {
      const res = await apiRequest("PUT", "/api/budget/cell", data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["budget", variables.year] });
    },
  });

  const copyBudgetFromYear = useMutation({
    mutationFn: async ({ fromYear, toYear }: { fromYear: number; toYear: number }) => {
      const res = await apiRequest("POST", "/api/budget/copy", { fromYear, toYear });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["budget", variables.toYear] });
    },
  });

  const resetBudgetYear = useMutation({
    mutationFn: async (year: number) => {
      const res = await apiRequest("DELETE", `/api/budget/${year}`);
      return res.json();
    },
    onSuccess: (_, year) => {
      queryClient.invalidateQueries({ queryKey: ["budget", year] });
    },
  });

  return {
    updateBudgetCell,
    copyBudgetFromYear,
    resetBudgetYear,
    isUpdating: updateBudgetCell.isPending,
    isCopying: copyBudgetFromYear.isPending,
    isResetting: resetBudgetYear.isPending,
  };
}
```

#### Step 2: Create `useStagingMutations.ts`

**File:** `client/src/hooks/mutations/useStagingMutations.ts`

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ApproveTransactionData {
  stagingId: number;
  categoryId: number;
  description?: string;
  tags?: number[];
}

export function useStagingMutations() {
  const queryClient = useQueryClient();

  const invalidateStagingQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/transactions/staging"] });
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
  };

  const approveTransaction = useMutation({
    mutationFn: async (data: ApproveTransactionData) => {
      const res = await apiRequest("POST", `/api/transactions/staging/${data.stagingId}/approve`, data);
      return res.json();
    },
    onSuccess: invalidateStagingQueries,
  });

  const dismissTransaction = useMutation({
    mutationFn: async (stagingId: number) => {
      const res = await apiRequest("PUT", `/api/transactions/staging/${stagingId}/dismiss`);
      return res.json();
    },
    onSuccess: invalidateStagingQueries,
  });

  const restoreTransaction = useMutation({
    mutationFn: async (stagingId: number) => {
      const res = await apiRequest("PUT", `/api/transactions/staging/${stagingId}/restore`);
      return res.json();
    },
    onSuccess: invalidateStagingQueries,
  });

  const bulkApprove = useMutation({
    mutationFn: async (transactions: ApproveTransactionData[]) => {
      const res = await apiRequest("POST", "/api/transactions/staging/bulk-approve", { transactions });
      return res.json();
    },
    onSuccess: invalidateStagingQueries,
  });

  const bulkDismiss = useMutation({
    mutationFn: async (stagingIds: number[]) => {
      const res = await apiRequest("PUT", "/api/transactions/staging/bulk-dismiss", { ids: stagingIds });
      return res.json();
    },
    onSuccess: invalidateStagingQueries,
  });

  return {
    approveTransaction,
    dismissTransaction,
    restoreTransaction,
    bulkApprove,
    bulkDismiss,
    isApproving: approveTransaction.isPending,
    isDismissing: dismissTransaction.isPending,
    isRestoring: restoreTransaction.isPending,
  };
}
```

#### Step 3: Create `useTradeMutations.ts`

**File:** `client/src/hooks/mutations/useTradeMutations.ts`

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Trade } from "@shared/schema";

type CreateTradeData = Omit<Trade, "id" | "userId" | "createdAt">;

export function useTradeMutations() {
  const queryClient = useQueryClient();

  const invalidatePortfolioQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
    queryClient.invalidateQueries({ queryKey: ["/api/portfolio/holdings"] });
    queryClient.invalidateQueries({ queryKey: ["/api/portfolio/trades"] });
    queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
  };

  const createTrade = useMutation({
    mutationFn: async (data: CreateTradeData) => {
      const res = await apiRequest("POST", "/api/portfolio/trades", data);
      return res.json();
    },
    onSuccess: invalidatePortfolioQueries,
  });

  const updateTrade = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Trade> & { id: number }) => {
      const res = await apiRequest("PUT", `/api/portfolio/trades/${id}`, data);
      return res.json();
    },
    onSuccess: invalidatePortfolioQueries,
  });

  const deleteTrade = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/portfolio/trades/${id}`);
      return res.json();
    },
    onSuccess: invalidatePortfolioQueries,
  });

  return {
    createTrade,
    updateTrade,
    deleteTrade,
    isCreating: createTrade.isPending,
    isUpdating: updateTrade.isPending,
    isDeleting: deleteTrade.isPending,
  };
}
```

#### Step 4: Create `useWebhookMutations.ts`

**File:** `client/src/hooks/mutations/useWebhookMutations.ts`

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface WebhookData {
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
}

export function useWebhookMutations() {
  const queryClient = useQueryClient();

  const invalidateWebhooks = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
  };

  const createWebhook = useMutation({
    mutationFn: async (data: WebhookData) => {
      const res = await apiRequest("POST", "/api/webhooks", data);
      return res.json();
    },
    onSuccess: invalidateWebhooks,
  });

  const updateWebhook = useMutation({
    mutationFn: async ({ id, ...data }: Partial<WebhookData> & { id: number }) => {
      const res = await apiRequest("PUT", `/api/webhooks/${id}`, data);
      return res.json();
    },
    onSuccess: invalidateWebhooks,
  });

  const deleteWebhook = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/webhooks/${id}`);
      return res.json();
    },
    onSuccess: invalidateWebhooks,
  });

  const testWebhook = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/webhooks/${id}/test`);
      return res.json();
    },
  });

  return {
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    isCreating: createWebhook.isPending,
    isUpdating: updateWebhook.isPending,
    isDeleting: deleteWebhook.isPending,
    isTesting: testWebhook.isPending,
  };
}
```

#### Step 5: Create mutations index

**File:** `client/src/hooks/mutations/index.ts`

```typescript
export { useBudgetMutations } from "./useBudgetMutations";
export { useStagingMutations } from "./useStagingMutations";
export { useTradeMutations } from "./useTradeMutations";
export { useWebhookMutations } from "./useWebhookMutations";
```

---

### Part B: Create Transfer Submit Hook

**File:** `client/src/hooks/useTransferSubmit.ts`

```typescript
import { useCallback } from "react";
import { useFinance } from "@/context/FinanceContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Category } from "@shared/schema";

interface TransferFormValues {
  amount: number;
  description: string;
  fromAccountId: number;
  toAccountId: number;
  date: Date;
}

interface UseTransferSubmitOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useTransferSubmit(options: UseTransferSubmitOptions = {}) {
  const { categories, addCategory, addTransfer } = useFinance();
  const { toast } = useToast();

  const findOrCreateTransferCategory = useCallback(async (): Promise<number | null> => {
    // Look for existing transfer category
    const transferCategory = categories.find(
      (c: Category) =>
        c.name.toLowerCase() === "trasferimenti" ||
        c.name.toLowerCase() === "transfer" ||
        c.name.toLowerCase() === "transfers"
    );

    if (transferCategory) {
      return transferCategory.id;
    }

    // Create if not found
    try {
      const newCategory = await addCategory({
        name: "Transfers",
        type: "transfer",
        color: "#94a3b8",
        icon: "ArrowLeftRight",
      });
      return newCategory.id;
    } catch (error) {
      console.error("Failed to create transfer category:", error);
      return null;
    }
  }, [categories, addCategory]);

  const submitTransfer = useCallback(
    async (data: TransferFormValues) => {
      try {
        const transferCategoryId = await findOrCreateTransferCategory();

        if (!transferCategoryId) {
          const error = new Error("Failed to get or create transfer category");
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
          options.onError?.(error);
          return false;
        }

        await addTransfer({
          amount: data.amount.toString(),
          description: data.description,
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          categoryId: transferCategoryId,
          date: format(data.date, "yyyy-MM-dd'T'HH:mm:ss"),
        });

        toast({
          title: "Transfer created",
          description: `Transferred ${data.amount} successfully`,
        });

        options.onSuccess?.();
        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Transfer failed");
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
        options.onError?.(err);
        return false;
      }
    },
    [findOrCreateTransferCategory, addTransfer, toast, options]
  );

  return { submitTransfer };
}
```

---

### Part C: Split FinanceContext Mutations (Optional - High Effort)

If the team decides to split `FinanceContext.tsx`, here's the proposed structure:

1. **Keep in FinanceContext:** Core state and data fetching
2. **Extract to `useAccountMutations`:** `createAccount`, `createBulkAccounts`, `updateAccount`, `deleteAccount`
3. **Extract to `useCategoryMutations`:** `createCategory`, `updateCategory`, `deleteCategory`, `reorderCategories`
4. **Extract to `useTagMutations`:** `createTag`, `updateTag`, `deleteTag`, `batchAssignTags`, `batchRemoveTags`
5. **Extract to `useTransactionMutations`:** `createTransaction`, `updateTransaction`, `deleteTransaction`, `addTransfer`, `bulkDelete`, `bulkUpdate`, `bulkCategorize`

> ⚠️ **Note:** This is a significant refactor. Consider doing this incrementally or as a dedicated refactoring sprint.

---

## Usage Examples

### Using Transfer Hook

```typescript
// Dashboard.tsx or Transactions.tsx
import { useTransferSubmit } from "@/hooks/useTransferSubmit";

function TransferSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { submitTransfer } = useTransferSubmit({
    onSuccess: () => setDialogOpen(false),
  });

  return (
    <TransferForm onSubmit={submitTransfer} />
  );
}
```

### Using Mutation Hooks

```typescript
import { useStagingMutations } from "@/hooks/mutations";

function StagingTransactionRow({ transaction }) {
  const { approveTransaction, dismissTransaction, isApproving } = useStagingMutations();

  return (
    <div>
      <Button 
        onClick={() => approveTransaction.mutate({ stagingId: transaction.id, categoryId: 1 })}
        disabled={isApproving}
      >
        Approve
      </Button>
      <Button onClick={() => dismissTransaction.mutate(transaction.id)}>
        Dismiss
      </Button>
    </div>
  );
}
```

---

## Verification Steps

1. **Check for TypeScript errors:**
   ```bash
   npm run check
   ```

2. **Test affected features:**
   - Transfer creation from Dashboard
   - Transfer creation from Transactions page
   - Budget cell updates
   - Staging transaction approve/dismiss
   - Portfolio trade creation

3. **Verify query invalidation works correctly:**
   - After transfer, check both accounts update
   - After budget update, check table refreshes

---

## Files to Modify Summary

| Action | File Path |
|--------|-----------|
| CREATE | `client/src/hooks/mutations/useBudgetMutations.ts` |
| CREATE | `client/src/hooks/mutations/useStagingMutations.ts` |
| CREATE | `client/src/hooks/mutations/useTradeMutations.ts` |
| CREATE | `client/src/hooks/mutations/useWebhookMutations.ts` |
| CREATE | `client/src/hooks/mutations/index.ts` |
| CREATE | `client/src/hooks/useTransferSubmit.ts` |
| MODIFY | `client/src/pages/Dashboard.tsx` |
| MODIFY | `client/src/pages/Transactions.tsx` |
| MODIFY | `client/src/pages/Budget.tsx` |
| MODIFY | `client/src/pages/Portfolio.tsx` |
| OPTIONAL | `client/src/context/FinanceContext.tsx` (split mutations) |

---

## Completion Checklist

- [ ] Created `hooks/mutations/` directory
- [ ] Created `useBudgetMutations.ts`
- [ ] Created `useStagingMutations.ts`
- [ ] Created `useTradeMutations.ts`
- [ ] Created `useWebhookMutations.ts`
- [ ] Created `hooks/mutations/index.ts`
- [ ] Created `useTransferSubmit.ts`
- [ ] Updated Dashboard.tsx transfer logic
- [ ] Updated Transactions.tsx transfer logic
- [ ] Verified build passes
- [ ] Tested transfer functionality
- [ ] Tested budget mutations
- [ ] Tested staging mutations
