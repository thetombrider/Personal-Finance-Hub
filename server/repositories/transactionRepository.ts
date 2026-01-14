/**
 * Transaction Repository
 * Handles transaction operations including transfers and bulk imports with deduplication.
 */

import { eq, inArray } from "drizzle-orm";
import { db } from "./base";
import {
    type Transaction,
    type InsertTransaction,
    transactions,
    accounts,
    trades,
} from "@shared/schema";

export interface TransferData {
    date: string;
    amount: string;
    description: string;
    fromAccountId: number;
    toAccountId: number;
    categoryId: number;
}

export class TransactionRepository {
    async getTransactions(userId: string): Promise<Transaction[]> {
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
        return await db.select().from(transactions).where(inArray(transactions.accountId, userAccounts));
    }

    async getTransaction(id: number): Promise<Transaction | undefined> {
        const result = await db.select().from(transactions).where(eq(transactions.id, id));
        return result[0];
    }

    async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
        const result = await db.insert(transactions).values(transaction).returning();
        return result[0];
    }

    async createTransactions(txs: InsertTransaction[]): Promise<Transaction[]> {
        if (txs.length === 0) return [];

        // Get unique accounts involved
        const accountIds = Array.from(new Set(txs.map(t => t.accountId)));

        // Fetch existing transactions to check for duplicates
        const existing = await db.select()
            .from(transactions)
            .where(inArray(transactions.accountId, accountIds));

        // Filter out duplicates
        const toInsert = txs.filter(newTx => {
            const isDuplicate = existing.some(existingTx => {
                if (existingTx.accountId !== newTx.accountId) return false;
                if (new Date(existingTx.date).toISOString().split('T')[0] !== new Date(newTx.date).toISOString().split('T')[0]) return false;
                if (Math.abs(parseFloat(existingTx.amount) - parseFloat(newTx.amount.toString())) > 0.001) return false;
                if (existingTx.description.toLowerCase().trim() !== newTx.description.toLowerCase().trim()) return false;
                return true;
            });
            return !isDuplicate;
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

    async deleteTransaction(id: number): Promise<void> {
        await db.transaction(async (tx) => {
            // Unlink any trades that reference this transaction
            await tx.update(trades)
                .set({ transactionId: null })
                .where(eq(trades.transactionId, id));

            await tx.delete(transactions).where(eq(transactions.id, id));
        });
    }

    async deleteTransactions(ids: number[]): Promise<void> {
        if (ids.length === 0) return;

        await db.transaction(async (tx) => {
            await tx.update(trades)
                .set({ transactionId: null })
                .where(inArray(trades.transactionId, ids));

            await tx.delete(transactions).where(inArray(transactions.id, ids));
        });
    }

    async clearTransactions(): Promise<void> {
        await db.delete(transactions);
    }

    async clearTransactionsForUser(userId: string): Promise<void> {
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
        await db.delete(transactions).where(inArray(transactions.accountId, userAccounts));
    }
}
