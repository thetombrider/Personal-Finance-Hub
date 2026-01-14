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

    async updateRecurringExpense(id: number, expense: Partial<InsertRecurringExpense>): Promise<RecurringExpense | undefined> {
        const [updated] = await db.update(recurringExpenses)
            .set(expense)
            .where(eq(recurringExpenses.id, id))
            .returning();
        return updated;
    }

    async deleteRecurringExpense(id: number): Promise<void> {
        await db.delete(recurringExpenses).where(eq(recurringExpenses.id, id));
    }

    async upsertRecurringExpenseCheck(check: InsertRecurringExpenseCheck): Promise<void> {
        const existing = await db.select().from(recurringExpenseChecks).where(and(
            eq(recurringExpenseChecks.recurringExpenseId, check.recurringExpenseId),
            eq(recurringExpenseChecks.month, check.month),
            eq(recurringExpenseChecks.year, check.year)
        ));

        if (existing.length > 0) {
            await db.update(recurringExpenseChecks)
                .set(check)
                .where(eq(recurringExpenseChecks.id, existing[0].id));
        } else {
            await db.insert(recurringExpenseChecks).values(check);
        }
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
