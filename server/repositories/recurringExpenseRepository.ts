/**
 * Recurring Expense Repository
 * Handles recurring expenses and their monthly checks.
 */

import { eq, and, inArray } from "drizzle-orm";
import { db } from "./base";
import {
    type RecurringExpense,
    type InsertRecurringExpense,
    type RecurringExpenseCheck,
    type InsertRecurringExpenseCheck,
    recurringExpenses,
    recurringExpenseChecks,
    accounts,
} from "@shared/schema";

export class RecurringExpenseRepository {
    async getRecurringExpenses(userId: string): Promise<RecurringExpense[]> {
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
        return await db.select().from(recurringExpenses).where(inArray(recurringExpenses.accountId, userAccounts));
    }

    async getActiveRecurringExpenses(userId: string): Promise<RecurringExpense[]> {
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
        return await db.select().from(recurringExpenses).where(and(
            eq(recurringExpenses.active, true),
            inArray(recurringExpenses.accountId, userAccounts)
        ));
    }

    async createRecurringExpense(expense: InsertRecurringExpense): Promise<RecurringExpense> {
        const [created] = await db.insert(recurringExpenses).values(expense).returning();
        return created;
    }

    /**
     * Update a recurring expense with ownership verification via account.
     * @param id - The expense ID
     * @param userId - The user ID for ownership check
     * @param expense - The fields to update
     * @returns The updated expense if found and owned by user, undefined otherwise
     */
    async updateRecurringExpense(id: number, userId: string, expense: Partial<InsertRecurringExpense>): Promise<RecurringExpense | undefined> {
        // Get user's accounts for ownership check
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));

        // Verify ownership before update
        const existing = await db.select()
            .from(recurringExpenses)
            .where(and(
                eq(recurringExpenses.id, id),
                inArray(recurringExpenses.accountId, userAccounts)
            ))
            .limit(1);

        if (existing.length === 0) {
            return undefined; // Not found or not owned
        }

        const [updated] = await db.update(recurringExpenses)
            .set(expense)
            .where(eq(recurringExpenses.id, id))
            .returning();
        return updated;
    }

    /**
     * Delete a recurring expense with ownership verification via account.
     * @param id - The expense ID
     * @param userId - The user ID for ownership check
     * @returns true if deleted, false if not found or not owned
     */
    async deleteRecurringExpense(id: number, userId: string): Promise<boolean> {
        // Get user's accounts for ownership check
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));

        // Verify ownership before delete
        const existing = await db.select()
            .from(recurringExpenses)
            .where(and(
                eq(recurringExpenses.id, id),
                inArray(recurringExpenses.accountId, userAccounts)
            ))
            .limit(1);

        if (existing.length === 0) {
            return false; // Not found or not owned
        }

        await db.delete(recurringExpenses).where(eq(recurringExpenses.id, id));
        return true;
    }

    /**
     * Upsert a recurring expense check with authorization.
     * Uses atomic onConflictDoUpdate to avoid TOCTOU race conditions.
     * @param check - The check data
     * @param userId - The user ID for ownership verification
     * @throws Error if recurring expense not owned by user
     */
    async upsertRecurringExpenseCheck(check: InsertRecurringExpenseCheck, userId: string): Promise<void> {
        // Verify ownership of the recurring expense via account
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
        const ownedExpense = await db.select({ id: recurringExpenses.id })
            .from(recurringExpenses)
            .where(and(
                eq(recurringExpenses.id, check.recurringExpenseId),
                inArray(recurringExpenses.accountId, userAccounts)
            ))
            .limit(1);

        if (ownedExpense.length === 0) {
            throw new Error(`Authorization failed: Recurring expense ${check.recurringExpenseId} not found or does not belong to user`);
        }

        // Atomic upsert using onConflictDoUpdate
        // Requires unique constraint on (recurringExpenseId, month, year)
        await db.insert(recurringExpenseChecks)
            .values(check)
            .onConflictDoUpdate({
                target: [recurringExpenseChecks.recurringExpenseId, recurringExpenseChecks.month, recurringExpenseChecks.year],
                set: {
                    status: check.status,
                    transactionId: check.transactionId,
                    matchedDate: check.matchedDate,
                    matchedAmount: check.matchedAmount
                }
            });
    }

    async getRecurringExpenseChecks(userId: string, year: number, month: number): Promise<RecurringExpenseCheck[]> {
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
        const userExpenses = db.select({ id: recurringExpenses.id }).from(recurringExpenses).where(inArray(recurringExpenses.accountId, userAccounts));
        return await db.select().from(recurringExpenseChecks).where(and(
            eq(recurringExpenseChecks.year, year),
            eq(recurringExpenseChecks.month, month),
            inArray(recurringExpenseChecks.recurringExpenseId, userExpenses)
        ));
    }

    async getAllRecurringExpenseChecks(userId: string): Promise<RecurringExpenseCheck[]> {
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
        const userExpenses = db.select({ id: recurringExpenses.id }).from(recurringExpenses).where(inArray(recurringExpenses.accountId, userAccounts));
        return await db.select().from(recurringExpenseChecks).where(inArray(recurringExpenseChecks.recurringExpenseId, userExpenses));
    }
}
