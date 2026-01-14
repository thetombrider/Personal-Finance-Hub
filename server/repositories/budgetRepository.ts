/**
 * Budget Repository
 * Handles monthly budget operations.
 */

import { eq, and, inArray } from "drizzle-orm";
import { db } from "./base";
import {
    type MonthlyBudget,
    type InsertMonthlyBudget,
    monthlyBudgets,
    categories,
} from "@shared/schema";

export class BudgetRepository {
    async getMonthlyBudgets(userId: string, year: number, month: number): Promise<MonthlyBudget[]> {
        const userCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId));
        return await db.select()
            .from(monthlyBudgets)
            .where(and(
                eq(monthlyBudgets.year, year),
                eq(monthlyBudgets.month, month),
                inArray(monthlyBudgets.categoryId, userCategories)
            ));
    }

    async getMonthlyBudgetsByYear(userId: string, year: number): Promise<MonthlyBudget[]> {
        const userCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId));
        return await db.select()
            .from(monthlyBudgets)
            .where(and(
                eq(monthlyBudgets.year, year),
                inArray(monthlyBudgets.categoryId, userCategories)
            ));
    }

    async upsertMonthlyBudget(budget: InsertMonthlyBudget): Promise<MonthlyBudget> {
        const existing = await db.select()
            .from(monthlyBudgets)
            .where(and(
                eq(monthlyBudgets.categoryId, budget.categoryId),
                eq(monthlyBudgets.year, budget.year),
                eq(monthlyBudgets.month, budget.month)
            ));

        if (existing.length > 0) {
            const [updated] = await db.update(monthlyBudgets)
                .set({ amount: budget.amount })
                .where(eq(monthlyBudgets.id, existing[0].id))
                .returning();
            return updated;
        }

        const [created] = await db.insert(monthlyBudgets).values(budget).returning();
        return created;
    }
}
