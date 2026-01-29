import type { Express } from "express";
import { marketDataService } from "../services/marketData";
import { logger } from "../lib/logger";

export function registerMarketRoutes(app: Express) {
    // ============ ALPHA VANTAGE STOCK API ============
    // Refactored to use MarketDataService

    app.get("/api/stock/quote/:symbol", async (req, res) => {
        try {
            const symbol = req.params.symbol.toUpperCase();
            const quote = await marketDataService.getQuote(symbol);
            if (quote) {
                res.json(quote.data);
            } else {
                res.status(404).json({ error: "Stock not found" });
            }
        } catch (error) {
            logger.stock.error("Stock API error:", error);
            res.status(500).json({ error: "Failed to fetch stock data" });
        }
    });

    app.get("/api/stock/search/:keywords", async (req, res) => {
        try {
            const results = await marketDataService.search(req.params.keywords);
            res.json(results);
        } catch (error: any) {
            if (error.message && error.message.includes("rate limit")) {
                return res.status(429).json({ error: "API rate limit reached" });
            }
            res.status(500).json({ error: "Failed to search symbols" });
        }
    });

    app.get("/api/stock/batch-quotes", async (req, res) => {
        try {
            // Handle both string and string[] for symbols query param
            let symbolsRaw = req.query.symbols;
            let symbols: string[] = [];

            if (Array.isArray(symbolsRaw)) {
                // Multiple query params: ?symbols=X&symbols=Y
                symbols = symbolsRaw.map(s => String(s).trim().toUpperCase()).filter(s => s.length > 0);
            } else if (typeof symbolsRaw === "string") {
                // Comma-separated: ?symbols=X,Y,Z
                symbols = symbolsRaw.split(",").map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
            }

            if (symbols.length === 0) return res.status(400).json({ error: "No symbols provided" });

            const quotes = await marketDataService.getBatchQuotes(symbols);
            res.json(quotes);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch batch quotes" });
        }
    });

    app.get("/api/stock/convert/:amount/:symbol", async (req, res) => {
        try {
            const amount = parseFloat(req.params.amount);
            if (!Number.isFinite(amount)) {
                return res.status(400).json({ error: "Invalid amount" });
            }
            const symbol = req.params.symbol;
            const converted = await marketDataService.convertToEur(amount, symbol);
            res.json({ amount: converted });
        } catch (error) {
            res.status(500).json({ error: "Failed to convert currency" });
        }
    });
}

