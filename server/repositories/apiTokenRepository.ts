/**
 * API Token Repository
 * Handles API token CRUD and lookup by hash for MCP authentication.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "./base";
import {
    type ApiToken,
    type InsertApiToken,
    apiTokens,
} from "@shared/schema";

export class ApiTokenRepository {
    async getTokensByUser(userId: string): Promise<ApiToken[]> {
        return await db.select().from(apiTokens).where(eq(apiTokens.userId, userId));
    }

    async getTokenByHash(tokenHash: string): Promise<ApiToken | undefined> {
        const result = await db.select().from(apiTokens).where(eq(apiTokens.tokenHash, tokenHash));
        return result[0];
    }

    async createToken(token: InsertApiToken): Promise<ApiToken> {
        const [created] = await db.insert(apiTokens).values(token).returning();
        return created;
    }

    async deleteToken(id: string, userId: string): Promise<boolean> {
        const result = await db.delete(apiTokens)
            .where(eq(apiTokens.id, id))
            .returning({ id: apiTokens.id, userId: apiTokens.userId });
        if (result.length === 0) return false;
        return result[0].userId === userId;
    }

    async updateLastUsed(id: string): Promise<void> {
        await db.update(apiTokens)
            .set({ lastUsedAt: new Date().toISOString() })
            .where(eq(apiTokens.id, id));
    }
}
