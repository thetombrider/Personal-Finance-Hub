import type { Express } from "express";
import { storage } from "../storage";
import { insertTradeSchema } from "@shared/schema";
import { z } from "zod";
import { parseNumericParam, checkOwnership } from "./middleware";
import "./types";

export function registerTradeRoutes(app: Express) {
    // ============ TRADES ============

    app.get("/api/trades", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const trades = await storage.getTrades(req.user.id);
            res.json(trades);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch trades" });
        }
    });

    app.get("/api/trades/holding/:holdingId", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const holdingId = parseNumericParam(req.params.holdingId);
            if (holdingId === null) return res.status(400).json({ error: "Invalid holdingId" });

            // Ownership check built into getHolding
            const holding = await storage.getHolding(holdingId, req.user.id);
            if (!holding) {
                return res.status(404).json({ error: "Holding not found" });
            }

            const trades = await storage.getTradesByHolding(holdingId);
            res.json(trades);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch trades for holding" });
        }
    });

    app.get("/api/trades/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const trade = await storage.getTrade(id);
            if (!trade) {
                return res.status(404).json({ error: "Trade not found" });
            }

            // Check ownership via holding (with ownership check built in)
            const holding = await storage.getHolding(trade.holdingId, req.user.id);
            if (!holding) {
                return res.status(403).json({ error: "Forbidden" });
            }

            res.json(trade);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch trade" });
        }
    });

    app.post("/api/trades", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const validated = insertTradeSchema.parse(req.body);

            // Ownership check built into getHolding
            const holding = await storage.getHolding(validated.holdingId, req.user.id);
            if (!holding) {
                return res.status(403).json({ error: "Holding not found or not owned by user" });
            }

            const trade = await storage.createTrade(validated);
            res.status(201).json(trade);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create trade" });
        }
    });

    app.post("/api/trades/bulk", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const tradesData = req.body;
            if (!Array.isArray(tradesData)) {
                return res.status(400).json({ error: "Expected an array of trades" });
            }

            const validatedTrades = tradesData.map(t => insertTradeSchema.parse(t));

            // Verify all holdings belong to user (ownership check built into getHolding)
            const holdingIds = Array.from(new Set(validatedTrades.map(t => t.holdingId)));
            for (const holdingId of holdingIds) {
                const holding = await storage.getHolding(holdingId, req.user.id);
                if (!holding) {
                    return res.status(403).json({ error: "Forbidden: One or more holdings not owned by user" });
                }
            }

            const trades = await storage.createTrades(validatedTrades);
            res.status(201).json(trades);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error("Failed to create trades:", error);
            res.status(500).json({ error: "Failed to create trades" });
        }
    });

    app.patch("/api/trades/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const existing = await storage.getTrade(id);
            if (!existing) {
                return res.status(404).json({ error: "Trade not found" });
            }

            // Check ownership via holding (ownership check built in)
            const holding = await storage.getHolding(existing.holdingId, req.user.id);
            if (!holding) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const validated = insertTradeSchema.partial().parse(req.body);
            const trade = await storage.updateTrade(id, validated);
            res.json(trade);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to update trade" });
        }
    });

    app.delete("/api/trades/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const existing = await storage.getTrade(id);
            if (!existing) {
                return res.status(404).json({ error: "Trade not found" });
            }
            // Ownership check built into getHolding
            const holding = await storage.getHolding(existing.holdingId, req.user.id);
            if (!holding) {
                return res.status(403).json({ error: "Forbidden" });
            }

            await storage.deleteTrade(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete trade" });
        }
    });

    app.post("/api/trades/bulk-delete", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);

            // Verify ownership of all trades (ownership check built into getHolding)
            for (const id of ids) {
                const trade = await storage.getTrade(id);
                if (!trade) continue; // Skip non-existent, they won't be deleted anyway
                const holding = await storage.getHolding(trade.holdingId, req.user.id);
                if (!holding) {
                    return res.status(403).json({ error: "Forbidden: Cannot delete trades you don't own" });
                }
            }

            await storage.deleteTrades(ids);
            res.status(204).send();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to delete trades" });
        }
    });
}

