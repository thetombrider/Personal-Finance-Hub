/**
 * Category Repository
 * Handles all category-related database operations.
 */

import { eq, and } from "drizzle-orm";
import { db } from "./base";
import {
    type Category,
    type InsertCategory,
    categories,
} from "@shared/schema";

export class CategoryRepository {
    async getCategories(userId: string): Promise<Category[]> {
        return await db.select().from(categories).where(eq(categories.userId, userId));
    }

    async getCategory(id: number): Promise<Category | undefined> {
        const result = await db.select().from(categories).where(eq(categories.id, id));
        return result[0];
    }

    async createCategory(category: InsertCategory): Promise<Category> {
        const result = await db.insert(categories).values(category).returning();
        return result[0];
    }

    async createCategories(categoriesData: InsertCategory[]): Promise<Category[]> {
        if (categoriesData.length === 0) return [];

        const results: Category[] = [];
        for (const category of categoriesData) {
            if (!category.userId) continue;

            const existing = await db.select().from(categories).where(
                and(
                    eq(categories.userId, category.userId),
                    eq(categories.name, category.name),
                    eq(categories.type, category.type)
                )
            ).limit(1);

            if (existing.length > 0) {
                continue;
            }

            const [created] = await db.insert(categories).values(category).returning();
            results.push(created);
        }
        return results;
    }

    async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
        const result = await db.update(categories).set(category).where(eq(categories.id, id)).returning();
        return result[0];
    }

    async deleteCategory(id: number): Promise<void> {
        await db.delete(categories).where(eq(categories.id, id));
    }

    async getAllCategories(): Promise<Category[]> {
        return await db.select().from(categories);
    }
}
