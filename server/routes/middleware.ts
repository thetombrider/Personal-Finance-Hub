/**
 * Shared middleware for route handlers
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import "../express.d"; // Import Express type augmentation

/**
 * Middleware that requires authentication.
 * Returns 401 if req.user is missing or has no id.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    if (!req.user?.id) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    next();
}

/**
 * Validates a numeric parameter from req.params.
 * Returns the parsed integer or null if invalid.
 */
export function parseNumericParam(value: string | undefined): number | null {
    if (!value) return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
}

/**
 * Middleware factory that validates a numeric route parameter.
 * Returns a middleware that sets req.params[paramName] to validated value or returns 400.
 */
export function validateNumericParam(paramName: string): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        const parsed = parseNumericParam(req.params[paramName]);
        if (parsed === null) {
            res.status(400).json({ error: `Invalid ${paramName}` });
            return;
        }
        next();
    };
}

/**
 * Checks if the authenticated user owns a resource.
 * Returns true if ownership matches, false otherwise.
 * 
 * @param resourceUserId - The userId from the resource (accounts, categories, etc.)
 * @param reqUserId - The userId from the authenticated request
 */
export function checkOwnership(resourceUserId: string | null | undefined, reqUserId: string): boolean {
    return resourceUserId === reqUserId;
}

