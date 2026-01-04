import {
  type Account,
  type InsertAccount,
  type Category,
  type InsertCategory,
  type Transaction,
  type InsertTransaction,
  type Holding,
  type InsertHolding,
  type Trade,
  type InsertTrade,
  type User,
  type UpsertUser,
  accounts,
  categories,
  transactions,
  holdings,
  trades,
  users,
  monthlyBudgets,
  type MonthlyBudget,
  type InsertMonthlyBudget,
  recurringExpenses,
  type RecurringExpense,
  type InsertRecurringExpense,
  plannedExpenses,
  type PlannedExpense,
  type InsertPlannedExpense
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, inArray, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User | undefined>;

  // Accounts
  getAccounts(): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  createAccounts(accounts: InsertAccount[]): Promise<Account[]>;
  updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  createCategories(categories: InsertCategory[]): Promise<Category[]>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<void>;

  // Transactions
  getTransactions(): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  createTransactions(transactions: InsertTransaction[]): Promise<Transaction[]>;
  createTransfer(data: {
    date: string;
    amount: string;
    description: string;
    fromAccountId: number;
    toAccountId: number;
    categoryId: number;
  }): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<void>;
  deleteTransactions(ids: number[]): Promise<void>;
  clearTransactions(): Promise<void>;

  // Holdings
  getHoldings(): Promise<Holding[]>;
  getHolding(id: number): Promise<Holding | undefined>;
  getHoldingByTicker(ticker: string): Promise<Holding | undefined>;
  createHolding(holding: InsertHolding): Promise<Holding>;
  updateHolding(id: number, holding: Partial<InsertHolding>): Promise<Holding | undefined>;
  deleteHolding(id: number): Promise<void>;

  // Trades
  getTrades(): Promise<Trade[]>;
  getTradesByHolding(holdingId: number): Promise<Trade[]>;
  getTrade(id: number): Promise<Trade | undefined>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  createTrades(trades: InsertTrade[]): Promise<Trade[]>;
  updateTrade(id: number, trade: Partial<InsertTrade>): Promise<Trade | undefined>;
  deleteTrade(id: number): Promise<void>;
  deleteTrades(ids: number[]): Promise<void>;
  deleteTrades(ids: number[]): Promise<void>;

  // Monthly Budgets
  getMonthlyBudgets(year: number, month: number): Promise<MonthlyBudget[]>;
  getMonthlyBudgetsByYear(year: number): Promise<MonthlyBudget[]>;
  upsertMonthlyBudget(budget: InsertMonthlyBudget): Promise<MonthlyBudget>;

  // Recurring Expenses
  getRecurringExpenses(): Promise<RecurringExpense[]>;
  getActiveRecurringExpenses(): Promise<RecurringExpense[]>;
  createRecurringExpense(expense: InsertRecurringExpense): Promise<RecurringExpense>;
  updateRecurringExpense(id: number, expense: Partial<InsertRecurringExpense>): Promise<RecurringExpense | undefined>;
  deleteRecurringExpense(id: number): Promise<void>;

  // Planned Expenses
  getPlannedExpenses(year: number, month: number): Promise<PlannedExpense[]>;
  createPlannedExpense(expense: InsertPlannedExpense): Promise<PlannedExpense>;
  updatePlannedExpense(id: number, expense: Partial<InsertPlannedExpense>): Promise<PlannedExpense | undefined>;
  deletePlannedExpense(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return user;
  }


  // Accounts
  async getAccounts(): Promise<Account[]> {
    return await db.select().from(accounts);
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
    const result = await db.insert(accounts).values(accountsData).returning();
    return result;
  }

  async updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account | undefined> {
    const result = await db.update(accounts).set(account).where(eq(accounts.id, id)).returning();
    return result[0];
  }

  async deleteAccount(id: number): Promise<void> {
    await db.delete(accounts).where(eq(accounts.id, id));
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id));
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  async createCategories(categoriesData: InsertCategory[]): Promise<Category[]> {
    if (categoriesData.length === 0) return [];
    const result = await db.insert(categories).values(categoriesData).returning();
    return result;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const result = await db.update(categories).set(category).where(eq(categories.id, id)).returning();
    return result[0];
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions);
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id));
    return result[0];
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(transaction).returning();
    return result[0];
  }

  async createTransactions(txs: InsertTransaction[]): Promise<Transaction[]> {
    if (txs.length === 0) return [];
    const result = await db.insert(transactions).values(txs).returning();
    return result;
  }

  async createTransfer(data: {
    date: string;
    amount: string;
    description: string;
    fromAccountId: number;
    toAccountId: number;
    categoryId: number;
  }): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }> {
    const [fromTransaction] = await db.insert(transactions).values({
      date: data.date,
      amount: data.amount,
      description: data.description,
      accountId: data.fromAccountId,
      categoryId: data.categoryId,
      type: "expense",
    }).returning();

    const [toTransaction] = await db.insert(transactions).values({
      date: data.date,
      amount: data.amount,
      description: data.description,
      accountId: data.toAccountId,
      categoryId: data.categoryId,
      type: "income",
      linkedTransactionId: fromTransaction.id,
    }).returning();

    await db.update(transactions)
      .set({ linkedTransactionId: toTransaction.id })
      .where(eq(transactions.id, fromTransaction.id));

    fromTransaction.linkedTransactionId = toTransaction.id;

    return { fromTransaction, toTransaction };
  }

  async updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const result = await db.update(transactions).set(transaction).where(eq(transactions.id, id)).returning();
    return result[0];
  }

  async deleteTransaction(id: number): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  async deleteTransactions(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(transactions).where(inArray(transactions.id, ids));
  }

  async clearTransactions(): Promise<void> {
    await db.delete(transactions);
  }

  // Holdings
  async getHoldings(): Promise<Holding[]> {
    return await db.select().from(holdings);
  }

  async getHolding(id: number): Promise<Holding | undefined> {
    const result = await db.select().from(holdings).where(eq(holdings.id, id));
    return result[0];
  }

  async getHoldingByTicker(ticker: string): Promise<Holding | undefined> {
    const result = await db.select().from(holdings).where(eq(holdings.ticker, ticker.toUpperCase()));
    return result[0];
  }

  async createHolding(holding: InsertHolding): Promise<Holding> {
    const result = await db.insert(holdings).values({
      ...holding,
      ticker: holding.ticker.toUpperCase()
    }).returning();
    return result[0];
  }

  async updateHolding(id: number, holding: Partial<InsertHolding>): Promise<Holding | undefined> {
    const updateData = holding.ticker
      ? { ...holding, ticker: holding.ticker.toUpperCase() }
      : holding;
    const result = await db.update(holdings).set(updateData).where(eq(holdings.id, id)).returning();
    return result[0];
  }

  async deleteHolding(id: number): Promise<void> {
    await db.delete(holdings).where(eq(holdings.id, id));
  }

  // Trades
  async getTrades(): Promise<Trade[]> {
    return await db.select().from(trades);
  }

  async getTradesByHolding(holdingId: number): Promise<Trade[]> {
    return await db.select().from(trades).where(eq(trades.holdingId, holdingId));
  }

  async getTrade(id: number): Promise<Trade | undefined> {
    const result = await db.select().from(trades).where(eq(trades.id, id));
    return result[0];
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const result = await db.insert(trades).values(trade).returning();
    return result[0];
  }

  async createTrades(tradesData: InsertTrade[]): Promise<Trade[]> {
    if (tradesData.length === 0) return [];
    const result = await db.insert(trades).values(tradesData).returning();
    return result;
  }

  async updateTrade(id: number, trade: Partial<InsertTrade>): Promise<Trade | undefined> {
    const result = await db.update(trades).set(trade).where(eq(trades.id, id)).returning();
    return result[0];
  }

  async deleteTrade(id: number): Promise<void> {
    await db.delete(trades).where(eq(trades.id, id));
  }

  async deleteTrades(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(trades).where(inArray(trades.id, ids));
  }

  // Monthly Budgets
  async getMonthlyBudgets(year: number, month: number): Promise<MonthlyBudget[]> {
    return await db.select()
      .from(monthlyBudgets)
      .where(and(
        eq(monthlyBudgets.year, year),
      ));
  }

  async getMonthlyBudgetsByYear(year: number): Promise<MonthlyBudget[]> {
    return await db.select()
      .from(monthlyBudgets)
      .where(eq(monthlyBudgets.year, year));
  }

  async upsertMonthlyBudget(budget: InsertMonthlyBudget): Promise<MonthlyBudget> {
    const existing = await db.select()
      .from(monthlyBudgets)
      .where(and(
        eq(monthlyBudgets.categoryId, budget.categoryId),
        eq(monthlyBudgets.year, budget.year),
        eq(monthlyBudgets.month, budget.month)
      ));

    if (existing.length > 0) {
      const [updated] = await db.update(monthlyBudgets)
        .set({ amount: budget.amount })
        .where(eq(monthlyBudgets.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(monthlyBudgets).values(budget).returning();
    return created;
  }

  // Recurring Expenses
  async getRecurringExpenses(): Promise<RecurringExpense[]> {
    return await db.select().from(recurringExpenses);
  }

  async getActiveRecurringExpenses(): Promise<RecurringExpense[]> {
    return await db.select().from(recurringExpenses).where(eq(recurringExpenses.active, true));
  }

  async createRecurringExpense(expense: InsertRecurringExpense): Promise<RecurringExpense> {
    const [created] = await db.insert(recurringExpenses).values(expense).returning();
    return created;
  }

  async updateRecurringExpense(id: number, expense: Partial<InsertRecurringExpense>): Promise<RecurringExpense | undefined> {
    const [updated] = await db.update(recurringExpenses)
      .set(expense)
      .where(eq(recurringExpenses.id, id))
      .returning();
    return updated;
  }

  async deleteRecurringExpense(id: number): Promise<void> {
    await db.delete(recurringExpenses).where(eq(recurringExpenses.id, id));
  }

  // Planned Expenses
  async getPlannedExpensesByYear(year: number): Promise<PlannedExpense[]> {
    const startDate = `${year}-01-01`;
    const endDate = `${year + 1}-01-01`;

    return await db.select()
      .from(plannedExpenses)
      .where(and(
        sql`${plannedExpenses.date} >= ${startDate}`,
        sql`${plannedExpenses.date} < ${endDate}`
      ));
  }

  async getPlannedExpenses(year: number, month: number): Promise<PlannedExpense[]> {
    // We need to filter by date range for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    // Calculate end date (start of next month)
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    return await db.select()
      .from(plannedExpenses)
      .where(and(
        sql`${plannedExpenses.date} >= ${startDate}`,
        sql`${plannedExpenses.date} < ${endDate}`
      ));
  }

  async createPlannedExpense(expense: InsertPlannedExpense): Promise<PlannedExpense> {
    const [created] = await db.insert(plannedExpenses).values(expense).returning();
    return created;
  }

  async updatePlannedExpense(id: number, expense: Partial<InsertPlannedExpense>): Promise<PlannedExpense | undefined> {
    const [updated] = await db.update(plannedExpenses)
      .set(expense)
      .where(eq(plannedExpenses.id, id))
      .returning();
    return updated;
  }

  async deletePlannedExpense(id: number): Promise<void> {
    await db.delete(plannedExpenses).where(eq(plannedExpenses.id, id));
  }
}

export const storage = new DatabaseStorage();
