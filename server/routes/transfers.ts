import type { Express } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { checkOwnership } from "./middleware";
import { logger } from "../lib/logger";
import "./types";

export function registerTransferRoutes(app: Express) {
    // ============ TRANSFERS ============

    const transferSchema = z.object({
        date: z.string(),
        amount: z.string(),
        description: z.string(),
        fromAccountId: z.number(),
        toAccountId: z.number(),
        categoryId: z.number(),
    });

    app.post("/api/transfers", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const validated = transferSchema.parse(req.body);
            if (validated.fromAccountId === validated.toAccountId) {
                return res.status(400).json({ error: "Source and destination accounts must be different" });
            }

            // Verify ownership of both accounts
            const fromAccount = await storage.getAccount(validated.fromAccountId);
            const toAccount = await storage.getAccount(validated.toAccountId);

            if (!fromAccount || !checkOwnership(fromAccount.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden: Source account not owned by user" });
            }
            if (!toAccount || !checkOwnership(toAccount.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden: Destination account not owned by user" });
            }

            const result = await storage.createTransfer(validated);
            res.status(201).json(result);
        } catch (error) {

            if (error instanceof z.ZodError) {
                logger.transfers.error("Transfer validation error:", error.errors);
                return res.status(400).json({ error: error.errors });
            }
            logger.transfers.error("Failed to create transfer:", error);
            res.status(500).json({ error: "Failed to create transfer" });
        }
    });
}

