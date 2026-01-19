/**
 * Transaction Repository
 * Handles transaction operations including transfers and bulk imports with deduplication.
 */

import { eq, inArray, and, gte, lte, sql } from "drizzle-orm";
import { db } from "./base";
import {
    type Transaction,
    type InsertTransaction,
    transactions,
    accounts,
    trades,
    categories,
} from "@shared/schema";

export interface TransferData {
    date: string;
    amount: string;
    description: string;
    fromAccountId: number;
    toAccountId: number;
    categoryId: number;
}

/**
 * Generate a dedupe key for a transaction
 */
function generateDedupeKey(accountId: number, date: string | Date, amount: string | number, description: string): string {
    const isoDate = new Date(date).toISOString().split('T')[0];
    const roundedAmount = Math.round(parseFloat(amount.toString()) * 100); // Round to cents
    const normalizedDesc = description.toLowerCase().trim();
    return `${accountId}|${isoDate}|${roundedAmount}|${normalizedDesc}`;
}

export class TransactionRepository {
    async getTransactions(userId: string): Promise<Transaction[]> {
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
        return await db.select().from(transactions).where(inArray(transactions.accountId, userAccounts));
    }

    async getTransactionsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Transaction[]> {
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
        const startDateStr = startDate.toISOString().split('T')[0] + ' 00:00:00';
        const endDateStr = endDate.toISOString().split('T')[0] + ' 23:59:59';

        return await db.select()
            .from(transactions)
            .where(and(
                inArray(transactions.accountId, userAccounts),
                gte(transactions.date, startDateStr),
                lte(transactions.date, endDateStr)
            ));
    }

    async getTransaction(id: number): Promise<Transaction | undefined> {
        const result = await db.select().from(transactions).where(eq(transactions.id, id));
        return result[0];
    }

