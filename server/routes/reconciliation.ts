import type { Express } from "express";
import { storage } from "../storage";
import { reconciliationService } from "../services/reconciliation";
import "./types";

export function registerReconciliationRoutes(app: Express) {
    // ============ RECONCILIATION ============

    app.post("/api/reconciliation/check", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const { year, month } = req.body;
            if (!year || !month) return res.status(400).json({ error: "Year and month required" });

            const parsedYear = parseInt(year);
            const parsedMonth = parseInt(month);

            if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
                return res.status(400).json({ error: "Invalid year or month" });
            }

            await reconciliationService.checkRecurringExpenses(req.user.id, parsedYear, parsedMonth);
            res.json({ success: true });
        } catch (error) {
            console.error("Reconciliation check error:", error);
            res.status(500).json({ error: "Failed to run reconciliation check" });
        }
    });

    app.get("/api/reconciliation/status", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const year = parseInt(req.query.year as string);
            const month = parseInt(req.query.month as string);

            if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
                return res.status(400).json({ error: "Invalid year or month" });
            }

            const checks = await storage.getRecurringExpenseChecks(req.user.id, year, month);
            res.json(checks);
        } catch (error) {
            console.error("Reconciliation status error:", error);
            res.status(500).json({ error: "Failed to fetch reconciliation status" });
        }
    });

    app.get("/api/reconciliation/checks", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const checks = await storage.getAllRecurringExpenseChecks(req.user.id);
            res.json(checks);
        } catch (error) {
            console.error("Fetch all checks error:", error);
            res.status(500).json({ error: "Failed to fetch checks" });
        }
    });
}

