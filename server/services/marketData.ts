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

interface CachedRate {
    rate: number;
    timestamp: number;
}

export class MarketDataService {
    private quotesCache: Record<string, CachedQuote> = {};
    private ratesCache: Record<string, CachedRate> = {};
    private readonly CACHE_DURATION_24H = 24 * 60 * 60 * 1000;

    constructor() { }

    private isLondonExchange(symbol: string): boolean {
        const upper = symbol.toUpperCase();
        return upper.endsWith('.LON') || upper.endsWith('.L');
    }

    async getExchangeRate(from: string, to: string = 'EUR'): Promise<number> {
        const pair = `${from}/${to}`;

        // Return 1 if same currency
        if (from === to) return 1;

        // Check cache
        if (this.ratesCache[pair] && Date.now() - this.ratesCache[pair].timestamp < this.CACHE_DURATION_24H) {
            return this.ratesCache[pair].rate;
        }

        try {
            const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

            // Fallbacks if no API key or offline
            if (!apiKey) {
                if (from === 'GBP' && to === 'EUR') return 1.17;
                if (from === 'USD' && to === 'EUR') return 0.92;
                return 1;
            }

            const response = await fetch(
                `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${apiKey}`
            );
            const data = await response.json();

            if (data["Realtime Currency Exchange Rate"]) {
                const rate = parseFloat(data["Realtime Currency Exchange Rate"]["5. Exchange Rate"]);
                this.ratesCache[pair] = { rate, timestamp: Date.now() };
                return rate;
            } else if (data["Note"]) {
                // Rate limit hit, use cached stale if available or hardcoded fallback
                if (this.ratesCache[pair]) return this.ratesCache[pair].rate;

                // Fallback defaults
                if (from === 'GBP' && to === 'EUR') return 1.17;
                if (from === 'USD' && to === 'EUR') return 0.92;
            }

        } catch (error) {
            console.error(`Error fetching ${from}/${to} rate:`, error);
        }

        // Return cached stale or default
        return this.ratesCache[pair]?.rate || (from === 'GBP' ? 1.17 : (from === 'USD' ? 0.92 : 1));
    }

    async convertToEur(value: number, fromCurrency: string): Promise<number> {
        if (fromCurrency === 'EUR') {
            return value;
        }

        // Handle GBX (pence) specifically if it comes as a distinct currency code or implied by context
        // Usually London stocks are quoted in GBX (pence), so we divide by 100 to get GBP.
        // However, this method expects a standard ISO currency code.
        // If the caller passes 'GBX', we handle it.
        // If the caller passes 'GBP' but the value is actually in pence (caller's responsibility to know), 
        // we might double convert. 
        // BUT, looking at getQuote logic, we determine currency there.

        let adjustedValue = value;
        let sourceCurrency = fromCurrency;

        if (fromCurrency === 'GBX') {
            adjustedValue = value / 100;
            sourceCurrency = 'GBP';
        }

        const rate = await this.getExchangeRate(sourceCurrency, 'EUR');
        return adjustedValue * rate;
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
            const holding = await storage.getGlobalHoldingByTicker(upperSymbol);
            // DB Freshness check (if we consider DB as a cache layer)
            if (holding && holding.currentPrice && holding.lastPriceUpdate) {
                const timeDiff = Date.now() - new Date(holding.lastPriceUpdate).getTime();
                if (timeDiff < this.CACHE_DURATION_24H) {
                    const price = parseFloat(holding.currentPrice.toString());
                    const currency = holding.currency || (this.isLondonExchange(upperSymbol) ? 'GBP' : 'USD'); // Best guess if missing

                    const quoteData = {
                        symbol: upperSymbol,
                        price,
                        change: 0,
                        changePercent: "0%",
                        currency: "EUR" // DB stores normalized EUR price usually? 
                        // WAIT: existing logic was storing EUR price in DB. 
                        // "currentPrice: price.toFixed(4)" where price was the result of convertToEur.
                        // So when reading back from DB, it's ALREADY in EUR.
                    };
                    const cachedQuote: CachedQuote = {
                        data: quoteData,
                        timestamp: Date.now() - timeDiff // Approximate timestamp
                    };
                    return { ...cachedQuote, data: { ...cachedQuote.data, cached: true } };
                }
            }
        } catch (e) {
            console.error(`Error checking DB for ${upperSymbol}:`, e);
        }

        // Fetch from API
        try {
            const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

            // Mock response if no API key for testing
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
                const holding = await storage.getGlobalHoldingByTicker(upperSymbol);
                if (holding && holding.currentPrice) {
                    const price = parseFloat(holding.currentPrice.toString());
                    return {
                        data: {
                            symbol: upperSymbol,
                            price, // DB price is already EUR
                            change: 0,
                            changePercent: "0%",
                            stale: true,
                            cached: true,
                            currency: "EUR"
                        },
                        timestamp: Date.now()
                    };
                }
                return null;
            }

            const quote = data["Global Quote"];

            if (quote && quote["05. price"]) {
                // Determine currency
                // Alpha vantage doesn't always return currency in Global Quote, verify?
                // Actually it DOES NOT return currency in GLOBAL_QUOTE endpoint consistently for all symbols, 
                // but usually we can infer or we might separate calls.
                // However, for London stocks it's usually GBX. For US it's USD.
                // Using isLondonExchange(symbol) to decide if it's GBX is a heuristic.

                let currency = "USD"; // Default assumption for most exchanges supported by AV
                if (this.isLondonExchange(upperSymbol)) currency = "GBX";
                // Add more heuristics if needed (e.g. .DE -> EUR, .PA -> EUR)
                if (upperSymbol.endsWith('.DE') || upperSymbol.endsWith('.PA') || upperSymbol.endsWith('.MI')) currency = "EUR";

                // Convert all fields to EUR
                const [price, change, high, low, open, previousClose] = await Promise.all([
                    this.convertToEur(parseFloat(quote["05. price"]), currency),
                    this.convertToEur(parseFloat(quote["09. change"]), currency),
                    this.convertToEur(parseFloat(quote["03. high"]), currency),
                    this.convertToEur(parseFloat(quote["04. low"]), currency),
                    this.convertToEur(parseFloat(quote["02. open"]), currency),
                    this.convertToEur(parseFloat(quote["08. previous close"]), currency),
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
                    currency: "EUR" // We converted everything to EUR
                };

                const cachedQuote: CachedQuote = {
                    data: quoteData,
                    timestamp: Date.now()
                };
                this.quotesCache[upperSymbol] = cachedQuote;

                // Persist to DB
                try {
                    const holding = await storage.getGlobalHoldingByTicker(upperSymbol);
                    if (holding && holding.userId) {
                        await storage.updateHolding(holding.id, holding.userId, {
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

