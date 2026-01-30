import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, serial, integer, index, jsonb, boolean, uniqueIndex } from "drizzle-orm/pg-core";
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
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  oidcId: varchar("oidc_id").unique(),
  appearanceSettings: jsonb("appearance_settings").$type<{ font: string }>(),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingSkipped: boolean("onboarding_skipped").default(false),
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
  gocardlessAccountId: varchar("gocardless_account_id").unique(),
  bankConnectionId: integer("bank_connection_id").references(() => bankConnections.id, { onDelete: "set null" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  lastSynced: timestamp("last_synced", { mode: "string" }),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true }).extend({
  type: z.enum(["checking", "savings", "credit", "investment", "cash"]),
});
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  icon: text("icon"),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  excludeFromProjections: boolean("exclude_from_projections").default(false),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true }).extend({
  type: z.enum(["income", "expense", "transfer"]),
  excludeFromProjections: z.boolean().optional().default(false),
});
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  date: timestamp("date", { mode: "string" }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
  type: varchar("type", { length: 10 }).notNull(),
  linkedTransactionId: integer("linked_transaction_id"),
  externalId: varchar("external_id").unique(),
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
  currentPrice: decimal("current_price", { precision: 12, scale: 4 }),
  lastPriceUpdate: timestamp("last_price_update", { mode: "string" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
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
  accountId: integer("account_id").references(() => accounts.id),
  transactionId: integer("transaction_id").references(() => transactions.id),
});

export const insertTradeSchema = createInsertSchema(trades).omit({ id: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

export const monthlyBudgets = pgTable("monthly_budgets", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull().default("0"),
}, (table) => ({
  // Unique constraint for onConflictDoUpdate in upsertMonthlyBudget
  uniqueCategoryYearMonth: uniqueIndex("idx_monthly_budgets_unique").on(table.categoryId, table.year, table.month),
}));

export const insertMonthlyBudgetSchema = createInsertSchema(monthlyBudgets).omit({ id: true });
export type InsertMonthlyBudget = z.infer<typeof insertMonthlyBudgetSchema>;
export type MonthlyBudget = typeof monthlyBudgets.$inferSelect;

export const recurringExpenses = pgTable("recurring_expenses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  interval: varchar("interval", { length: 20 }).notNull().default("monthly"),
  dayOfMonth: integer("day_of_month").notNull(),
  startDate: timestamp("start_date", { mode: "string" }).notNull(),
  endDate: timestamp("end_date", { mode: "string" }),
  lastGenerated: timestamp("last_generated", { mode: "string" }),
  active: boolean("active").notNull().default(true),
  matchPattern: text("match_pattern"),
  isVariableAmount: boolean("is_variable_amount").notNull().default(false),
});

export const insertRecurringExpenseSchema = createInsertSchema(recurringExpenses).omit({ id: true });
export type InsertRecurringExpense = z.infer<typeof insertRecurringExpenseSchema>;
export type RecurringExpense = typeof recurringExpenses.$inferSelect;

export const recurringExpenseChecks = pgTable("recurring_expense_checks", {
  id: serial("id").primaryKey(),
  recurringExpenseId: integer("recurring_expense_id").notNull().references(() => recurringExpenses.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  status: varchar("status", { length: 20 }).notNull(), // MATCHED, MISSING, PENDING
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  matchedDate: timestamp("matched_date", { mode: "string" }),
  matchedAmount: decimal("matched_amount", { precision: 12, scale: 2 }),
}, (table) => ({
  // Unique constraint for atomic upsert in upsertRecurringExpenseCheck
  uniqueExpenseMonthYear: uniqueIndex("idx_recurring_expense_checks_unique").on(table.recurringExpenseId, table.month, table.year),
}));

export const insertRecurringExpenseCheckSchema = createInsertSchema(recurringExpenseChecks).omit({ id: true });
export type InsertRecurringExpenseCheck = z.infer<typeof insertRecurringExpenseCheckSchema>;
export type RecurringExpenseCheck = typeof recurringExpenseChecks.$inferSelect;

export const plannedExpenses = pgTable("planned_expenses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  date: timestamp("date", { mode: "string" }).notNull(),
  notes: text("notes"),
});

export const insertPlannedExpenseSchema = createInsertSchema(plannedExpenses).omit({ id: true });
export type InsertPlannedExpense = z.infer<typeof insertPlannedExpenseSchema>;
export type PlannedExpense = typeof plannedExpenses.$inferSelect;

export const bankConnections = pgTable("bank_connections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requisitionId: text("requisition_id").notNull(),
  institutionId: text("institution_id").notNull(),
  status: text("status").notNull(), // INIT, LINKED, EXPIRED
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});


export const insertBankConnectionSchema = createInsertSchema(bankConnections).omit({ id: true, createdAt: true });
export type InsertBankConnection = z.infer<typeof insertBankConnectionSchema>;
export type BankConnection = typeof bankConnections.$inferSelect;

export const importStaging = pgTable("import_staging", {
  id: serial("id").primaryKey(),
  date: timestamp("date", { mode: "string" }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  externalId: varchar("external_id").unique(),
  suggestedCategoryId: integer("suggested_category_id"),
  rawData: jsonb("raw_data"),
  status: text("status").notNull().default("pending"), // pending, reconciled, dismissed
});

export const insertImportStagingSchema = createInsertSchema(importStaging).omit({ id: true });
export type InsertImportStaging = z.infer<typeof insertImportStagingSchema>;
export type ImportStaging = typeof importStaging.$inferSelect;

// Webhook configurations - each user can have multiple webhooks
export const webhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // "tally", "zapier", "custom", etc.
  secret: varchar("secret"), // Optional HMAC secret for signature verification
  config: jsonb("config"), // Type-specific configuration
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at", { mode: "string" }),
});

export const insertWebhookSchema = createInsertSchema(webhooks).omit({ id: true, createdAt: true, lastUsedAt: true });
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

// Webhook request logs for debugging and auditing
// Webhook request logs - intended for debugging but may contain PII
// NOTE: Request/Response bodies are redacted for PII before storage, but treat this table as sensitive
export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  webhookId: varchar("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull(), // "success", "error", "invalid_signature"
  requestBody: jsonb("request_body"),
  responseBody: jsonb("response_body"),
  errorMessage: text("error_message"),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({ id: true, createdAt: true });
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (table) => ({
  uniqueNameUser: uniqueIndex("idx_tags_name_user").on(table.name, table.userId),
}));

export const insertTagSchema = createInsertSchema(tags).omit({ id: true });
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;

export const transactionTags = pgTable("transaction_tags", {
  transactionId: integer("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: uniqueIndex("pk_transaction_tags").on(table.transactionId, table.tagId), // Simulating composite PK constraint/index behavior
}));

export const insertTransactionTagSchema = createInsertSchema(transactionTags);
export type InsertTransactionTag = z.infer<typeof insertTransactionTagSchema>;
export type TransactionTag = typeof transactionTags.$inferSelect;
