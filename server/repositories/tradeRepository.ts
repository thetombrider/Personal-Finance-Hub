/**
 * Trade Repository
 * Handles trade operations with linked transactions and category auto-creation.
 */

import { eq, inArray, and, sql } from "drizzle-orm";
import { db } from "./base";
import {
    type Trade,
    type InsertTrade,
    trades,
    holdings,
    transactions,
    categories,
    accounts,
} from "@shared/schema";

export class TradeRepository {
    async getTrades(userId: string): Promise<Trade[]> {
        const userHoldings = db.select({ id: holdings.id }).from(holdings).where(eq(holdings.userId, userId));
        return await db.select().from(trades).where(inArray(trades.holdingId, userHoldings));
    }

    async getTradesByHolding(holdingId: number): Promise<Trade[]> {
        return await db.select().from(trades).where(eq(trades.holdingId, holdingId));
    }

    async getTrade(id: number): Promise<Trade | undefined> {
        const result = await db.select().from(trades).where(eq(trades.id, id));
        return result[0];
    }

    async getExportableTrades(userId: string) {
        const userHoldings = db.select({ id: holdings.id }).from(holdings).where(eq(holdings.userId, userId));

        return await db.select({
            date: trades.date,
            ticker: holdings.ticker,
            type: trades.type,
            quantity: trades.quantity,
            pricePerUnit: trades.pricePerUnit,
            totalAmount: trades.totalAmount,
            fees: trades.fees,
            Account: accounts.name,
            TransactionID: trades.transactionId
        })
            .from(trades)
            .innerJoin(holdings, eq(trades.holdingId, holdings.id))
            .leftJoin(accounts, eq(trades.accountId, accounts.id))
            .where(inArray(trades.holdingId, userHoldings));
    }

    async createTrade(trade: InsertTrade): Promise<Trade> {
        return await db.transaction(async (tx) => {
            let transactionId: number | undefined;

            if (trade.accountId) {
                // RECONCILIATION: Check if a matching transaction already exists
                const finalType = trade.type === 'buy' ? 'expense' : 'income';
                const totalAmount = trade.totalAmount.toString();

                // Try to find an existing transaction with same account, date, amount, and type
                // We use a small date window or exact date? The import usually preserves date.
                // Let's try exact date match first.
                const existingTx = await tx.select().from(transactions).where(
                    and(
                        eq(transactions.accountId, trade.accountId),
                        eq(transactions.type, finalType),
                        // Robust Date Match: Compare just the date part
                        sql`DATE(${transactions.date}) = DATE(${trade.date})`,
                        // Robust Amount Match: Allow small floating point differences
                        sql`ABS(${transactions.amount} - ${totalAmount}) < 0.01`
                    )
                ).limit(1);

                if (existingTx.length > 0) {
                    // Use existing transaction!!
                    transactionId = existingTx[0].id;
                } else {
                    // Create NEW transaction (existing logic)
                    const holding = await tx.select().from(holdings).where(eq(holdings.id, trade.holdingId)).limit(1);
                    const userId = holding[0]?.userId;

                    if (userId) {
                        // Find or create "Investimenti" category
                        const cats = await tx.select().from(categories).where(
                            and(eq(categories.name, 'Investimenti'), eq(categories.userId, userId))
                        ).limit(1);
                        let categoryId = cats[0]?.id;

                        if (!categoryId) {
                            const [newCat] = await tx.insert(categories).values({
                                name: "Investimenti",
                                type: "expense",
                                color: "#0ea5e9",
                                icon: "TrendingUp",
                                userId: userId
                            }).returning();
                            categoryId = newCat.id;
                        }

                        if (categoryId) {
                            const holdingTicker = holding[0]?.ticker || 'Unknown';
                            const description = `${trade.type === 'buy' ? 'Buy' : 'Sell'} ${parseFloat(trade.quantity.toString()).toFixed(4)} ${holdingTicker} @ ${parseFloat(trade.pricePerUnit.toString()).toFixed(2)}`;

                            const [newTx] = await tx.insert(transactions).values({
                                date: trade.date,
                                amount: trade.totalAmount.toString(),
                                description: description,
                                accountId: trade.accountId,
                                categoryId: categoryId,
                                type: finalType
                            }).returning();
                            transactionId = newTx.id;
                        }
                    }
                }
            }

            const [newTrade] = await tx.insert(trades).values({ ...trade, transactionId }).returning();
            return newTrade;
        });
    }

