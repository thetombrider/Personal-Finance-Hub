import type { Express } from "express";
import { storage } from "../storage";
import { insertTransactionSchema } from "@shared/schema";
import { z } from "zod";
import { parseNumericParam, checkOwnership } from "./middleware";
import "./types";

export function registerTransactionRoutes(app: Express) {
    // ============ TRANSACTIONS ============

    app.get("/api/transactions", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const transactions = await storage.getTransactions(req.user.id);
            res.json(transactions);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch transactions" });
        }
    });

    // ============ STAGING ============

    app.get("/api/transactions/staging", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            let accountId: number | undefined;
            if (req.query.accountId) {
                const parsed = parseNumericParam(req.query.accountId as string);
                if (parsed === null) {
                    return res.status(400).json({ error: "Invalid accountId" });
                }
                accountId = parsed;
            }

            const status = req.query.status as string; // 'pending', 'dismissed', 'reconciled', or 'all'
            const staged = await storage.getImportStaging(req.user.id, accountId);

            let filtered = staged;
            if (status && status !== 'all') {
                filtered = staged.filter(s => s.status === status);
            } else if (!status) {
                // Default to 'pending' if no status specified, for backward compatibility
                // But the requirement says "unified staging transactions review table... will show all transactions"
                // For the new UI we will pass status='all' or specific status.
                // Existing calls might rely on 'pending' default.
                filtered = staged.filter(s => s.status === 'pending');
            }

            // Sort by date desc
            filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            res.json(filtered);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch staged transactions" });
        }
    });

    app.post("/api/transactions/staging/:id/approve", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const { categoryId, description, date, amount } = req.body;

            // 1. Get staged
            const allStaged = await storage.getImportStaging(req.user.id);
            const staged = allStaged.find(s => s.id === id);

            if (!staged) {
                return res.status(404).json({ error: "Staged transaction not found" });
            }

            if (categoryId === undefined || categoryId === null) {
                return res.status(400).json({ error: "Missing categoryId" });
            }

            const parsedCategoryId = parseInt(categoryId);
            if (isNaN(parsedCategoryId) || !Number.isInteger(parsedCategoryId)) {
                return res.status(400).json({ error: "Invalid categoryId" });
            }

            // 2. Create Transaction
            const finalAmount = amount !== undefined ? amount : staged.amount;
            const finalDate = date || staged.date;
            const finalDesc = description || staged.description;

            const numAmount = parseFloat(finalAmount.toString());
            // Validate numAmount is a valid number
            if (!Number.isFinite(numAmount)) {
                return res.status(400).json({ error: "Invalid amount" });
            }

            const type = numAmount < 0 ? "expense" : "income";
            const absAmount = Math.abs(numAmount).toFixed(2);

            const transaction = await storage.createTransaction({
                accountId: staged.accountId,
                date: finalDate,
                amount: absAmount,
                description: finalDesc,
                categoryId: parsedCategoryId,
                type: type,
                externalId: staged.externalId,
            });

            // 3. Update staging status
            await storage.updateImportStagingStatus(id, req.user.id, "reconciled");

            res.status(201).json(transaction);
        } catch (error) {
            console.error("Approve error:", error);
            res.status(500).json({ error: "Failed to approve transaction" });
        }
    });

    app.delete("/api/transactions/staging/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            // Verify ownership - get staging record and check it belongs to user
            const allStaged = await storage.getImportStaging(req.user.id);
            const staged = allStaged.find(s => s.id === id);
            if (!staged) {
                return res.status(404).json({ error: "Staged transaction not found" });
            }

            await storage.updateImportStagingStatus(id, req.user.id, "dismissed");
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete staged transaction" });
        }
    });

    app.get("/api/transactions/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const transaction = await storage.getTransaction(id);
            if (!transaction) {
                return res.status(404).json({ error: "Transaction not found" });
            }

            // Check ownership via account
            const account = await storage.getAccount(transaction.accountId);
            if (!account || !checkOwnership(account.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            res.json(transaction);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch transaction" });
        }
    });

    app.post("/api/transactions", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const validated = insertTransactionSchema.parse(req.body);

            // Verify account belongs to user
            // Verify account belongs to user
            const account = await storage.getAccount(validated.accountId);
            if (!account) {
                return res.status(400).json({ error: "Account not found" });
            }
            if (!checkOwnership(account.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const transaction = await storage.createTransaction(validated);
            res.status(201).json(transaction);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create transaction" });
        }
    });

    app.post("/api/transactions/bulk", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const validated = z.array(insertTransactionSchema).parse(req.body);

            // Verify all accounts belong to user
            const accountIds = Array.from(new Set(validated.map(t => t.accountId)));
            for (const accountId of accountIds) {
                const account = await storage.getAccount(accountId);
                if (!account || !checkOwnership(account.userId, req.user.id)) {
                    return res.status(403).json({ error: "Forbidden: One or more accounts not owned by user" });
                }
            }

            const transactions = await storage.createTransactions(validated);
            res.status(201).json(transactions);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create transactions" });
        }
    });

    app.patch("/api/transactions/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const existing = await storage.getTransaction(id);
            if (!existing) {
                return res.status(404).json({ error: "Transaction not found" });
            }

            const account = await storage.getAccount(existing.accountId);
            if (!account || !checkOwnership(account.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const validated = insertTransactionSchema.partial().parse(req.body);
            const transaction = await storage.updateTransaction(id, validated);
            res.json(transaction);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to update transaction" });
        }
    });

    app.delete("/api/transactions/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const existing = await storage.getTransaction(id);
            if (!existing) {
                return res.status(404).json({ error: "Transaction not found" });
            }

            const account = await storage.getAccount(existing.accountId);
            if (!account || !checkOwnership(account.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            await storage.deleteTransaction(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete transaction" });
        }
    });

    app.post("/api/transactions/bulk-delete", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);

            // Verify ownership of all transactions
            for (const id of ids) {
                const transaction = await storage.getTransaction(id);
                if (!transaction) continue;
                const account = await storage.getAccount(transaction.accountId);
                if (!account || !checkOwnership(account.userId, req.user.id)) {
                    return res.status(403).json({ error: "Forbidden: Cannot delete transactions you don't own" });
                }
            }

            await storage.deleteTransactions(ids);
            res.status(204).send();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to delete transactions" });
        }
    });

    // Clear all transactions for the AUTHENTICATED USER only
    app.delete("/api/transactions", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            await storage.clearTransactionsForUser(req.user.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to clear transactions" });
        }
    });
}

