import type { Express } from "express";
import { storage } from "../storage";
import { ReportService } from "../services/reportService";
import { marketDataService } from "../services/marketData";
import { insertMonthlyBudgetSchema, insertRecurringExpenseSchema, insertPlannedExpenseSchema } from "@shared/schema";
import { z } from "zod";

export function registerBudgetRoutes(app: Express) {
    // ============ BUDGET ============

    const reportService = new ReportService(storage, marketDataService);

    app.get("/api/budget/:year", async (req, res) => {
        try {
            const year = parseInt(req.params.year);

            const [categories, monthlyBudgets, plannedExpenses, recurringExpenses] = await Promise.all([
                storage.getCategories((req.user as any).id),
                storage.getMonthlyBudgetsByYear((req.user as any).id, year),
                storage.getPlannedExpensesByYear((req.user as any).id, year),
                storage.getActiveRecurringExpenses((req.user as any).id)
            ]);

            // Initialize response structure
            // budgetData: map of categoryId -> map of month (1-12) -> { baseline, planned, recurring, total }
            const budgetData: Record<number, Record<number, { baseline: number; planned: number; recurring: number; total: number }>> = {};

            // Initialize all categories and months with 0
            categories.forEach(cat => {
                budgetData[cat.id] = {};
                for (let m = 1; m <= 12; m++) {
                    budgetData[cat.id][m] = { baseline: 0, planned: 0, recurring: 0, total: 0 };
                }
            });

            // Fill Baselines
            monthlyBudgets.forEach(mb => {
                if (budgetData[mb.categoryId] && budgetData[mb.categoryId][mb.month]) {
                    budgetData[mb.categoryId][mb.month].baseline = parseFloat(mb.amount.toString());
                }
            });

            // Fill Planned
            plannedExpenses.forEach(pe => {
                const date = new Date(pe.date);
                // Ensure the date is in the requested year (should be filtered by DB but double check)
                if (date.getFullYear() === year) {
                    const m = date.getMonth() + 1;
                    if (budgetData[pe.categoryId] && budgetData[pe.categoryId][m]) {
                        budgetData[pe.categoryId][m].planned += parseFloat(pe.amount.toString());
                    }
                }
            });

            // Fill Recurring
            // Note: Recurring expenses are tricky because they might start/end mid-year.
            // Simple logic: If active and start_date <= month_end, add to month.
            // TODO: Handle end_date if implemented in schema later.
            recurringExpenses.forEach(re => {
                const startDate = new Date(re.startDate);
                const startYear = startDate.getFullYear();
                const startMonth = startDate.getMonth() + 1;

                for (let m = 1; m <= 12; m++) {
                    // If the recurring expense started before or during this month (considering years)
                    if (startYear < year || (startYear === year && startMonth <= m)) {
                        if (budgetData[re.categoryId]) {
                            budgetData[re.categoryId][m].recurring += parseFloat(re.amount.toString());
                        }
                    }
                }
            });

            // Calculate Totals per cell
            for (const catId in budgetData) {
                for (let m = 1; m <= 12; m++) {
                    const cell = budgetData[catId][m];
                    cell.total = cell.baseline + cell.planned + cell.recurring;
                }
            }

            res.json({
                categories,
                budgetData, // Structured as { [categoryId]: { [month]: { baseline, planned, recurring, total } } }
                plannedExpenses, // Return raw list for the Planned Table
                recurringExpenses // Return raw list for the Recurring Table
            });
        } catch (error) {
            console.error("Failed to fetch yearly budget data:", error);
            res.status(500).json({ error: "Failed to fetch yearly budget data" });
        }
    });

    app.get("/api/budget/:year/:month", async (req, res) => {
        try {
            const year = parseInt(req.params.year);
            const month = parseInt(req.params.month); // 1-12

            const budgetData = await reportService.getMonthlyBudget((req.user as any).id, year, month);
            res.json(budgetData);
        } catch (error) {
            console.error("Failed to fetch budget data:", error);
            res.status(500).json({ error: "Failed to fetch budget data" });
        }
    });

    app.post("/api/budget", async (req, res) => {
        try {
            const validated = insertMonthlyBudgetSchema.parse(req.body);
            const budget = await storage.upsertMonthlyBudget(validated);
            res.json(budget);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to save monthly budget" });
        }
    });

    // Recurring Expenses
    app.get("/api/budget/recurring", async (req, res) => {
        try {
            const expenses = await storage.getRecurringExpenses((req.user as any).id);
            res.json(expenses);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch recurring expenses" });
        }
    });

    app.post("/api/budget/recurring", async (req, res) => {
        try {
            console.log("Receiving recurring expense payload:", req.body);
            const validated = insertRecurringExpenseSchema.parse(req.body);
            const expense = await storage.createRecurringExpense(validated);
            res.status(201).json(expense);
        } catch (error) {
            console.error("Error creating recurring expense:", error);
            if (error instanceof z.ZodError) {
                console.error("Validation errors:", JSON.stringify(error.errors, null, 2));
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create recurring expense" });
        }
    });

    app.patch("/api/budget/recurring/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const validated = insertRecurringExpenseSchema.partial().parse(req.body);
            const expense = await storage.updateRecurringExpense(id, validated);
            if (!expense) {
                return res.status(404).json({ error: "Recurring expense not found" });
            }
            res.json(expense);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to update recurring expense" });
        }
    });

    app.delete("/api/budget/recurring/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await storage.deleteRecurringExpense(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete recurring expense" });
        }
    });

    // Planned Expenses
    app.get("/api/budget/planned/:year/:month", async (req, res) => {
        try {
            const year = parseInt(req.params.year);
            const month = parseInt(req.params.month);
            const expenses = await storage.getPlannedExpenses((req.user as any).id, year, month);
            res.json(expenses);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch planned expenses" });
        }
    });

    app.post("/api/budget/planned", async (req, res) => {
        try {
            const validated = insertPlannedExpenseSchema.parse(req.body);
            const expense = await storage.createPlannedExpense(validated);
            res.status(201).json(expense);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create planned expense" });
        }
    });

    app.patch("/api/budget/planned/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const validated = insertPlannedExpenseSchema.partial().parse(req.body);
            const expense = await storage.updatePlannedExpense(id, validated);
            if (!expense) {
                return res.status(404).json({ error: "Planned expense not found" });
            }
            res.json(expense);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to update planned expense" });
        }
    });

    app.delete("/api/budget/planned/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await storage.deletePlannedExpense(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete planned expense" });
        }
    });
}
