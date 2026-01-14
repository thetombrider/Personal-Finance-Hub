/**
 * Import Staging Repository
 * Handles transaction staging for bank imports.
 */

import { eq, and, inArray } from "drizzle-orm";
import { db } from "./base";
import {
    type ImportStaging,
    type InsertImportStaging,
    importStaging,
    accounts,
} from "@shared/schema";

export class ImportStagingRepository {
    async getImportStaging(userId: string, accountId?: number): Promise<ImportStaging[]> {
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));

        if (accountId) {
            return await db.select().from(importStaging).where(and(
                eq(importStaging.accountId, accountId),
                inArray(importStaging.accountId, userAccounts)
            ));
        }
        return await db.select().from(importStaging).where(inArray(importStaging.accountId, userAccounts));
    }

    async getImportStagingByTransactionId(gcId: string): Promise<ImportStaging | undefined> {
        const result = await db.select().from(importStaging).where(eq(importStaging.externalId, gcId));
        return result[0];
    }

    async createImportStaging(staging: InsertImportStaging): Promise<ImportStaging> {
        const [created] = await db.insert(importStaging).values(staging).returning();
        return created;
    }

    async deleteImportStaging(id: number): Promise<void> {
        await db.delete(importStaging).where(eq(importStaging.id, id));
    }

    async clearImportStaging(accountId: number): Promise<void> {
        await db.delete(importStaging).where(eq(importStaging.accountId, accountId));
    }

    async updateImportStagingStatus(id: number, status: string): Promise<void> {
        await db.update(importStaging).set({ status }).where(eq(importStaging.id, id));
    }
}
