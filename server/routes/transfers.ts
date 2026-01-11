import type { Express } from "express";
import { storage } from "../storage";
import { z } from "zod";

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
            const validated = transferSchema.parse(req.body);
            if (validated.fromAccountId === validated.toAccountId) {
                return res.status(400).json({ error: "Source and destination accounts must be different" });
            }
            const result = await storage.createTransfer(validated);
            res.status(201).json(result);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create transfer" });
        }
    });
}
