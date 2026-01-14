/**
 * Planned Expense Repository
 * Handles planned expense operations.
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

    async createPlannedExpense(expense: InsertPlannedExpense): Promise<PlannedExpense> {
        const [created] = await db.insert(plannedExpenses).values(expense).returning();
        return created;
    }

    async updatePlannedExpense(id: number, expense: Partial<InsertPlannedExpense>): Promise<PlannedExpense | undefined> {
        const [updated] = await db.update(plannedExpenses)
            .set(expense)
            .where(eq(plannedExpenses.id, id))
            .returning();
        return updated;
    }

    async deletePlannedExpense(id: number): Promise<void> {
        await db.delete(plannedExpenses).where(eq(plannedExpenses.id, id));
    }
}
