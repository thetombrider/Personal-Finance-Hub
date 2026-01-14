/**
 * Holding Repository
 * Handles investment holdings operations.
 */

import { eq, and } from "drizzle-orm";
import { db } from "./base";
import {
    type Holding,
    type InsertHolding,
    holdings,
} from "@shared/schema";

export class HoldingRepository {
    async getHoldings(userId: string): Promise<Holding[]> {
        return await db.select().from(holdings).where(eq(holdings.userId, userId));
    }

    async getHolding(id: number): Promise<Holding | undefined> {
        const result = await db.select().from(holdings).where(eq(holdings.id, id));
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

    async updateHolding(id: number, holding: Partial<InsertHolding>): Promise<Holding | undefined> {
        const updateData = holding.ticker
            ? { ...holding, ticker: holding.ticker.toUpperCase() }
            : holding;
        const result = await db.update(holdings).set(updateData).where(eq(holdings.id, id)).returning();
        return result[0];
    }

    async deleteHolding(id: number): Promise<void> {
        await db.delete(holdings).where(eq(holdings.id, id));
    }
}
