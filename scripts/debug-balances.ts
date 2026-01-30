/**
 * Debug script to fetch and display all balance types from GoCardless for an account.
 * 
 * Usage: npx tsx scripts/debug-balances.ts <accountId>
 * 
 * Example: npx tsx scripts/debug-balances.ts 7
 */

import "dotenv/config";
import { db } from "../server/db";
import { accounts } from "../shared/schema";
import { eq } from "drizzle-orm";

// @ts-ignore
import * as nordigenData from "nordigen-node";
const NordigenClient = (nordigenData as any).NordigenClient || (nordigenData as any).default || nordigenData;

const SECRET_ID = process.env.GOCARDLESS_SECRET_ID;
const SECRET_KEY = process.env.GOCARDLESS_SECRET_KEY;

async function main() {
    const accountId = parseInt(process.argv[2]);

    if (!accountId || isNaN(accountId)) {
        console.error("Usage: npx tsx scripts/debug-balances.ts <accountId>");
        console.error("Example: npx tsx scripts/debug-balances.ts 7");
        process.exit(1);
    }

    if (!SECRET_ID || !SECRET_KEY) {
        console.error("❌ GOCARDLESS_SECRET_ID or GOCARDLESS_SECRET_KEY not set");
        process.exit(1);
    }

    console.log(`\n🔍 Fetching balances for account ID: ${accountId}\n`);

    // Get the account from DB
    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));

    if (!account) {
        console.error(`❌ Account with ID ${accountId} not found`);
        process.exit(1);
    }

    console.log("📋 Account Info:");
    console.log(`   Name: ${account.name}`);
    console.log(`   Type: ${account.type}`);
    console.log(`   GoCardless ID: ${account.gocardlessAccountId || "Not linked"}`);
    console.log(`   Current Balance (app): ${account.startingBalance}`);
    console.log(`   Bank Balance (stored): ${account.bankBalance || "Not synced"}`);
    console.log("");

    if (!account.gocardlessAccountId) {
        console.error("❌ Account is not linked to GoCardless");
        process.exit(1);
    }

    // Initialize GoCardless client
    const client = new NordigenClient({
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
    });

    console.log("🔐 Generating GoCardless token...");
    await client.generateToken();

    // Fetch balances
    console.log("📡 Fetching balances from GoCardless API...\n");
    const gcAccount = client.account(account.gocardlessAccountId);
    const balancesResponse = await gcAccount.getBalances();

    console.log("═══════════════════════════════════════════════════════════════");
    console.log("                    RAW BALANCE DATA FROM BANK                  ");
    console.log("═══════════════════════════════════════════════════════════════\n");

    if (!balancesResponse?.balances || balancesResponse.balances.length === 0) {
        console.log("⚠️  No balances returned from the bank");
    } else {
        console.log(`Found ${balancesResponse.balances.length} balance type(s):\n`);

        for (const balance of balancesResponse.balances) {
            const amount = balance.balanceAmount?.amount || "N/A";
            const currency = balance.balanceAmount?.currency || "N/A";
            const creditIncluded = balance.creditLimitIncluded ? "Yes" : "No";

            console.log(`┌─────────────────────────────────────────────────────────────┐`);
            console.log(`│ Balance Type: ${balance.balanceType.padEnd(44)} │`);
            console.log(`├─────────────────────────────────────────────────────────────┤`);
            console.log(`│ Amount: ${amount} ${currency}`.padEnd(62) + `│`);
            console.log(`│ Credit Limit Included: ${creditIncluded}`.padEnd(62) + `│`);
            if (balance.referenceDate) {
                console.log(`│ Reference Date: ${balance.referenceDate}`.padEnd(62) + `│`);
            }
            if (balance.lastChangeDateTime) {
                console.log(`│ Last Change: ${balance.lastChangeDateTime}`.padEnd(62) + `│`);
            }
            console.log(`└─────────────────────────────────────────────────────────────┘\n`);
        }
    }

    console.log("═══════════════════════════════════════════════════════════════");
    console.log("                    BALANCE TYPE REFERENCE                      ");
    console.log("═══════════════════════════════════════════════════════════════\n");
    console.log("For credit cards (per GoCardless docs):");
    console.log("  • closingBooked    = Invoiced, but not yet paid (DEBT)");
    console.log("  • interimAvailable = Invoiced + booked but not invoiced");
    console.log("  • expected         = Invoiced + booked + pending");
    console.log("");
    console.log("For regular accounts:");
    console.log("  • closingBooked    = Balance at end of reporting period");
    console.log("  • interimBooked    = Current booked balance during day");
    console.log("  • interimAvailable = Available funds (can include overdraft)");
    console.log("");

    // Show which one we would select
    const isCreditCard = account.type === "credit";
    let selectedBalance;

    if (isCreditCard) {
        selectedBalance = balancesResponse.balances.find((b: any) => b.balanceType === "closingBooked")
            || balancesResponse.balances.find((b: any) => b.balanceType === "expected")
            || balancesResponse.balances.find((b: any) => b.balanceType === "interimBooked");
    } else {
        selectedBalance = balancesResponse.balances.find((b: any) => b.balanceType === "closingBooked")
            || balancesResponse.balances.find((b: any) => b.balanceType === "interimBooked")
            || balancesResponse.balances.find((b: any) => b.balanceType === "expected")
            || balancesResponse.balances.find((b: any) => b.balanceType === "interimAvailable");
    }

    console.log("═══════════════════════════════════════════════════════════════");
    console.log("                    CURRENT APP SELECTION                       ");
    console.log("═══════════════════════════════════════════════════════════════\n");
    console.log(`Account type: ${account.type} (isCreditCard: ${isCreditCard})`);

    if (selectedBalance) {
        console.log(`Selected balance type: ${selectedBalance.balanceType}`);
        console.log(`Selected amount: ${selectedBalance.balanceAmount?.amount} ${selectedBalance.balanceAmount?.currency}`);
        console.log(`Credit limit included: ${selectedBalance.creditLimitIncluded ? "Yes" : "No"}`);
    } else {
        console.log("⚠️  No matching balance type found!");
    }

    console.log("\n✅ Done\n");
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
});
