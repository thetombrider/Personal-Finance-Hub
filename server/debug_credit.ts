
import { storage } from "./storage";
import { format } from "date-fns";

async function debugCredit() {
    try {
        console.log("--- DEBUGGING CREDIT CARD BALANCES ---");

        // 1. Get User
        const user = await storage.getUserByUsername("tommy");
        if (!user) { console.log("User 'tommy' not found"); return; }

        // 2. Get Accounts
        const accounts = await storage.getAccounts(user.id);
        const creditAccounts = accounts.filter(a => a.type === 'credit');

        if (creditAccounts.length === 0) {
            console.log("No credit accounts found.");
            return;
        }

        const transactions = await storage.getTransactions(user.id);

        for (const acc of creditAccounts) {
            console.log(`\nACCOUNT: ${acc.name} (ID: ${acc.id})`);
            console.log(`  Starting Balance: ${acc.startingBalance}`);

            const accTx = transactions.filter(t => t.accountId === acc.id);

            let totalIncome = 0;
            let totalExpense = 0;

            accTx.forEach(t => {
                const amount = parseFloat(t.amount.toString());
                if (t.type === 'income') totalIncome += amount;
                else totalExpense += amount;
            });

            const starting = parseFloat(acc.startingBalance?.toString() || "0");
            const calculatedBalance = starting + totalIncome - totalExpense;

            console.log(`  Total Income (Payments):  ${totalIncome.toFixed(2)}`);
            console.log(`  Total Expense (Spending): ${totalExpense.toFixed(2)}`);
            console.log(`  CALCULATED BALANCE:       ${calculatedBalance.toFixed(2)}`);

            if (calculatedBalance > 0) {
                console.log("  !!! WARNING: POSITIVE BALANCE DETECTED !!!");
                console.log("  Possible causes: Duplicate payments? Incorrect starting balance? Refund treated as income?");

                // Show last 5 income transactions
                const incomeTx = accTx.filter(t => t.type === 'income').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
                if (incomeTx.length > 0) {
                    console.log("  Recent Income Transactions:");
                    incomeTx.forEach(t => console.log(`    [${t.date}] +${t.amount} (${t.description})`));
                }
            } else {
                console.log("  Balance is negative (Normal for debt).");
            }
        }

    } catch (e) {
        console.error(e);
    }
}

debugCredit();
