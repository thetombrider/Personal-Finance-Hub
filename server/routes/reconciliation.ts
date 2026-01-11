import type { Express } from "express";
import { storage } from "../storage";
import { reconciliationService } from "../services/reconciliation";

export function registerReconciliationRoutes(app: Express) {
    // ============ RECONCILIATION ============

    app.post("/api/reconciliation/check", async (req, res) => {
        try {
            const { year, month } = req.body;
            if (!year || !month) return res.status(400).json({ error: "Year and month required" });

            await reconciliationService.checkRecurringExpenses((req.user as any).id, parseInt(year), parseInt(month));
            res.json({ success: true });
        } catch (error) {
            console.error("Reconciliation check error:", error);
            res.status(500).json({ error: "Failed to run reconciliation check" });
        }
    });

    app.get("/api/reconciliation/status", async (req, res) => {
        try {
            const year = parseInt(req.query.year as string);
            const month = parseInt(req.query.month as string);

            if (!year || !month) return res.status(400).json({ error: "Year and month required" });

            const checks = await storage.getRecurringExpenseChecks((req.user as any).id, year, month);
            res.json(checks);
        } catch (error) {
            console.error("Reconciliation status error:", error);
            res.status(500).json({ error: "Failed to fetch reconciliation status" });
        }
    });

    app.get("/api/reconciliation/checks", async (req, res) => {
        try {
            const checks = await storage.getAllRecurringExpenseChecks((req.user as any).id);
            res.json(checks);
        } catch (error) {
            console.error("Fetch all checks error:", error);
            res.status(500).json({ error: "Failed to fetch checks" });
        }
    });
}
