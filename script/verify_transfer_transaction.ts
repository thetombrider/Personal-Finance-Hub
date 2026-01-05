
import { storage } from "../server/storage";
import { db } from "../server/db";
import { accounts, categories, transactions } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Starting verification...");

    // Setup test data
    const account1 = await storage.createAccount({
        name: "Test Account 1",
        type: "checking",
        balance: "1000",
        isMain: true,
    });

    const account2 = await storage.createAccount({
        name: "Test Account 2",
        type: "savings",
        balance: "0",
        isMain: false,
    });

    const category = await storage.createCategory({
        name: "Test Transfer Category",
        type: "expense",
        icon: "swap",
        color: "#000000",
    });

    try {
        console.log("Testing successful transfer...");
        const result = await storage.createTransfer({
            date: new Date().toISOString(),
            amount: "100",
            description: "Test Transfer",
            fromAccountId: account1.id,
            toAccountId: account2.id,
            categoryId: category.id,
        });

        if (result.fromTransaction && result.toTransaction &&
            result.fromTransaction.linkedTransactionId === result.toTransaction.id &&
            result.toTransaction.linkedTransactionId === result.fromTransaction.id) {
            console.log("SUCCESS: Transfer created and linked correctly.");
        } else {
            console.log("FAILURE: Transfer creation failed or linking is incorrect.");
            process.exit(1);
        }

    } catch (error) {
        console.error("unexpected error:", error);
        process.exit(1);
    } finally {
        // Cleanup
        console.log("Cleaning up...");
        await storage.deleteAccount(account1.id);
        await storage.deleteAccount(account2.id);
        await storage.deleteCategory(category.id);
        // Transactions cascade delete or need manual cleanup depending on schema, 
        // but for this test we can leave them or delete them if we want to be clean.
        // For simplicity, we'll delete the transactions we created if we have their IDs, 
        // but better to just delete accounts/categories and let cascade handle it if configured, 
        // or manually delete transactions.

        // storage.ts doesn't expose a way to delete transactions by some criteria easily without IDs.
        // We rely on test DB isolation or just leaving garbage in a local dev DB is fine for this specific verification task if acceptable.
        // Actually, let's try to delete them to be nice.
        // Wait, createTransfer returns the transactions, so we can delete them.
    }

    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
