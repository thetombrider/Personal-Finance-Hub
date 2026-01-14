/**
 * Import Staging Repository
 * Handles transaction staging for bank imports.
 * All mutating methods require userId for ownership verification via account.
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

    /**
     * Get import staging by external transaction ID with ownership verification.
     * @param gcId - The external transaction ID (e.g., GoCardless ID)
     * @param userId - The user ID for ownership check via account
     * @returns The staging record if found and owned by user, undefined otherwise
     */
    async getImportStagingByTransactionId(gcId: string, userId: string): Promise<ImportStaging | undefined> {
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
        const result = await db.select().from(importStaging).where(
            and(
                eq(importStaging.externalId, gcId),
                inArray(importStaging.accountId, userAccounts)
            )
        );
        return result[0];
    }

    async createImportStaging(staging: InsertImportStaging): Promise<ImportStaging> {
        const [created] = await db.insert(importStaging).values(staging).returning();
        return created;
    }

    /**
     * Delete a staging record with ownership verification.
     * @param id - The staging record ID
     * @param userId - The user ID for ownership check
     * @throws Error if record not found or not owned by user
     */
    async deleteImportStaging(id: number, userId: string): Promise<void> {
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
        const existing = await db.select().from(importStaging).where(
            and(eq(importStaging.id, id), inArray(importStaging.accountId, userAccounts))
        );

        if (existing.length === 0) {
            throw new Error(`Authorization failed: Import staging ${id} not found or does not belong to user`);
        }

        await db.delete(importStaging).where(eq(importStaging.id, id));
    }

    /**
     * Clear all staging records for an account with ownership verification.
     * @param accountId - The account ID to clear
     * @param userId - The user ID for ownership check
     * @throws Error if account not owned by user
     */
    async clearImportStaging(accountId: number, userId: string): Promise<void> {
        // Verify account ownership
        const account = await db.select().from(accounts).where(
            and(eq(accounts.id, accountId), eq(accounts.userId, userId))
        ).limit(1);

        if (account.length === 0) {
            throw new Error(`Authorization failed: Account ${accountId} not found or does not belong to user`);
        }

        await db.delete(importStaging).where(eq(importStaging.accountId, accountId));
    }

    /**
     * Update staging record status with ownership verification.
     * @param id - The staging record ID
     * @param userId - The user ID for ownership check
     * @param status - The new status
     * @throws Error if record not found or not owned by user
     */
    async updateImportStagingStatus(id: number, userId: string, status: string): Promise<void> {
        const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
        const existing = await db.select().from(importStaging).where(
            and(eq(importStaging.id, id), inArray(importStaging.accountId, userAccounts))
        );

        if (existing.length === 0) {
            throw new Error(`Authorization failed: Import staging ${id} not found or does not belong to user`);
        }

        await db.update(importStaging).set({ status }).where(eq(importStaging.id, id));
    }
}
