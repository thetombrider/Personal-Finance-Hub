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

    async getAllMonthlyBudgets(userId: string): Promise<MonthlyBudget[]> {
        const userCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId));
        return await db.select()
            .from(monthlyBudgets)
            .where(inArray(monthlyBudgets.categoryId, userCategories));
    }

    async getExportableMonthlyBudgets(userId: string) {
        const userCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId));

        return await db.select({
            year: monthlyBudgets.year,
            month: monthlyBudgets.month,
            amount: monthlyBudgets.amount,
            Category: categories.name
        })
            .from(monthlyBudgets)
            .innerJoin(categories, eq(monthlyBudgets.categoryId, categories.id))
            .where(inArray(monthlyBudgets.categoryId, userCategories));
    }

    /**
     * Upsert a monthly budget with ownership validation.
     * @param userId - The user making the request (for authorization)
     * @param budget - The budget data to upsert
     * @throws Error if category doesn't exist or doesn't belong to user
     */
    async upsertMonthlyBudget(userId: string, budget: InsertMonthlyBudget): Promise<MonthlyBudget> {
        // Verify category ownership before proceeding
        const category = await db.select()
            .from(categories)
            .where(and(
                eq(categories.id, budget.categoryId),
                eq(categories.userId, userId)
            ))
            .limit(1);

        if (category.length === 0) {
            throw new Error(`Authorization failed: Category ${budget.categoryId} not found or does not belong to user`);
        }

        // Atomic upsert using onConflictDoUpdate
        // Requires unique constraint on (categoryId, year, month)
        const result = await db.insert(monthlyBudgets)
            .values(budget)
            .onConflictDoUpdate({
                target: [monthlyBudgets.categoryId, monthlyBudgets.year, monthlyBudgets.month],
                set: { amount: budget.amount }
            })
            .returning();

        if (result.length === 0) {
            throw new Error('Failed to upsert monthly budget: no result returned');
        }

        return result[0];
    }
}
