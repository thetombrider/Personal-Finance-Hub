import { storage } from "../storage";

interface CachedQuote {
    data: {
        symbol: string;
        price: number;
        change: number;
        changePercent: string;
        high?: number;
        low?: number;
        open?: number;
        previousClose?: number;
        volume?: number;
        latestTradingDay?: string;
        currency?: string;
        cached?: boolean;
        stale?: boolean;
    };
    timestamp: number;
}

export class MarketDataService {
    private quotesCache: Record<string, CachedQuote> = {};
    private cachedGbpEurRate: { rate: number; timestamp: number } | null = null;
    private readonly CACHE_DURATION_24H = 24 * 60 * 60 * 1000;

    constructor() { }

    private isLondonExchange(symbol: string): boolean {
        const upper = symbol.toUpperCase();
        return upper.endsWith('.LON') || upper.endsWith('.L');
    }

    async getGbpToEurRate(): Promise<number> {
        if (this.cachedGbpEurRate && Date.now() - this.cachedGbpEurRate.timestamp < this.CACHE_DURATION_24H) {
            return this.cachedGbpEurRate.rate;
        }

        try {
            const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
            if (!apiKey) return 1.17;

            const response = await fetch(
                `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=GBP&to_currency=EUR&apikey=${apiKey}`
            );
            const data = await response.json();

            if (data["Realtime Currency Exchange Rate"]) {
                const rate = parseFloat(data["Realtime Currency Exchange Rate"]["5. Exchange Rate"]);
                this.cachedGbpEurRate = { rate, timestamp: Date.now() };
                return rate;
            }
        } catch (error) {
            console.error("Error fetching GBP/EUR rate:", error);
        }

        return this.cachedGbpEurRate?.rate || 1.17;
    }

    async convertToEur(value: number, symbol: string): Promise<number> {
        if (!this.isLondonExchange(symbol)) {
            return value;
        }
        const valueInPounds = value / 100;
        const gbpEurRate = await this.getGbpToEurRate();
        return valueInPounds * gbpEurRate;
    }

    async search(keywords: string): Promise<any[]> {
        const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
        if (!apiKey) throw new Error("Alpha Vantage API key not configured");

        const response = await fetch(
            `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keywords)}&apikey=${apiKey}`
        );

        const data = await response.json();
        if (data["Note"]) {
            throw new Error("API rate limit reached");
        }

        const matches = data.bestMatches || [];
        return matches.map((match: any) => ({
            symbol: match["1. symbol"],
            name: match["2. name"],
            type: match["3. type"],
            region: match["4. region"],
            currency: match["8. currency"]
        }));
    }

    async getQuote(symbol: string): Promise<CachedQuote | null> {
        const upperSymbol = symbol.toUpperCase();

        // Check cache
        if (this.quotesCache[upperSymbol] && (Date.now() - this.quotesCache[upperSymbol].timestamp < this.CACHE_DURATION_24H)) {
            // console.log(`[cache] Returning cached quote for ${upperSymbol}`);
            return { ...this.quotesCache[upperSymbol], data: { ...this.quotesCache[upperSymbol].data, cached: true } };
        }

        // Check DB as fallback
        try {
            const holding = await storage.getHoldingByTicker(upperSymbol);
            // DB Freshness check (if we consider DB as a cache layer)
            if (holding && holding.currentPrice && holding.lastPriceUpdate) {
                const timeDiff = Date.now() - new Date(holding.lastPriceUpdate).getTime();
                if (timeDiff < this.CACHE_DURATION_24H) {
                    const price = parseFloat(holding.currentPrice.toString());
                    const quoteData = {
                        symbol: upperSymbol,
                        price,
                        change: 0,
                        changePercent: "0%",
                        currency: this.isLondonExchange(upperSymbol) ? "EUR" : undefined
                    };
                    const cachedQuote: CachedQuote = {
                        data: quoteData,
                        timestamp: Date.now() - timeDiff // Approximate timestamp
                    };
                    // this.quotesCache[upperSymbol] = { ...cachedQuote, timestamp: Date.now() }; // Update mem cache
                    // console.log(`[db-cache] Returning DB quote for ${upperSymbol}`);
                    return { ...cachedQuote, data: { ...cachedQuote.data, cached: true } };
                }
            }
        } catch (e) {
            console.error(`Error checking DB for ${upperSymbol}:`, e);
        }

        // Fetch from API
        try {
            const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
            if (!apiKey) return null;

            const response = await fetch(
                `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${upperSymbol}&apikey=${apiKey}`
            );
            const data = await response.json();

            // Handle rate limit
            if (data["Note"]) {
                const cached = this.quotesCache[upperSymbol];
                if (cached) return { ...cached, data: { ...cached.data, stale: true, cached: true } };

                // Try DB again even if stale
                const holding = await storage.getHoldingByTicker(upperSymbol);
                if (holding && holding.currentPrice) {
                    const price = parseFloat(holding.currentPrice.toString());
                    return {
                        data: {
                            symbol: upperSymbol,
                            price,
                            change: 0,
                            changePercent: "0%",
                            stale: true,
                            cached: true
                        },
                        timestamp: Date.now()
                    };
                }
                return null;
            }

            const quote = data["Global Quote"];

            if (quote && quote["05. price"]) {
                const [price, change, high, low, open, previousClose] = await Promise.all([
                    this.convertToEur(parseFloat(quote["05. price"]), upperSymbol),
                    this.convertToEur(parseFloat(quote["09. change"]), upperSymbol),
                    this.convertToEur(parseFloat(quote["03. high"]), upperSymbol),
                    this.convertToEur(parseFloat(quote["04. low"]), upperSymbol),
                    this.convertToEur(parseFloat(quote["02. open"]), upperSymbol),
                    this.convertToEur(parseFloat(quote["08. previous close"]), upperSymbol),
                ]);

                const quoteData = {
                    symbol: upperSymbol,
                    price,
                    change,
                    changePercent: quote["10. change percent"],
                    high,
                    low,
                    open,
                    previousClose,
                    volume: parseInt(quote["06. volume"]),
                    latestTradingDay: quote["07. latest trading day"],
                    currency: this.isLondonExchange(upperSymbol) ? "EUR" : undefined
                };

                const cachedQuote: CachedQuote = {
                    data: quoteData,
                    timestamp: Date.now()
                };
                this.quotesCache[upperSymbol] = cachedQuote;

                // Persist to DB
                try {
                    const holding = await storage.getHoldingByTicker(upperSymbol);
                    if (holding) {
                        await storage.updateHolding(holding.id, {
                            currentPrice: price.toFixed(4),
                            lastPriceUpdate: new Date().toISOString()
                        });
                        // console.log(`[db-save] Updated price for ${upperSymbol}`);
                    }
                } catch (e) {
                    console.error("Failed to update holding price in DB", e);
                }

                return cachedQuote;
            }
        } catch (err) {
            console.error(`Failed to fetch price for ${upperSymbol}:`, err);
        }

        // Final fallback to cache/stale if error
        const cached = this.quotesCache[upperSymbol];
        if (cached) return { ...cached, data: { ...cached.data, stale: true, cached: true } };

        return null;
    }

    async getBatchQuotes(symbols: string[]): Promise<Record<string, any>> {
        const results: Record<string, any> = {};
        const uniqueSymbols = Array.from(new Set(symbols));

        for (const symbol of uniqueSymbols) {
            const quote = await this.getQuote(symbol);
            if (quote) {
                results[symbol] = quote.data;
            }
        }
        return results;
    }
}

export const marketDataService = new MarketDataService();
