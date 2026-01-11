import type { Express } from "express";
import { storage } from "../storage";
import { insertHoldingSchema } from "@shared/schema";
import { z } from "zod";

export function registerHoldingRoutes(app: Express) {
    // ============ HOLDINGS ============

    app.get("/api/holdings", async (req, res) => {
        try {
            const holdings = await storage.getHoldings((req.user as any).id);
            res.json(holdings);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch holdings" });
        }
    });

    app.get("/api/holdings/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const holding = await storage.getHolding(id);
            if (!holding) {
                return res.status(404).json({ error: "Holding not found" });
            }
            res.json(holding);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch holding" });
        }
    });

    app.post("/api/holdings", async (req, res) => {
        try {
            const validated = insertHoldingSchema.parse({ ...req.body, userId: (req.user as any).id });
            const existing = await storage.getHoldingByTicker(validated.ticker, (req.user as any).id);
            if (existing) {
                return res.status(409).json({ error: "Holding with this ticker already exists", holding: existing });
            }
            const holding = await storage.createHolding(validated);
            res.status(201).json(holding);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create holding" });
        }
    });

    app.patch("/api/holdings/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const validated = insertHoldingSchema.partial().parse(req.body);
            const holding = await storage.updateHolding(id, validated);
            if (!holding) {
                return res.status(404).json({ error: "Holding not found" });
            }
            res.json(holding);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to update holding" });
        }
    });

    app.delete("/api/holdings/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await storage.deleteHolding(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete holding" });
        }
    });
}
