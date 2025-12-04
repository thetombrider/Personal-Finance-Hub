import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, serial, integer, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  startingBalance: decimal("starting_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  color: varchar("color", { length: 7 }).notNull(),
  creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: varchar("type", { length: 10 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  icon: text("icon"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  date: timestamp("date", { mode: "string" }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  accountId: serial("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: serial("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
  type: varchar("type", { length: 10 }).notNull(),
  linkedTransactionId: integer("linked_transaction_id"),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export const holdings = pgTable("holdings", {
  id: serial("id").primaryKey(),
  ticker: varchar("ticker", { length: 20 }).notNull(),
  name: text("name").notNull(),
  assetType: varchar("asset_type", { length: 20 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
});

export const insertHoldingSchema = createInsertSchema(holdings).omit({ id: true });
export type InsertHolding = z.infer<typeof insertHoldingSchema>;
export type Holding = typeof holdings.$inferSelect;

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  holdingId: integer("holding_id").notNull().references(() => holdings.id, { onDelete: "cascade" }),
  date: timestamp("date", { mode: "string" }).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  pricePerUnit: decimal("price_per_unit", { precision: 12, scale: 4 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  fees: decimal("fees", { precision: 12, scale: 2 }).notNull().default("0"),
  type: varchar("type", { length: 10 }).notNull(),
});

export const insertTradeSchema = createInsertSchema(trades).omit({ id: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
