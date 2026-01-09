
import { storage } from "./server/storage";
import { reconciliationService } from "./server/services/reconciliation";
import { addDays, subDays } from "date-fns";

async function run() {
    // 1. Get a user
    const users = await storage.getUserByUsername("admin") || (await (await import("./server/db")).db.select().from((await import("@shared/schema")).users).limit(1))[0];

    if (!users) {
        console.log("No user found.");
        process.exit(1);
    }

    const userId = users.id;
    console.log(`Running check for user: ${users.username} (${userId})`);

    // 2. Get recurring expenses
    const recurring = await storage.getRecurringExpenses(userId);
    console.log(`Found ${recurring.length} recurring expenses.`);

    // 3. Get transactions
    const transactions = await storage.getTransactions(userId);
    console.log(`Found ${transactions.length} transactions total.`);

    // 4. Simulate check for last month
    const today = new Date();
    const month = today.getMonth() + 1; // 1-12
    const year = today.getFullYear();

    // Check previous month to be sure we have data
    const monthToCheck = month === 1 ? 12 : month - 1;
    const yearToCheck = month === 1 ? year - 1 : year;

    console.log(`Checking interactions for ${monthToCheck}/${yearToCheck}...`);

    for (const expense of recurring) {
        if (!expense.active) continue;
        console.log(`\n-----------------------------------`);
        console.log(`Expense: ${expense.name} (Day: ${expense.dayOfMonth}, Amount: ${expense.amount})`);

        let expectedDate = new Date(yearToCheck, monthToCheck - 1, expense.dayOfMonth);
        // If start date is in future, skip
        const startDate = new Date(expense.startDate);
        if (expectedDate < startDate) {
            console.log(`Skipping, expected date ${expectedDate.toISOString()} < start date ${startDate.toISOString()}`);
            continue;
        }

        const minDate = subDays(expectedDate, 5);
        const maxDate = addDays(expectedDate, 5);
        console.log(`Looking for match between ${minDate.toISOString().split('T')[0]} and ${maxDate.toISOString().split('T')[0]}`);

        const candidates = transactions.filter(t => {
            const tDate = new Date(t.date);
            if (tDate < minDate || tDate > maxDate) return false;

            console.log(`  -> Date candidate: ${t.date} - ${t.description} (${t.amount})`);

            const tAmount = Math.abs(parseFloat(t.amount));
            const expAmount = parseFloat(expense.amount);
            const diff = Math.abs(tAmount - expAmount);

            const isAmountMatch = diff < 12.0;

            const pattern = expense.matchPattern || expense.name;
            const tDesc = t.description.toLowerCase();
            const isDescMatch = tDesc.includes(pattern.toLowerCase());

            console.log(`     Amount match: ${isAmountMatch} (Diff: ${diff.toFixed(2)}), Desc match: ${isDescMatch} (Pattern: '${pattern}')`);

            return isAmountMatch && isDescMatch;
        });

        if (candidates.length > 0) {
            console.log(`MATCHED with: ${candidates[0].description}`);
        } else {
            console.log("NO MATCH FOUND");
        }
    }
}

run().catch(console.error).finally(() => process.exit());
