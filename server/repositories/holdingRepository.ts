/**
 * Holding Repository
 * Handles investment holdings operations.
 */

import { eq, and } from "drizzle-orm";
import { db, NotFoundError } from "./base";
import {
    type Holding,
    type InsertHolding,
    holdings,
} from "@shared/schema";

export class HoldingRepository {
    async getHoldings(userId: string): Promise<Holding[]> {
        return await db.select().from(holdings).where(eq(holdings.userId, userId));
    }

    /**
     * Get a holding by ID with ownership verification.
     * @param id - The holding ID
     * @param userId - The user ID for ownership check
     * @returns The holding if found and owned by user, undefined otherwise
     */
    async getHolding(id: number, userId: string): Promise<Holding | undefined> {
        const result = await db.select().from(holdings).where(
            and(eq(holdings.id, id), eq(holdings.userId, userId))
        );
        return result[0];
    }

    async getHoldingByTicker(ticker: string, userId: string): Promise<Holding | undefined> {
        const result = await db.select().from(holdings).where(
            and(eq(holdings.ticker, ticker.toUpperCase()), eq(holdings.userId, userId))
        );
        return result[0];
    }

    async getGlobalHoldingByTicker(ticker: string): Promise<Holding | undefined> {
        const result = await db.select().from(holdings).where(eq(holdings.ticker, ticker.toUpperCase())).limit(1);
        return result[0];
    }

    async createHolding(holding: InsertHolding): Promise<Holding> {
        const result = await db.insert(holdings).values({
            ...holding,
            ticker: holding.ticker.toUpperCase()
        }).returning();
        return result[0];
    }

    /**
     * Update a holding with ownership verification.
     * @param id - The holding ID
     * @param userId - The user ID for ownership check
     * @param holding - The fields to update
     * @returns The updated holding if found and owned by user, undefined otherwise
     */
    async updateHolding(id: number, userId: string, holding: Partial<InsertHolding>): Promise<Holding | undefined> {
        const updateData = holding.ticker
            ? { ...holding, ticker: holding.ticker.toUpperCase() }
            : holding;
        const result = await db.update(holdings)
            .set(updateData)
            .where(and(eq(holdings.id, id), eq(holdings.userId, userId)))
            .returning();
        return result[0];
    }

    /**
     * Delete a holding with ownership verification.
     * @param id - The holding ID
     * @param userId - The user ID for ownership check
     * @throws Error if holding not found or not owned by user
     */
    async deleteHolding(id: number, userId: string): Promise<void> {
        // Verify ownership before delete (keep for consistent error messaging)
        const existing = await this.getHolding(id, userId);
        if (!existing) {
            throw new NotFoundError(`Authorization failed: Holding ${id} not found or does not belong to user`);
        }
        // Atomic delete with ownership check
        await db.delete(holdings).where(and(eq(holdings.id, id), eq(holdings.userId, userId)));
    }
}