    async getExportableTransactions(userId: string) {
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));

        return await db.select({
            date: transactions.date,
            amount: transactions.amount,
            description: transactions.description,
            type: transactions.type,
            Account: accounts.name,
            Category: categories.name,
            LinkedTransactionID: transactions.linkedTransactionId,
            ExternalID: transactions.externalId
        })
            .from(transactions)
            .leftJoin(accounts, eq(transactions.accountId, accounts.id))
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .where(inArray(transactions.accountId, userAccounts));
    }

    async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
        const result = await db.insert(transactions).values(transaction).returning();
        return result[0];
    }

    /**
     * Bulk create transactions with optimized deduplication.
     * Uses date windowing and hash-based O(n) lookups instead of O(n×m) nested loops.
     */
    async createTransactions(txs: InsertTransaction[]): Promise<Transaction[]> {
        if (txs.length === 0) return [];

        // Get unique accounts involved
        const accountIds = Array.from(new Set(txs.map(t => t.accountId)));

        // Calculate date window from incoming transactions (±30 days buffer)
        const incomingDates = txs.map(t => new Date(t.date));
        const minDate = new Date(Math.min(...incomingDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...incomingDates.map(d => d.getTime())));
        minDate.setDate(minDate.getDate() - 30);
        maxDate.setDate(maxDate.getDate() + 30);

        const minDateStr = minDate.toISOString().split('T')[0];
        const maxDateStr = maxDate.toISOString().split('T')[0];

        // Fetch only transactions within date window for relevant accounts
        const existing = await db.select()
            .from(transactions)
            .where(and(
                inArray(transactions.accountId, accountIds),
                sql`DATE(${transactions.date}) >= ${minDateStr}`,
                sql`DATE(${transactions.date}) <= ${maxDateStr}`
            ));

        // Build a Set of existing keys for O(1) lookup
        const existingKeys = new Set<string>();
        for (const existingTx of existing) {
            const key = generateDedupeKey(existingTx.accountId, existingTx.date, existingTx.amount, existingTx.description);
            existingKeys.add(key);
        }

        // Filter out duplicates using O(n) hash lookups
        const toInsert = txs.filter(newTx => {
            const key = generateDedupeKey(newTx.accountId, newTx.date, newTx.amount.toString(), newTx.description);
            return !existingKeys.has(key);
        });

        if (toInsert.length === 0) return [];

        const result = await db.insert(transactions).values(toInsert).returning();
        return result;
    }

    async createTransfer(data: TransferData): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }> {
        return await db.transaction(async (tx) => {
            const [fromTransaction] = await tx.insert(transactions).values({
                date: data.date,
                amount: data.amount,
                description: data.description,
                accountId: data.fromAccountId,
                categoryId: data.categoryId,
                type: "expense",
            }).returning();

            const [toTransaction] = await tx.insert(transactions).values({
                date: data.date,
                amount: data.amount,
                description: data.description,
                accountId: data.toAccountId,
                categoryId: data.categoryId,
                type: "income",
                linkedTransactionId: fromTransaction.id,
            }).returning();

            await tx.update(transactions)
                .set({ linkedTransactionId: toTransaction.id })
                .where(eq(transactions.id, fromTransaction.id));

            fromTransaction.linkedTransactionId = toTransaction.id;

            return { fromTransaction, toTransaction };
        });
    }

    async updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
        const result = await db.update(transactions).set(transaction).where(eq(transactions.id, id)).returning();
        return result[0];
    }

    /**
     * Delete a single transaction, unlinking trades and paired transfer transactions.
     */
    async deleteTransaction(id: number): Promise<void> {
        await db.transaction(async (tx) => {
            // Unlink any trades that reference this transaction
            await tx.update(trades)
                .set({ transactionId: null })
                .where(eq(trades.transactionId, id));

            // Unlink any paired transfer transaction (clear linkedTransactionId)
            await tx.update(transactions)
                .set({ linkedTransactionId: null })
                .where(eq(transactions.linkedTransactionId, id));

            await tx.delete(transactions).where(eq(transactions.id, id));
        });
    }

    /**
     * Bulk delete transactions, unlinking trades and paired transfers first.
     */
    async deleteTransactions(ids: number[]): Promise<void> {
        if (ids.length === 0) return;

        await db.transaction(async (tx) => {
            // Unlink trades referencing these transactions
            await tx.update(trades)
                .set({ transactionId: null })
                .where(inArray(trades.transactionId, ids));

            // Unlink any paired transfer transactions (clear linkedTransactionId)
            await tx.update(transactions)
                .set({ linkedTransactionId: null })
                .where(inArray(transactions.linkedTransactionId, ids));

            await tx.delete(transactions).where(inArray(transactions.id, ids));
        });
    }

    /**
     * Clear all transactions with proper unlinking of trades in an atomic operation.
     */
    async clearTransactions(): Promise<void> {
        await db.transaction(async (tx) => {
            // First unlink all trades from transactions
            await tx.update(trades)
                .set({ transactionId: null })
                .where(sql`${trades.transactionId} IS NOT NULL`);

            // Then delete all transactions
            await tx.delete(transactions);
        });
    }

    /**
     * Clear transactions for a specific user, unlinking trades first.
     */
    async clearTransactionsForUser(userId: string): Promise<void> {
        await db.transaction(async (tx) => {
            // Get user's account IDs
            const userAccountIds = await tx.select({ id: accounts.id })
                .from(accounts)
                .where(eq(accounts.userId, userId));

            if (userAccountIds.length === 0) return;

            const accountIdList = userAccountIds.map(a => a.id);

            // Get IDs of transactions to be deleted
            const userTransactionIds = await tx.select({ id: transactions.id })
                .from(transactions)
                .where(inArray(transactions.accountId, accountIdList));

            if (userTransactionIds.length === 0) return;

            const txIdList = userTransactionIds.map(t => t.id);

            // Unlink trades referencing these transactions
            await tx.update(trades)
                .set({ transactionId: null })
                .where(inArray(trades.transactionId, txIdList));

            // Unlink any paired transfer transactions
            await tx.update(transactions)
                .set({ linkedTransactionId: null })
                .where(inArray(transactions.linkedTransactionId, txIdList));

            // Delete the transactions
            await tx.delete(transactions).where(inArray(transactions.id, txIdList));
        });
    }
}
