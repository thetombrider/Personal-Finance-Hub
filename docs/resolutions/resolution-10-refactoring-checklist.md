# Resolution Guide: Refactoring Checklist

**Priority:** Reference | **Effort:** N/A | **Impact:** Tracks overall progress

---

## Phase 1: Quick Wins (High Priority, Low Effort)

- [ ] Create `usePendingStagingCount` hook → [Guide 01](./resolution-01-query-deduplication.md)
- [ ] Create `useBudgetData` hook → [Guide 01](./resolution-01-query-deduplication.md)
- [ ] Create `useTransferSubmit` hook → [Guide 02](./resolution-02-hook-extraction.md)
- [ ] Create `getErrorMessage` utility → [Guide 05](./resolution-05-error-handling.md)
- [ ] Create `useAuthConfig` hook → [Guide 01](./resolution-01-query-deduplication.md)
- [ ] Create `useMissingRecurringTransactions` hook → [Guide 01](./resolution-01-query-deduplication.md)

---

## Phase 2: Standardization (Medium Priority, Medium Effort)

- [ ] Create centralized server logger → [Guide 04](./resolution-04-logging-standardization.md)
- [ ] Replace all `console.log/error` with logger
- [ ] Create date formatting utilities → [Guide 06](./resolution-06-date-formatting.md)
- [ ] Replace inline date formats with utilities
- [ ] Create toast helper functions → [Guide 07](./resolution-07-toast-patterns.md)
- [ ] Standardize error responses in routes → [Guide 05](./resolution-05-error-handling.md)

---

## Phase 3: Architecture (Medium Priority, High Effort)

- [ ] Create remaining query hooks
- [ ] Consider splitting FinanceContext mutations → [Guide 02](./resolution-02-hook-extraction.md)
- [ ] Create `useBudgetMutations` hook
- [ ] Create `useStagingMutations` hook
- [ ] Create `useTradeMutations` hook
- [ ] Add proper types for chart data → [Guide 08](./resolution-08-type-safety.md)
- [ ] Replace all `any[]` with proper types

---

## When Adding New Features

Before writing new code, check:

- [ ] Query already exists as a hook?
- [ ] Using standardized date formats?
- [ ] Using toast helpers for notifications?
- [ ] Using logger for server-side logging?
- [ ] Using `getErrorMessage` in catch blocks?
- [ ] Proper TypeScript types (no `any`)?

---

## Files with Most Issues

| File | Issues | Priority |
|------|--------|----------|
| `FinanceContext.tsx` | 18 mutations could be split | Medium |
| `Dashboard.tsx` | Duplicated queries, transfer logic | High |
| `Transactions.tsx` | Duplicated queries, transfer logic | High |
| `Budget.tsx` | `any[]` types, large component | Medium |
| `gocardless.ts` | 15+ inconsistent log calls | Medium |

---

## Well-Structured Files (Examples)

| File | Good Patterns |
|------|---------------|
| `usePortfolioStats.ts` | Consolidated queries |
| `useTransactionsData.ts` | Logic extraction |
| `lib/api.ts` | Centralized API |
| `repositories/*.ts` | Repository pattern |

---

## Resolution Guide Index

1. [Query Deduplication](./resolution-01-query-deduplication.md)
2. [Hook Extraction](./resolution-02-hook-extraction.md)
3. [Logic Duplication](./resolution-03-logic-duplication.md)
4. [Logging Standardization](./resolution-04-logging-standardization.md)
5. [Error Handling](./resolution-05-error-handling.md)
6. [Date Formatting](./resolution-06-date-formatting.md)
7. [Toast Patterns](./resolution-07-toast-patterns.md)
8. [Type Safety](./resolution-08-type-safety.md)
9. [Implementation Examples](./resolution-09-implementation-examples.md)
10. [Refactoring Checklist](./resolution-10-refactoring-checklist.md) ← You are here