    async createTrades(tradesData: InsertTrade[]): Promise<Trade[]> {
        const results: Trade[] = [];
        for (const trade of tradesData) {
            // DEDUPLICATION: Check if this specific trade already exists
            // Matching on holding, date, quantity, price, type
            const existing = await db.select().from(trades).where(
                and(
                    eq(trades.holdingId, trade.holdingId),
                    eq(trades.type, trade.type),
                    // Robust Date Match
                    sql`DATE(${trades.date}) = DATE(${trade.date})`,
                    // Robust Amount Matching
                    sql`ABS(${trades.quantity} - ${trade.quantity}) < 0.000001`,
                    sql`ABS(${trades.pricePerUnit} - ${trade.pricePerUnit}) < 0.0001`
                )
            ).limit(1);

            if (existing.length > 0) {
                // Skip duplicate trade
                continue;
            }

            results.push(await this.createTrade(trade));
        }
        return results;
    }

    async updateTrade(id: number, trade: Partial<InsertTrade>): Promise<Trade | undefined> {
        return await db.transaction(async (tx) => {
            const existingTrades = await tx.select().from(trades).where(eq(trades.id, id));
            if (existingTrades.length === 0) return undefined;
            const existingTrade = existingTrades[0];

            let transactionId = existingTrade.transactionId;
            const accountId = trade.accountId !== undefined ? trade.accountId : existingTrade.accountId;

            if (accountId) {
                const holdingId = trade.holdingId || existingTrade.holdingId;
                const holding = await tx.select().from(holdings).where(eq(holdings.id, holdingId)).limit(1);
                const userId = holding[0]?.userId;
                const ticker = holding[0]?.ticker || 'Unknown';

                if (userId) {
                    const cats = await tx.select().from(categories).where(
                        and(eq(categories.name, 'Investimenti'), eq(categories.userId, userId))
                    ).limit(1);
                    let categoryId = cats[0]?.id;

                    if (!categoryId) {
                        const [newCat] = await tx.insert(categories).values({
                            name: "Investimenti",
                            type: "expense",
                            color: "#0ea5e9",
                            icon: "TrendingUp",
                            userId: userId
                        }).returning();
                        categoryId = newCat.id;
                    }

                    if (categoryId) {
                        const finalType = trade.type || existingTrade.type;
                        const finalDate = (trade.date !== undefined && trade.date !== null && trade.date !== "")
                            ? trade.date
                            : existingTrade.date;
                        const finalQty = trade.quantity !== undefined ? parseFloat(trade.quantity.toString()) : parseFloat(existingTrade.quantity.toString());
                        const finalPrice = trade.pricePerUnit !== undefined ? parseFloat(trade.pricePerUnit.toString()) : parseFloat(existingTrade.pricePerUnit.toString());
                        const finalTotalAmount = trade.totalAmount !== undefined ? trade.totalAmount.toString() : existingTrade.totalAmount.toString();

                        const description = `${finalType === 'buy' ? 'Buy' : 'Sell'} ${finalQty.toFixed(4)} ${ticker} @ ${finalPrice.toFixed(2)}`;
                        const type = finalType === 'buy' ? 'expense' : 'income';

                        if (transactionId) {
                            await tx.update(transactions).set({
                                date: finalDate,
                                amount: finalTotalAmount,
                                description: description,
                                accountId: accountId,
                                categoryId: categoryId,
                                type: type
                            }).where(eq(transactions.id, transactionId));
                        } else {
                            const [newTx] = await tx.insert(transactions).values({
                                date: finalDate,
                                amount: finalTotalAmount,
                                description: description,
                                accountId: accountId,
                                categoryId: categoryId,
                                type: type
                            }).returning();
                            transactionId = newTx.id;
                        }
                    }
                }
            } else {
                if (trade.accountId === null && transactionId) {
                    await tx.delete(transactions).where(eq(transactions.id, transactionId));
                    transactionId = null;
                }
            }

            const [updatedTrade] = await tx.update(trades).set({ ...trade, transactionId }).where(eq(trades.id, id)).returning();
            return updatedTrade;
        });
    }

    async deleteTrade(id: number): Promise<void> {
        await db.transaction(async (tx) => {
            const trade = await tx.select().from(trades).where(eq(trades.id, id)).limit(1);
            if (trade.length === 0) return;

            const transactionId = trade[0].transactionId;

            await tx.delete(trades).where(eq(trades.id, id));

            if (transactionId) {
                await tx.delete(transactions).where(eq(transactions.id, transactionId));
            }
        });
    }

    async deleteTrades(ids: number[]): Promise<void> {
        if (ids.length === 0) return;

        await db.transaction(async (tx) => {
            const tradesToDelete = await tx.select().from(trades).where(inArray(trades.id, ids));
            const transactionIds = tradesToDelete.map(t => t.transactionId).filter(id => id !== null) as number[];

            await tx.delete(trades).where(inArray(trades.id, ids));

            if (transactionIds.length > 0) {
                await tx.delete(transactions).where(inArray(transactions.id, transactionIds));
            }
        });
    }
}
