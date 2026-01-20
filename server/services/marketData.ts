import { storage } from "../storage";
import yahooFinance from 'yahoo-finance2';

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
    };
}

export class MarketDataService {

    constructor() { }

    private isLondonExchange(symbol: string): boolean {
        const upper = symbol.toUpperCase();
        return upper.endsWith('.LON') || upper.endsWith('.L');
    }

    async getExchangeRate(from: string, to: string = 'EUR'): Promise<number> {
        // Return 1 if same currency
        if (from === to) return 1;

        try {
            // Construct Yahoo symbol, e.g., USDEUR=X
            const symbol = `${from}${to}=X`;
            const result = await yahooFinance.quote(symbol);

            if (result && result.regularMarketPrice) {
                return result.regularMarketPrice;
            }

            // Fallback defaults if API fails but we have hardcoded values
            if (from === 'GBP' && to === 'EUR') return 1.17;
            if (from === 'USD' && to === 'EUR') return 0.92;

        } catch (error) {
            console.error(`Error fetching ${from}/${to} rate:`, error);
        }

        // Return default fallback
        return (from === 'GBP' ? 1.17 : (from === 'USD' ? 0.92 : 1));
    }

    async convertToEur(value: number, fromCurrency: string): Promise<number> {
        if (fromCurrency === 'EUR') {
            return value;
        }

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
        try {
            const results = await yahooFinance.search(keywords);

            return results.quotes.map((match: any) => ({
                symbol: match.symbol,
                name: match.shortname || match.longname || match.symbol,
                type: match.quoteType,
                region: match.exchange,
                currency: match.currency // Might be undefined in search results
            }));
        } catch (error) {
            console.error("Error searching symbols:", error);
            return [];
        }
    }

    async getQuote(symbol: string): Promise<CachedQuote | null> {
        const upperSymbol = symbol.toUpperCase();

        // Fetch from API
        try {
            const quote = await yahooFinance.quote(upperSymbol);

            if (quote) {
                let currency = quote.currency || "USD";
                // Yahoo finance often uses 'GBp' for pence, normalize or handle
                if (currency === 'GBp') currency = 'GBX';

                // Convert all fields to EUR
                const [price, change, high, low, open, previousClose] = await Promise.all([
                    this.convertToEur(quote.regularMarketPrice || 0, currency),
                    this.convertToEur(quote.regularMarketChange || 0, currency),
                    this.convertToEur(quote.regularMarketDayHigh || 0, currency),
                    this.convertToEur(quote.regularMarketDayLow || 0, currency),
                    this.convertToEur(quote.regularMarketOpen || 0, currency),
                    this.convertToEur(quote.regularMarketPreviousClose || 0, currency),
                ]);

                const quoteData = {
                    symbol: upperSymbol,
                    price,
                    change,
                    changePercent: (quote.regularMarketChangePercent || 0).toFixed(2) + "%",
                    high,
                    low,
                    open,
                    previousClose,
                    volume: quote.regularMarketVolume,
                    latestTradingDay: quote.regularMarketTime ? new Date(quote.regularMarketTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    currency: "EUR"
                };

                // Persist to DB for history/portfolio tracking purposes only
                try {
                    const holding = await storage.getGlobalHoldingByTicker(upperSymbol);
                    if (holding && holding.userId) {
                        await storage.updateHolding(holding.id, holding.userId, {
                            currentPrice: price.toFixed(4),
                            lastPriceUpdate: new Date().toISOString()
                        });
                    }
                } catch (e) {
                    console.error("Failed to update holding price in DB", e);
                }

                return { data: quoteData };
            }
        } catch (err) {
            console.error(`Failed to fetch price for ${upperSymbol}:`, err);
        }

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


