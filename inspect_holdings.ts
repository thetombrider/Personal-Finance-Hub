
import { marketDataService } from "./server/services/marketData";
import { storage } from "./server/storage";
import { db } from "./server/db";
import { users } from "@shared/schema";

async function inspectHoldings() {
    console.log("Listing users...");
    try {
        const allUsers = await db.select().from(users);
        console.log("Users found:", allUsers.map(u => ({ id: u.id, username: u.username })));

        for (const user of allUsers) {
            console.log(`\nChecking holdings for user ${user.username} (ID: ${user.id})...`);
            const holdings = await storage.getHoldings(user.id);
            console.log(`Found ${holdings.length} holdings.`);

            for (const holding of holdings) {
                console.log(`  Ticker: ${holding.ticker}`);
                console.log(`    Name: ${holding.name}`);
                console.log(`    DB Current Price: ${holding.currentPrice}`);
                console.log(`    Last Update: ${holding.lastPriceUpdate}`);
                console.log(`    Sector: ${holding.sector}`);
            }
        }
    } catch (error) {
        console.error("Error inspecting:", error);
    }
}

inspectHoldings().catch(console.error);
