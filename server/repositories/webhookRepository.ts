/**
 * Webhook Repository
 * Handles webhooks and webhook logs with encryption for secrets.
 */

import { eq, sql } from "drizzle-orm";
import { db, encrypt, decrypt } from "./base";
import {
    type Webhook,
    type InsertWebhook,
    type WebhookLog,
    type InsertWebhookLog,
    webhooks,
    webhookLogs,
} from "@shared/schema";

export class WebhookRepository {
    async getWebhook(id: string): Promise<Webhook | undefined> {
        const result = await db.select().from(webhooks).where(eq(webhooks.id, id));
        if (result[0]) {
            if (result[0].secret) {
                result[0].secret = decrypt(result[0].secret);
            }
        }
        return result[0];
    }

    async getWebhooks(userId: string): Promise<Webhook[]> {
        const results = await db.select().from(webhooks).where(eq(webhooks.userId, userId));
        return results.map(w => {
            if (w.secret) {
                w.secret = decrypt(w.secret);
            }
            return w;
        });
    }

    async createWebhook(webhook: InsertWebhook): Promise<Webhook> {
        const data = { ...webhook };
        if (data.secret) {
            data.secret = encrypt(data.secret);
        }
        const [created] = await db.insert(webhooks).values(data).returning();
        if (created.secret) {
            created.secret = decrypt(created.secret);
        }
        return created;
    }

    async updateWebhook(id: string, webhook: Partial<InsertWebhook>): Promise<Webhook | undefined> {
        const data = { ...webhook };
        if (data.secret) {
            data.secret = encrypt(data.secret);
        }
        const [updated] = await db.update(webhooks)
            .set(data)
            .where(eq(webhooks.id, id))
            .returning();

        if (updated && updated.secret) {
            updated.secret = decrypt(updated.secret);
        }
        return updated;
    }

    async deleteWebhook(id: string): Promise<void> {
        await db.transaction(async (tx) => {
            await tx.delete(webhookLogs).where(eq(webhookLogs.webhookId, id));
            await tx.delete(webhooks).where(eq(webhooks.id, id));
        });
    }

    async updateWebhookLastUsed(id: string): Promise<void> {
        await db.update(webhooks)
            .set({ lastUsedAt: new Date().toISOString() })
            .where(eq(webhooks.id, id));
    }

    async getWebhookLogs(webhookId: string, limit: number = 50): Promise<WebhookLog[]> {
        return await db.select()
            .from(webhookLogs)
            .where(eq(webhookLogs.webhookId, webhookId))
            .orderBy(sql`${webhookLogs.createdAt} DESC`)
            .limit(limit);
    }

    async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
        const [created] = await db.insert(webhookLogs).values(log).returning();
        return created;
    }
}
