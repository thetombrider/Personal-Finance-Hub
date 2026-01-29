import type { Express } from "express";
import { storage } from "../storage";
import { ReportService } from "../services/reports";
import { marketDataService } from "../services/marketData";
import { insertMonthlyBudgetSchema, insertRecurringExpenseSchema, insertPlannedExpenseSchema } from "@shared/schema";
import { z } from "zod";
import { parseNumericParam, checkOwnership } from "./middleware";
import { logger } from "../lib/logger";
import "./types";

export function registerBudgetRoutes(app: Express) {
    // ============ BUDGET ============

    const reportService = new ReportService(storage, marketDataService);

    app.get("/api/budget/:year", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const year = parseNumericParam(req.params.year);
            if (year === null) return res.status(400).json({ error: "Invalid year" });

            const [categories, monthlyBudgets, plannedExpenses, recurringExpenses] = await Promise.all([
                storage.getCategories(req.user.id),
                storage.getMonthlyBudgetsByYear(req.user.id, year),
                storage.getPlannedExpensesByYear(req.user.id, year),
                storage.getActiveRecurringExpenses(req.user.id)
            ]);

            // Filter recurring expenses to exclude those starting in future years
            const filteredRecurringExpenses = recurringExpenses.filter(e => {
                const startYear = new Date(e.startDate).getFullYear();
                return startYear <= year;
            });

            // Filter out transfer categories from budget calculations
            const budgetCategories = categories.filter(c => c.type !== 'transfer');

            // Initialize response structure
            const budgetData: Record<number, Record<number, { baseline: number; planned: number; recurring: number; total: number }>> = {};

            budgetCategories.forEach(cat => {
                budgetData[cat.id] = {};
                for (let m = 1; m <= 12; m++) {
                    budgetData[cat.id][m] = { baseline: 0, planned: 0, recurring: 0, total: 0 };
                }
            });

            monthlyBudgets.forEach(mb => {
                if (budgetData[mb.categoryId] && budgetData[mb.categoryId][mb.month]) {
                    budgetData[mb.categoryId][mb.month].baseline = parseFloat(mb.amount.toString());
                }
            });

            plannedExpenses.forEach(pe => {
                const date = new Date(pe.date);
                if (date.getFullYear() === year) {
                    const m = date.getMonth() + 1;
                    if (budgetData[pe.categoryId] && budgetData[pe.categoryId][m]) {
                        budgetData[pe.categoryId][m].planned += parseFloat(pe.amount.toString());
                    }
                }
            });

            recurringExpenses.forEach(re => {
                const startDate = new Date(re.startDate);
                const startYear = startDate.getFullYear();
                const startMonth = startDate.getMonth() + 1;

                for (let m = 1; m <= 12; m++) {
                    if (startYear < year || (startYear === year && startMonth <= m)) {
                        if (budgetData[re.categoryId]) {
                            budgetData[re.categoryId][m].recurring += parseFloat(re.amount.toString());
                        }
                    }
                }
            });

            for (const catId in budgetData) {
                for (let m = 1; m <= 12; m++) {
                    const cell = budgetData[catId][m];
                    cell.total = cell.baseline + cell.planned + cell.recurring;
                }
            }

            res.json({
                categories: budgetCategories,
                budgetData,
                plannedExpenses,
                recurringExpenses: filteredRecurringExpenses
            });
        } catch (error) {
            logger.api.error("Failed to fetch yearly budget data:", error);
            res.status(500).json({ error: "Failed to fetch yearly budget data" });
        }
    });

    app.get("/api/budget/:year/:month", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const year = parseNumericParam(req.params.year);
            const month = parseNumericParam(req.params.month);
            if (year === null || month === null) return res.status(400).json({ error: "Invalid year or month" });

            const budgetData = await reportService.getMonthlyBudget(req.user.id, year, month);
            res.json(budgetData);
        } catch (error) {
            logger.api.error("Failed to fetch budget data:", error);
            res.status(500).json({ error: "Failed to fetch budget data" });
        }
    });

    app.post("/api/budget", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const validated = insertMonthlyBudgetSchema.parse(req.body);
            // Authorization: upsertMonthlyBudget validates category ownership
            const budget = await storage.upsertMonthlyBudget(req.user.id, validated);
            res.json(budget);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            if (error instanceof Error && error.message.startsWith('Authorization failed')) {
                return res.status(403).json({ error: error.message });
            }
            logger.api.error("Failed to save monthly budget:", error);
            res.status(500).json({ error: "Failed to save monthly budget" });
        }
    });

    // Recurring Expenses
    app.get("/api/budget/recurring", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const expenses = await storage.getRecurringExpenses(req.user.id);
            res.json(expenses);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch recurring expenses" });
        }
    });

    app.post("/api/budget/recurring", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });


            const validated = insertRecurringExpenseSchema.parse(req.body);

            // Verify account ownership
            const account = await storage.getAccount(validated.accountId);
            if (!account || !checkOwnership(account.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const expense = await storage.createRecurringExpense(validated);
            res.status(201).json(expense);
        } catch (error) {
            logger.api.error("Error creating recurring expense:", error);
            if (error instanceof z.ZodError) {
                logger.api.error("Validation errors:", JSON.stringify(error.errors, null, 2));
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create recurring expense" });
        }
    });

    app.patch("/api/budget/recurring/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const validated = insertRecurringExpenseSchema.partial().parse(req.body);

            // Verify ownership of new relations if updated
            if (validated.accountId) {
                const account = await storage.getAccount(validated.accountId);
                if (!account || !checkOwnership(account.userId, req.user.id)) {
                    return res.status(403).json({ error: "Forbidden: Account ownership verification failed" });
                }
            }
            if (validated.categoryId) {
                const category = await storage.getCategory(validated.categoryId);
                if (!category || !checkOwnership(category.userId, req.user.id)) {
                    return res.status(403).json({ error: "Forbidden: Category ownership verification failed" });
                }
            }
            // Ownership check built into updateRecurringExpense
            const expense = await storage.updateRecurringExpense(id, req.user.id, validated);
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
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            // Ownership check built into deleteRecurringExpense
            const deleted = await storage.deleteRecurringExpense(id, req.user.id);
            if (!deleted) {
                return res.status(404).json({ error: "Recurring expense not found" });
            }
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete recurring expense" });
        }
    });

    // Planned Expenses
    app.get("/api/budget/planned/:year/:month", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const year = parseNumericParam(req.params.year);
            const month = parseNumericParam(req.params.month);
            if (year === null || month === null) return res.status(400).json({ error: "Invalid year or month" });

            const expenses = await storage.getPlannedExpenses(req.user.id, year, month);
            res.json(expenses);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch planned expenses" });
        }
    });

    app.post("/api/budget/planned", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const validated = insertPlannedExpenseSchema.parse(req.body);

            // Verify category ownership
            const category = await storage.getCategory(validated.categoryId);
            if (!category || !checkOwnership(category.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

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
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const validated = insertPlannedExpenseSchema.partial().parse(req.body);

            // Verify ownership of new category if updated
            if (validated.categoryId) {
                const category = await storage.getCategory(validated.categoryId);
                if (!category || !checkOwnership(category.userId, req.user.id)) {
                    return res.status(403).json({ error: "Forbidden: Category ownership verification failed" });
                }
            }
            // Ownership check built into updatePlannedExpense
            const expense = await storage.updatePlannedExpense(id, req.user.id, validated);
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
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            // Ownership check built into deletePlannedExpense
            const deleted = await storage.deletePlannedExpense(id, req.user.id);
            if (!deleted) {
                return res.status(404).json({ error: "Planned expense not found" });
            }
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete planned expense" });
        }
    });
}

