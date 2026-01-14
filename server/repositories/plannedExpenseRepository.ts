/**
 * Planned Expense Repository
 * Handles planned expense operations.
 * Ownership is verified through category relationship.
 */

import { eq, and, inArray, sql } from "drizzle-orm";
import { db } from "./base";
import {
    type PlannedExpense,
    type InsertPlannedExpense,
    plannedExpenses,
    categories,
} from "@shared/schema";

export class PlannedExpenseRepository {
    async getPlannedExpensesByYear(userId: string, year: number): Promise<PlannedExpense[]> {
        const startDate = `${year}-01-01`;
        const endDate = `${year + 1}-01-01`;
        const userCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId));

        return await db.select()
            .from(plannedExpenses)
            .where(and(
                sql`${plannedExpenses.date} >= ${startDate}`,
                sql`${plannedExpenses.date} < ${endDate}`,
                inArray(plannedExpenses.categoryId, userCategories)
            ));
    }

    async getPlannedExpenses(userId: string, year: number, month: number): Promise<PlannedExpense[]> {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
        const userCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId));

        return await db.select()
            .from(plannedExpenses)
            .where(and(
                sql`${plannedExpenses.date} >= ${startDate}`,
                sql`${plannedExpenses.date} < ${endDate}`,
                inArray(plannedExpenses.categoryId, userCategories)
            ));
    }

    /**
     * Create a planned expense.
     * @throws Error if insert fails to return a result
     */
    async createPlannedExpense(expense: InsertPlannedExpense): Promise<PlannedExpense> {
        const result = await db.insert(plannedExpenses).values(expense).returning();

        if (result.length === 0 || !result[0]) {
            throw new Error(`Failed to create planned expense: no result returned. Input: categoryId=${expense.categoryId}, name=${expense.name}, amount=${expense.amount}`);
        }

        return result[0];
    }

    /**
     * Update a planned expense with ownership verification via category.
     * @param id - The expense ID
     * @param userId - The user ID for ownership check
     * @param expense - The fields to update
     * @returns The updated expense if found and owned by user, undefined otherwise
     */
    async updatePlannedExpense(id: number, userId: string, expense: Partial<InsertPlannedExpense>): Promise<PlannedExpense | undefined> {
        // Get user's categories for ownership check
        const userCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId));

        // First verify the expense belongs to the user (via category)
        const existing = await db.select()
            .from(plannedExpenses)
            .where(and(
                eq(plannedExpenses.id, id),
                inArray(plannedExpenses.categoryId, userCategories)
            ))
            .limit(1);

        if (existing.length === 0) {
            return undefined; // Not found or not owned
        }

        const [updated] = await db.update(plannedExpenses)
            .set(expense)
            .where(eq(plannedExpenses.id, id))
            .returning();
        return updated;
    }

    /**
     * Delete a planned expense with ownership verification via category.
     * @param id - The expense ID
     * @param userId - The user ID for ownership check
     * @returns true if deleted, false if not found or not owned
     */
    async deletePlannedExpense(id: number, userId: string): Promise<boolean> {
        // Get user's categories for ownership check
        const userCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId));

        // Verify ownership before delete
        const existing = await db.select()
            .from(plannedExpenses)
            .where(and(
                eq(plannedExpenses.id, id),
                inArray(plannedExpenses.categoryId, userCategories)
            ))
            .limit(1);

        if (existing.length === 0) {
            return false; // Not found or not owned
        }

        await db.delete(plannedExpenses).where(eq(plannedExpenses.id, id));
        return true;
    }
}
