import type { Express } from "express";
import { tagRepository } from "../repositories/tagRepository";
import { insertTagSchema } from "@shared/schema";
import { z } from "zod";
import { parseNumericParam, checkOwnership } from "./middleware";

import { TransactionRepository } from "../repositories/transactionRepository";

const transactionRepository = new TransactionRepository();

const batchOperationSchema = z.object({
    transactionIds: z.array(z.number()),
    tagIds: z.array(z.number())
});

export function registerTagRoutes(app: Express) {
    // ============ TAGS ============

    // Get all tags for the authenticated user
    app.get("/api/tags", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const tags = await tagRepository.getTags(req.user.id);
            res.json(tags);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch tags" });
        }
    });

    // Create a new tag
    app.post("/api/tags", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const validated = insertTagSchema.parse({ ...req.body, userId: req.user.id });

            const tag = await tagRepository.createTag(validated);
            res.status(201).json(tag);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            // Handle unique constraint violation gracefully if possible, or generic error
            console.error(error);
            res.status(500).json({ error: "Failed to create tag" });
        }
    });

    // Update a tag
    app.patch("/api/tags/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const existing = await tagRepository.getTag(id);
            if (!existing) {
                return res.status(404).json({ error: "Tag not found" });
            }
            if (!checkOwnership(existing.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            // Exclude userId to prevent ownership mutation
            const { userId: _, ...bodyWithoutUserId } = req.body;
            const validated = insertTagSchema.partial().parse(bodyWithoutUserId);

            const updatedTag = await tagRepository.updateTag(id, validated);
            res.json(updatedTag);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to update tag" });
        }
    });

    // Delete a tag
    app.delete("/api/tags/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const existing = await tagRepository.getTag(id);
            if (!existing) {
                return res.status(404).json({ error: "Tag not found" });
            }
            if (!checkOwnership(existing.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            await tagRepository.deleteTag(id, req.user.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete tag" });
        }
    });

    // Sync tags for a specific transaction (Replace All)
    // Usage: POST /api/transactions/:id/tags body: { tagIds: [1, 2, 3] }
    app.post("/api/transactions/:id/tags", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const transactionId = parseNumericParam(req.params.id);
            if (transactionId === null) return res.status(400).json({ error: "Invalid transaction id" });

            // Security check: Transaction Ownership
            const transactions = await transactionRepository.getTransactionsWithUsers([transactionId]);
            if (transactions.length === 0) {
                return res.status(404).json({ error: "Transaction not found" });
            }
            if (transactions[0].userId !== req.user.id) {
                return res.status(403).json({ error: "Transaction does not belong to you" });
            }

            const { tagIds } = z.object({ tagIds: z.array(z.number()) }).parse(req.body);

            // Security: Verify tags belong to user
            const userTags = await tagRepository.getTags(req.user.id);
            const userTagIds = new Set(userTags.map(t => t.id));
            const allValid = tagIds.every(id => userTagIds.has(id));

            if (!allValid) {
                return res.status(403).json({ error: "One or more tags do not belong to you or do not exist" });
            }

            await tagRepository.updateTransactionTags(transactionId, tagIds);
            res.status(200).json({ success: true });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error(error);
            res.status(500).json({ error: "Failed to update transaction tags" });
        }
    });

    // Batch Add Tags
    app.post("/api/tags/batch", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const { transactionIds, tagIds } = batchOperationSchema.parse(req.body);

            // Security: Verify tags belong to user
            const userTags = await tagRepository.getTags(req.user.id);
            const userTagIds = new Set(userTags.map(t => t.id));
            if (!tagIds.every(id => userTagIds.has(id))) {
                return res.status(403).json({ error: "One or more tags do not belong to you or do not exist" });
            }

            // Security: Verify transaction ownership
            const transactions = await transactionRepository.getTransactionsWithUsers(transactionIds);
            // Ensure we found all transactions (optional strictness: or just process found ones?)
            // If length differs, some IDs don't exist.
            // But critical check is: do all found ones belong to user?
            // AND ensure we cover the requested IDs if we want strict mode.
            // Simple check: iterate transactions and check userId.
            const allOwned = transactions.every(t => t.userId === req.user!.id);
            if (!allOwned || transactions.length !== transactionIds.length) {
                // If length mismatch, implies not found or duplicates (but we passed array).
                // Let's assume strict: if any not found or not owned, fail.
                return res.status(403).json({ error: "One or more transactions do not belong to you" });
            }

            await tagRepository.addTagsToTransactions(transactionIds, tagIds);
            res.status(200).json({ success: true });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to batch add tags" });
        }
    });

    // Batch Remove Tags (Method: POST to allow body reliably)
    app.post("/api/tags/batch-delete", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const { transactionIds, tagIds } = batchOperationSchema.parse(req.body);

            // Security: Verify tags belong to user
            const userTags = await tagRepository.getTags(req.user.id);
            const userTagIds = new Set(userTags.map(t => t.id));
            if (!tagIds.every(id => userTagIds.has(id))) {
                return res.status(403).json({ error: "One or more tags do not belong to you or do not exist" });
            }

            // Security: Verify transaction ownership
            const transactions = await transactionRepository.getTransactionsWithUsers(transactionIds);
            const allOwned = transactions.every(t => t.userId === req.user!.id);
            if (!allOwned || transactions.length !== transactionIds.length) {
                return res.status(403).json({ error: "One or more transactions do not belong to you" });
            }

            await tagRepository.removeTagsFromTransactions(transactionIds, tagIds);
            res.status(200).json({ success: true });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to batch remove tags" });
        }
    });

}
