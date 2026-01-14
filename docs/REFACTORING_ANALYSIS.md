# Personal Finance Hub - Refactoring Analysis Report

> Generated: 2026-01-14

This document outlines the key areas for improvement to increase resiliency, extendability, and maintainability of the codebase.

---

## Executive Summary

The codebase has grown organically and exhibits several architectural concerns:
- **Monolithic files** with 1000+ lines mixing concerns
- **Insufficient modularization** in React components
- **Limited custom hooks** for shared logic extraction
- **Centralized single storage class** handling all data domains

---

## Area 1: Dashboard Component Extraction (Priority: HIGH)

**Current:** `Dashboard.tsx` is 1199 lines with 14+ useMemo calculations, 6 KPI cards, 3 chart sections.

**Recommended:** Extract to `client/src/components/dashboard/` with:
- Individual KPI card components
- Chart components in `charts/` subdirectory
- Detail modals in `modals/` subdirectory
- Custom hooks for calculations

---

## Area 2: Custom Hooks Expansion (Priority: HIGH)

**Current:** Only 4 custom hooks exist.

**Recommended:** Add hooks for:
- Account/Category/Transaction CRUD with caching
- Calculation hooks (spending, balances, net worth, cash flow)
- UI state hooks (filters, pagination, sortable tables)

---

## Area 3: Storage Layer Split (Priority: HIGH) - DONE

**Current:** `storage.ts` is 1090 lines with 171 methods covering 15 domains.

**Recommended:** Split into `server/repositories/` with domain-specific files.

---

## Area 4: Transaction Page Decomposition (Priority: MEDIUM)

**Current:** `Transactions.tsx` is 1089 lines with inline forms, filtering, sorting.

**Recommended:** Extract to `client/src/components/transactions/`.

---

## Area 5: Import Wizard Refactoring (Priority: MEDIUM)

**Current:** `ImportTransactions.tsx` is 978 lines handling 4 import modes.

**Recommended:** Extract to `client/src/components/import/`.

---

## Area 6: ReportService Simplification (Priority: MEDIUM)

**Current:** `reportService.ts` is 727 lines with 200+ lines inline HTML.

**Recommended:** Split into `server/services/reports/`.

---

## Area 7: Route Consolidation (Priority: LOW)

**Current:** 17 route files with some minimal content.

**Recommended:** Consolidate to ~10 domain-focused route files.

---

## Area 8: Type Safety Improvements (Priority: LOW-MEDIUM)

**Recommended:**
- Create shared error types
- Create API response types
- Stricter typing in API functions
- Reusable form validation schemas
