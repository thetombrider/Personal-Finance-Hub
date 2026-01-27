# Resolution Guide: Date Formatting

**Priority:** Low | **Effort:** Low | **Impact:** Consistent date display across the app

---

## Problem Summary

Multiple date formats used inconsistently:
- `"dd/MM/yyyy"` - Most tables
- `"MMM d, yyyy"` - TransactionsTable
- `"dd MMM yyyy"` - ManageAccounts
- `"dd MMMM yyyy"` - PlannedTransactionsTable
- `"yyyy-MM-dd"` - Exports, API

---

## Resolution Steps

### Step 1: Create Date Formatting Utilities

**File:** `client/src/lib/dateFormatters.ts`

```typescript
import { format, parseISO } from "date-fns";

export const dateFormats = {
  short: "dd/MM/yyyy",           // 27/01/2026
  medium: "MMM d, yyyy",         // Jan 27, 2026
  long: "dd MMMM yyyy",          // 27 January 2026
  dateTime: "dd/MM/yyyy HH:mm",  // 27/01/2026 14:30
  iso: "yyyy-MM-dd",             // 2026-01-27
  isoDateTime: "yyyy-MM-dd'T'HH:mm:ss",
  monthYear: "MMMM yyyy",        // January 2026
} as const;

export type DateFormatKey = keyof typeof dateFormats;

export function formatDate(date: Date | string, formatKey: DateFormatKey = "short"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, dateFormats[formatKey]);
}

export function formatForApi(date: Date): string {
  return format(date, dateFormats.iso);
}

export function formatForDisplay(date: Date | string): string {
  return formatDate(date, "short");
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, "dateTime");
}
```

### Step 2: Update Components

**Before:**
```typescript
import { format } from "date-fns";
format(date, "dd/MM/yyyy")
```

**After:**
```typescript
import { formatDate, formatForApi } from "@/lib/dateFormatters";
formatDate(date, "short")
// or for API calls:
formatForApi(date)
```

---

## Files to Update

| File | Current Format |
|------|----------------|
| `TransactionsTable.tsx` | `"MMM d, yyyy"` |
| `ManageAccounts.tsx` | `"dd MMM yyyy"` |
| `PlannedTransactionsTable.tsx` | `"dd MMMM yyyy"` |
| All export functions | `"yyyy-MM-dd"` |

---

## Verification

```bash
grep -rn "format(.*\"" client/src --include="*.tsx" | grep -v "dateFormatters"
npm run check
```

## Checklist
- [ ] Created `client/src/lib/dateFormatters.ts`
- [ ] Updated TransactionsTable.tsx
- [ ] Updated ManageAccounts.tsx
- [ ] Updated PlannedTransactionsTable.tsx
- [ ] Updated export functions
- [ ] Verified consistent display across app
