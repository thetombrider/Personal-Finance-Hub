import type { Express } from "express";
import { storage } from "../storage";
import { insertTradeSchema } from "@shared/schema";
import { z } from "zod";

export function registerTradeRoutes(app: Express) {
    // ============ TRADES ============

    app.get("/api/trades", async (req, res) => {
        try {
            const trades = await storage.getTrades((req.user as any).id);
            res.json(trades);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch trades" });
        }
    });

    app.get("/api/trades/holding/:holdingId", async (req, res) => {
        try {
            const holdingId = parseInt(req.params.holdingId);
            const trades = await storage.getTradesByHolding(holdingId);
            res.json(trades);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch trades for holding" });
        }
    });

    app.get("/api/trades/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const trade = await storage.getTrade(id);
            if (!trade) {
                return res.status(404).json({ error: "Trade not found" });
            }
            res.json(trade);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch trade" });
        }
    });

    app.post("/api/trades", async (req, res) => {
        try {
            const validated = insertTradeSchema.parse(req.body);
            const holding = await storage.getHolding(validated.holdingId);
            if (!holding) {
                return res.status(400).json({ error: "Holding not found" });
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
            const tradesData = req.body;
            if (!Array.isArray(tradesData)) {
                return res.status(400).json({ error: "Expected an array of trades" });
            }

            const validatedTrades = tradesData.map(t => insertTradeSchema.parse(t));
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
            const id = parseInt(req.params.id);
            const validated = insertTradeSchema.partial().parse(req.body);
            const trade = await storage.updateTrade(id, validated);
            if (!trade) {
                return res.status(404).json({ error: "Trade not found" });
            }
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
            const id = parseInt(req.params.id);
            await storage.deleteTrade(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete trade" });
        }
    });

    app.post("/api/trades/bulk-delete", async (req, res) => {
        try {
            const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
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
