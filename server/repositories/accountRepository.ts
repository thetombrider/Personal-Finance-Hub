/**
 * Account Repository
 * Handles all account-related database operations.
 */

import { eq, inArray, and } from "drizzle-orm";
import { db } from "./base";
import {
    type Account,
    type InsertAccount,
    accounts,
} from "@shared/schema";

export class AccountRepository {
    async getAccounts(userId: string): Promise<Account[]> {
        return await db.select().from(accounts).where(eq(accounts.userId, userId));
    }

    async getAccount(id: number): Promise<Account | undefined> {
        const result = await db.select().from(accounts).where(eq(accounts.id, id));
        return result[0];
    }

    async createAccount(account: InsertAccount): Promise<Account> {
        const result = await db.insert(accounts).values(account).returning();
        return result[0];
    }

    async createAccounts(accountsData: InsertAccount[]): Promise<Account[]> {
        if (accountsData.length === 0) return [];

        const results: Account[] = [];
        for (const account of accountsData) {
            if (!account.userId) continue;

            const existing = await db.select().from(accounts).where(
                and(
                    eq(accounts.userId, account.userId),
                    eq(accounts.name, account.name)
                )
            ).limit(1);

            if (existing.length > 0) {
                continue;
            }

            const [created] = await db.insert(accounts).values(account).returning();
            results.push(created);
        }
        return results;
    }

    async updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account | undefined> {
        const result = await db.update(accounts).set(account).where(eq(accounts.id, id)).returning();
        return result[0];
    }

    async deleteAccount(id: number): Promise<void> {
        await db.delete(accounts).where(eq(accounts.id, id));
    }

    async getAllAccounts(): Promise<Account[]> {
        return await db.select().from(accounts);
    }
}
