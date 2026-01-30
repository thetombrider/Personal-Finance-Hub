# Personal Finance Hub - Code Review & Refactoring Guide

**Last Updated:** January 27, 2026  
**Purpose:** Technical debt documentation and refactoring guidance for AI and human developers

---

## Overview

This document identifies structural issues, code duplications, and refactoring opportunities in the Personal Finance Hub codebase. It serves as a comprehensive reference for future development work to ensure consistent patterns and eliminate technical debt.

---

## Table of Contents
7. [Toast Patterns](#7-toast-patterns)
8. [Type Safety Issues](#8-type-safety-issues)
9. [Implementation Examples](#9-implementation-examples)
10. [Refactoring Checklist](#10-refactoring-checklist)
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
