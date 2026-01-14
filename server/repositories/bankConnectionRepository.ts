/**
 * Bank Connection Repository
 * Handles bank connection operations.
 */

import { eq } from "drizzle-orm";
import { db } from "./base";
import {
    type BankConnection,
    type InsertBankConnection,
    bankConnections,
} from "@shared/schema";

export class BankConnectionRepository {
    async getBankConnections(userId: string): Promise<BankConnection[]> {
        return await db.select().from(bankConnections).where(eq(bankConnections.userId, userId));
    }

    async getBankConnectionByRequisitionId(requisitionId: string): Promise<BankConnection | undefined> {
        const result = await db.select().from(bankConnections).where(eq(bankConnections.requisitionId, requisitionId));
        return result[0];
    }

    async createBankConnection(connection: InsertBankConnection): Promise<BankConnection> {
        const [created] = await db.insert(bankConnections).values(connection).returning();
        return created;
    }

    async updateBankConnection(id: number, connection: Partial<InsertBankConnection>): Promise<BankConnection | undefined> {
        const [updated] = await db.update(bankConnections)
            .set(connection)
            .where(eq(bankConnections.id, id))
            .returning();
        return updated;
    }

    async deleteBankConnection(id: number): Promise<void> {
        await db.delete(bankConnections).where(eq(bankConnections.id, id));
    }
}
