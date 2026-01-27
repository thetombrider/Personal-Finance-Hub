# Resolution Guide: Error Handling

**Priority:** Medium | **Effort:** Medium | **Impact:** Consistent error display, better debugging

---

## Problem Summary

### Client-Side Issues
- Inconsistent catch patterns: `catch (error)`, `catch (error: any)`, `catch (e)`
- Error message extraction varies across files

### Server-Side Issues
- Inconsistent response formats: `{ error: "..." }` vs `{ message: "..." }`

---

## Resolution Steps

### Step 1: Create Client Error Utilities

**File:** `client/src/lib/errors.ts`

```typescript
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "An unexpected error occurred";
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && error.message === "Failed to fetch";
}

export function isApiError(error: unknown): error is { status: number; message: string } {
  return error !== null && typeof error === "object" && "status" in error && "message" in error;
}
```

### Step 2: Create Server Response Helpers

**File:** `server/lib/responses.ts`

```typescript
import type { Response } from "express";

export function errorResponse(res: Response, status: number, message: string, details?: unknown) {
  res.status(status).json({ error: message, ...(details && { details }) });
}

export function validationError(res: Response, errors: unknown) {
  res.status(400).json({ error: "Validation failed", errors });
}

export function notFoundError(res: Response, resource: string) {
  res.status(404).json({ error: `${resource} not found` });
}

export function unauthorizedError(res: Response, message = "Unauthorized") {
  res.status(401).json({ error: message });
}

export function forbiddenError(res: Response, message = "Forbidden") {
  res.status(403).json({ error: message });
}
```

### Step 3: Update Components

**Before:**
```typescript
} catch (error: any) {
  toast({ title: "Error", description: error.message });
}
```

**After:**
```typescript
import { getErrorMessage } from "@/lib/errors";

} catch (error) {
  toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
}
```

---

## Files to Update

| File | Issue |
|------|-------|
| `Settings.tsx` | Uses `catch (error: any)` |
| `EmailReports.tsx` | Uses `catch (error: any)` |
| `bank-callback.tsx` | Uses `catch (error: any)` |
| `ImportTransactions.tsx` | Uses `catch (e)` |

---

## Verification

```bash
grep -rn "catch (error: any)" client/src --include="*.tsx"
grep -rn "catch (e)" client/src --include="*.tsx"
npm run check
```

## Checklist
- [ ] Created `client/src/lib/errors.ts`
- [ ] Created `server/lib/responses.ts`
- [ ] Updated all `catch (error: any)` patterns
- [ ] Updated all inconsistent variable names
- [ ] Verified build passes
