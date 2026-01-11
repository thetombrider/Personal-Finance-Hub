import type { Express } from "express";
import { storage } from "../storage";
import { insertTransactionSchema } from "@shared/schema";
import { z } from "zod";

export function registerTransactionRoutes(app: Express) {
    // ============ TRANSACTIONS ============

    app.get("/api/transactions", async (req, res) => {
        try {
            const transactions = await storage.getTransactions((req.user as any).id);
            res.json(transactions);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch transactions" });
        }
    });

    // ============ STAGING ============

    app.get("/api/transactions/staging", async (req, res) => {
        try {
            const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
            const staged = await storage.getImportStaging((req.user as any).id, accountId);
            res.json(staged);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch staged transactions" });
        }
    });

    app.post("/api/transactions/staging/:id/approve", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { categoryId, description, date, amount } = req.body; // Allow overrides

            // 1. Get staged
            const allStaged = await storage.getImportStaging((req.user as any).id);
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

            // 3. Delete from staging
            await storage.deleteImportStaging(id);

            res.status(201).json(transaction);
        } catch (error) {
            console.error("Approve error:", error);
            res.status(500).json({ error: "Failed to approve transaction" });
        }
    });

    app.delete("/api/transactions/staging/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await storage.deleteImportStaging(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete staged transaction" });
        }
    });

    app.get("/api/transactions/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const transaction = await storage.getTransaction(id);
            if (!transaction) {
                return res.status(404).json({ error: "Transaction not found" });
            }
            res.json(transaction);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch transaction" });
        }
    });

    app.post("/api/transactions", async (req, res) => {
        try {
            const validated = insertTransactionSchema.parse(req.body);
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
            const validated = z.array(insertTransactionSchema).parse(req.body);
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
            const id = parseInt(req.params.id);
            const validated = insertTransactionSchema.partial().parse(req.body);
            const transaction = await storage.updateTransaction(id, validated);
            if (!transaction) {
                return res.status(404).json({ error: "Transaction not found" });
            }
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
            const id = parseInt(req.params.id);
            await storage.deleteTransaction(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete transaction" });
        }
    });

    app.post("/api/transactions/bulk-delete", async (req, res) => {
        try {
            const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
            await storage.deleteTransactions(ids);
            res.status(204).send();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to delete transactions" });
        }
    });

    app.delete("/api/transactions", async (req, res) => {
        try {
            await storage.clearTransactions();
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to clear transactions" });
        }
    });
}
