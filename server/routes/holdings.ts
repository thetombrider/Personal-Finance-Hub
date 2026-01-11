import type { Express } from "express";
import { storage } from "../storage";
import { insertHoldingSchema } from "@shared/schema";
import { z } from "zod";
import { parseNumericParam, checkOwnership } from "./middleware";
import "./types";

export function registerHoldingRoutes(app: Express) {
    // ============ HOLDINGS ============

    app.get("/api/holdings", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const holdings = await storage.getHoldings(req.user.id);
            res.json(holdings);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch holdings" });
        }
    });

    app.get("/api/holdings/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const holding = await storage.getHolding(id);
            if (!holding) {
                return res.status(404).json({ error: "Holding not found" });
            }

            if (!checkOwnership(holding.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            res.json(holding);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch holding" });
        }
    });

    app.post("/api/holdings", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const validated = insertHoldingSchema.parse({ ...req.body, userId: req.user.id });
            const existing = await storage.getHoldingByTicker(validated.ticker, req.user.id);
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
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const existing = await storage.getHolding(id);
            if (!existing) {
                return res.status(404).json({ error: "Holding not found" });
            }
            if (!checkOwnership(existing.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const { userId: _, ...bodyWithoutUserId } = req.body;
            const validated = insertHoldingSchema.partial().parse(bodyWithoutUserId);

            const holding = await storage.updateHolding(id, validated);
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
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const existing = await storage.getHolding(id);
            if (!existing) {
                return res.status(404).json({ error: "Holding not found" });
            }
            if (!checkOwnership(existing.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            await storage.deleteHolding(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete holding" });
        }
    });
}

