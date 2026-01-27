# Resolution Guide: Toast Patterns

**Priority:** Low | **Effort:** Low | **Impact:** Consistent user feedback

---

## Problem Summary

- **90+ toast calls** with inconsistent patterns
- Different property order and title conventions
- No standardized success/error patterns

---

## Current Issues

```typescript
// Inconsistent patterns
toast({ title: "Webhook deleted" });
toast({ title: "Error", description: error.message, variant: "destructive" });
toast({ variant: "destructive", title: "Failed to link" });
```

---

## Resolution Steps

### Step 1: Create Toast Helpers

**File:** `client/src/lib/toastHelpers.ts`

```typescript
import type { Toast } from "@/hooks/use-toast";

type ToastFn = (props: Toast) => void;

export const showSuccess = (toast: ToastFn, title: string, description?: string) => {
  toast({ title, description });
};

export const showError = (toast: ToastFn, title: string, description?: string) => {
  toast({ title, description, variant: "destructive" });
};

export const showWarning = (toast: ToastFn, title: string, description?: string) => {
  toast({ title, description, variant: "destructive" });
};

// CRUD operation helpers
export const toastPatterns = {
  created: (toast: ToastFn, resource: string) => showSuccess(toast, `${resource} created`),
  updated: (toast: ToastFn, resource: string) => showSuccess(toast, `${resource} updated`),
  deleted: (toast: ToastFn, resource: string) => showSuccess(toast, `${resource} deleted`),
  saved: (toast: ToastFn, resource: string) => showSuccess(toast, `${resource} saved`),
  failed: (toast: ToastFn, action: string, error?: string) => 
    showError(toast, `Failed to ${action}`, error),
};
```

### Step 2: Update Components

**Before:**
```typescript
toast({ title: "Transaction created" });
toast({ title: "Error", description: error.message, variant: "destructive" });
```

**After:**
```typescript
import { toastPatterns, showError } from "@/lib/toastHelpers";

toastPatterns.created(toast, "Transaction");
showError(toast, "Failed to create transaction", getErrorMessage(error));
```

---

## Common Patterns Reference

```typescript
// Success patterns
toastPatterns.created(toast, "Account");
toastPatterns.updated(toast, "Budget");
toastPatterns.deleted(toast, "Category");
toastPatterns.saved(toast, "Settings");

// Error patterns
toastPatterns.failed(toast, "save settings", error.message);
showError(toast, "Connection failed", "Please try again");

// Custom success
showSuccess(toast, "Import complete", "15 transactions imported");
```

---

## Verification

```bash
grep -rn "toast({" client/src --include="*.tsx" | head -20
npm run check
```

## Checklist
- [ ] Created `client/src/lib/toastHelpers.ts`
- [ ] Updated high-traffic components first
- [ ] Consistent title casing (Title Case)
- [ ] Verified build passes
