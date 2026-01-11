import type { Express } from "express";
import { setupAuth } from "../auth";

export function registerAuthRoutes(app: Express) {
    // ============ AUTH ============
    setupAuth(app);

    // endpoint for backward compatibility or if frontend expects this path
    app.get('/api/auth/user', (req, res, next) => {
        if (req.isAuthenticated()) {
            return next();
        }
        res.status(401).json({ message: "Unauthorized" });
    }, (req, res) => {
        res.json(req.user);
    });

    // Global API authentication middleware
    app.use('/api', (req, res, next) => {
        // Exempt routes
        if (req.path.startsWith('/webhooks')) {
            return next();
        }

        // Allow login/register/logout endpoints to pass through
        // Note: req.path is relative to the mount point '/api', so we check for '/auth', '/login', etc.
        // However, passport routes are usually mounted at root or handled before this if properly ordered.
        // In the original code, this middleware was placed after setupAuth.

        // If request is authenticated, proceed
        if (req.isAuthenticated()) {
            return next();
        }

        // Explicit exemptions for auth-related paths if they under /api
        if (req.path.startsWith('/auth') || req.path === '/login' || req.path === '/register' || req.path === '/user') {
            return next();
        }

        res.status(401).json({ message: "Unauthorized" });
    });
}
