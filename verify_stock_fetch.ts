
import { marketDataService } from "./server/services/marketData";

async function testFetch() {
    const symbols = ["AAPL", "VOD.L", "TSLA"];
    console.log("Testing stock fetch for:", symbols);

    for (const symbol of symbols) {
        try {
            console.log(`\nFetching ${symbol}...`);
            const quote = await marketDataService.getQuote(symbol);
            if (quote) {
                console.log(`Result for ${symbol}:`);
                console.log(`  Price (EUR): ${quote.data.price}`);
                console.log(`  Symbol: ${quote.data.symbol}`);
                console.log(`  Original Currency: ${quote.data.currency}`); // This might be "EUR" because it's overwritten
                console.log(`  Cached: ${quote.data.cached}`);
                console.log(`  Stale: ${quote.data.stale}`);
                console.log(`  Raw Quote Data:`, JSON.stringify(quote.data, null, 2));
            } else {
                console.log(`No quote returned for ${symbol}`);
            }
        } catch (error) {
            console.error(`Error fetching ${symbol}:`, error);
        }
    }
}

testFetch().catch(console.error);
