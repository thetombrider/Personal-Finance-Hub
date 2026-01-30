import type { Response } from "express";

export function errorResponse(res: Response, status: number, message: string, details?: unknown) {
    const body: { error: string; details?: unknown } = { error: message };
    if (details !== undefined) {
        body.details = details;
    }
    res.status(status).json(body);
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
