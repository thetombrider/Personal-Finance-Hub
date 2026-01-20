import { eq, and, inArray, sql } from "drizzle-orm";
import { db } from "./base";
import { tags, transactionTags, type InsertTag, type Tag } from "@shared/schema";

export const tagRepository = {
    // Get all tags for a user
    async getTags(userId: string): Promise<Tag[]> {
        return await db.select().from(tags).where(eq(tags.userId, userId)).orderBy(tags.name);
    },

    // Get a single tag by ID
    async getTag(id: number): Promise<Tag | undefined> {
        const [tag] = await db.select().from(tags).where(eq(tags.id, id));
        return tag;
    },

    // Create a new tag
    async createTag(tag: InsertTag): Promise<Tag> {
        const [newTag] = await db.insert(tags).values(tag).returning();
        return newTag;
    },

    // Update a tag
    async updateTag(id: number, tagData: Partial<InsertTag>): Promise<Tag | undefined> {
        const [updatedTag] = await db
            .update(tags)
            .set(tagData)
            .where(eq(tags.id, id))
            .returning();
        return updatedTag;
    },

    // Delete a tag
    // Delete a tag
    async deleteTag(id: number, userId: string): Promise<void> {
        const [tag] = await db.select().from(tags).where(eq(tags.id, id));
        if (!tag || tag.userId !== userId) {
            throw new Error("Unauthorized or Tag not found");
        }
        await db.delete(tags).where(eq(tags.id, id));
    },

    // Update tags for a single transaction (Sync strategy: Replace all)
    async updateTransactionTags(transactionId: number, tagIds: number[]): Promise<void> {
        await db.transaction(async (tx) => {
            // 1. Remove all existing tags for this transaction
            await tx.delete(transactionTags).where(eq(transactionTags.transactionId, transactionId));

            // 2. Insert new tags if any
            if (tagIds.length > 0) {
                await tx.insert(transactionTags).values(
                    tagIds.map(tagId => ({ transactionId, tagId }))
                );
            }
        });
    },

    // Batch Add: Add specific tags to multiple transactions (ignore duplicates)
    async addTagsToTransactions(transactionIds: number[], tagIds: number[]): Promise<void> {
        if (transactionIds.length === 0 || tagIds.length === 0) return;

        await db.transaction(async (tx) => {
            // We can use ON CONFLICT DO NOTHING to avoid duplicates with the composite key
            const values = [];
            for (const txId of transactionIds) {
                for (const tagId of tagIds) {
                    values.push({ transactionId: txId, tagId });
                }
            }

            await tx.insert(transactionTags)
                .values(values)
                .onConflictDoNothing();
        });
    },

    // Batch Remove: Remove specific tags from multiple transactions
    async removeTagsFromTransactions(transactionIds: number[], tagIds: number[]): Promise<void> {
        if (transactionIds.length === 0 || tagIds.length === 0) return;

        await db.delete(transactionTags).where(
            and(
                inArray(transactionTags.transactionId, transactionIds),
                inArray(transactionTags.tagId, tagIds)
            )
        );
    }
};
