# Resolution Guide: Type Safety Issues

**Priority:** Medium | **Effort:** Medium | **Impact:** Better IDE support, fewer runtime errors

---

## Problem Summary

- **25+ `any[]` usages** across the codebase
- All chart components use `data: any[]`
- Missing interfaces for CSV imports and bank data

---

## Key Issues

| File | Line | Fix |
|------|------|-----|
| `Budget.tsx` | 27 | `categories: Category[]` |
| `ImportTransactions.tsx` | 30-31 | Create `CsvRow` interface |
| `bank-callback.tsx` | 17 | Create `BankAccount` interface |
| `ManageAccounts.tsx` | 57 | Use proper connection type |
| All dashboard charts | Props | `data: ChartDataPoint[]` |

---

## Resolution Steps

### Step 1: Create Chart Data Types

**File:** `client/src/types/charts.ts`

```typescript
export interface ChartDataPoint {
  label: string;
  value: number;
  [key: string]: unknown;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface CashFlowDataPoint {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface NetWorthDataPoint {
  date: string;
  netWorth: number;
  assets: number;
  liabilities: number;
}
```

### Step 2: Update Chart Components

**Example for SpendingBreakdownChart.tsx:**

```typescript
// Before
interface Props { data: any[] }

// After
import type { CategoryDataPoint } from "@/types/charts";
interface Props { data: CategoryDataPoint[] }
```

### Step 3: Create Import Types

**File:** `client/src/types/imports.ts`

```typescript
export interface CsvRow {
  [key: string]: string;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
}

export interface BankAccountData {
  id: string;
  iban?: string;
  name: string;
  currency: string;
  balance?: number;
}
```

---

## Files to Update

### Chart Components
- `NetWorthEvolutionChart.tsx`
- `SpendingBreakdownChart.tsx`
- `WealthDistributionChart.tsx`
- `CashFlowChart.tsx`
- `BudgetComparisonChart.tsx`
- `CategoryTrendChart.tsx`
- `SankeyChart.tsx`
- `NetWorthProjectionChart.tsx`

### Other Files
- `Budget.tsx` - category types
- `ImportTransactions.tsx` - CSV row types
- `bank-callback.tsx` - bank account types
- `ManageAccounts.tsx` - connection types

---

## Verification

```bash
grep -rn "any\[\]" client/src --include="*.tsx"
grep -rn ": any" client/src --include="*.tsx"
npm run check
```

## Checklist
- [ ] Created `client/src/types/charts.ts`
- [ ] Created `client/src/types/imports.ts`
- [ ] Updated all chart components
- [ ] Updated Budget.tsx
- [ ] Updated ImportTransactions.tsx
- [ ] Updated bank-callback.tsx
- [ ] Verified no remaining `any[]` usage
- [ ] Build passes with stricter types
