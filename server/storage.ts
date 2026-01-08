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
  insertRecurringExpenseSchema,
  recurringExpenseChecks,
  type RecurringExpenseCheck,
  type InsertRecurringExpenseCheck,
  plannedExpenses,
  type PlannedExpense,
  type InsertPlannedExpense,
  bankConnections,
  type BankConnection,
  type InsertBankConnection,
  importStaging,
  type ImportStaging,
  type InsertImportStaging,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, inArray, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByOidcId(oidcId: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User | undefined>;

  // Accounts
  getAccounts(userId: string): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  createAccounts(accounts: InsertAccount[]): Promise<Account[]>;
  updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<void>;
  getAllAccounts(): Promise<Account[]>;

  // Categories
  getCategories(userId: string): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  createCategories(categories: InsertCategory[]): Promise<Category[]>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<void>;
  getAllCategories(): Promise<Category[]>;

  // Transactions
  getTransactions(userId: string): Promise<Transaction[]>;
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
  getHoldings(userId: string): Promise<Holding[]>;
  getHolding(id: number): Promise<Holding | undefined>;
  getHolding(id: number): Promise<Holding | undefined>;
  getHoldingByTicker(ticker: string, userId: string): Promise<Holding | undefined>;
  getGlobalHoldingByTicker(ticker: string): Promise<Holding | undefined>;
  createHolding(holding: InsertHolding): Promise<Holding>;
  updateHolding(id: number, holding: Partial<InsertHolding>): Promise<Holding | undefined>;
  deleteHolding(id: number): Promise<void>;

  // Trades
  getTrades(userId: string): Promise<Trade[]>;
  getTradesByHolding(holdingId: number): Promise<Trade[]>;
  getTrade(id: number): Promise<Trade | undefined>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  createTrades(trades: InsertTrade[]): Promise<Trade[]>;
  updateTrade(id: number, trade: Partial<InsertTrade>): Promise<Trade | undefined>;
  deleteTrade(id: number): Promise<void>;
  deleteTrades(ids: number[]): Promise<void>;

  // Monthly Budgets
  getMonthlyBudgets(userId: string, year: number, month: number): Promise<MonthlyBudget[]>;
  getMonthlyBudgetsByYear(userId: string, year: number): Promise<MonthlyBudget[]>;
  upsertMonthlyBudget(budget: InsertMonthlyBudget): Promise<MonthlyBudget>;

  // Recurring Expenses
  getRecurringExpenses(userId: string): Promise<RecurringExpense[]>;
  getActiveRecurringExpenses(userId: string): Promise<RecurringExpense[]>;
  createRecurringExpense(expense: InsertRecurringExpense): Promise<RecurringExpense>;
  updateRecurringExpense(id: number, expense: Partial<InsertRecurringExpense>): Promise<RecurringExpense | undefined>;
  deleteRecurringExpense(id: number): Promise<void>;
  upsertRecurringExpenseCheck(check: InsertRecurringExpenseCheck): Promise<void>;
  getRecurringExpenseChecks(userId: string, year: number, month: number): Promise<RecurringExpenseCheck[]>;
  getAllRecurringExpenseChecks(userId: string): Promise<RecurringExpenseCheck[]>;

  // Planned Expenses
  getPlannedExpenses(userId: string, year: number, month: number): Promise<PlannedExpense[]>;
  getPlannedExpensesByYear(userId: string, year: number): Promise<PlannedExpense[]>;
  createPlannedExpense(expense: InsertPlannedExpense): Promise<PlannedExpense>;
  updatePlannedExpense(id: number, expense: Partial<InsertPlannedExpense>): Promise<PlannedExpense | undefined>;
  deletePlannedExpense(id: number): Promise<void>;

  // Bank Connections
  getBankConnections(userId: string): Promise<BankConnection[]>;
  getBankConnectionByRequisitionId(requisitionId: string): Promise<BankConnection | undefined>;
  createBankConnection(connection: InsertBankConnection): Promise<BankConnection>;
  updateBankConnection(id: number, connection: Partial<InsertBankConnection>): Promise<BankConnection | undefined>;
  deleteBankConnection(id: number): Promise<void>;

  // Import Staging
  getImportStaging(userId: string, accountId?: number): Promise<ImportStaging[]>;
  getImportStagingByTransactionId(gcId: string): Promise<ImportStaging | undefined>;
  createImportStaging(staging: InsertImportStaging): Promise<ImportStaging>;
  deleteImportStaging(id: number): Promise<void>;
  clearImportStaging(accountId: number): Promise<void>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByOidcId(oidcId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.oidcId, oidcId));
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

  async getAllAccounts(): Promise<Account[]> {
    return await db.select().from(accounts);
  }

  // Categories
  async getCategories(userId: string): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.userId, userId));
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

  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  // Transactions
  async getTransactions(userId: string): Promise<Transaction[]> {
    const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
    return await db.select().from(transactions).where(inArray(transactions.accountId, userAccounts));
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
    return await db.transaction(async (tx) => {
      const [fromTransaction] = await tx.insert(transactions).values({
        date: data.date,
        amount: data.amount,
        description: data.description,
        accountId: data.fromAccountId,
        categoryId: data.categoryId,
        type: "expense",
      }).returning();

      const [toTransaction] = await tx.insert(transactions).values({
        date: data.date,
        amount: data.amount,
        description: data.description,
        accountId: data.toAccountId,
        categoryId: data.categoryId,
        type: "income",
        linkedTransactionId: fromTransaction.id,
      }).returning();

      await tx.update(transactions)
        .set({ linkedTransactionId: toTransaction.id })
        .where(eq(transactions.id, fromTransaction.id));

      fromTransaction.linkedTransactionId = toTransaction.id;

      return { fromTransaction, toTransaction };
    });
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
  async getHoldings(userId: string): Promise<Holding[]> {
    return await db.select().from(holdings).where(eq(holdings.userId, userId));
  }

  async getHolding(id: number): Promise<Holding | undefined> {
    const result = await db.select().from(holdings).where(eq(holdings.id, id));
    return result[0];
  }

  async getHoldingByTicker(ticker: string, userId: string): Promise<Holding | undefined> {
    const result = await db.select().from(holdings).where(and(eq(holdings.ticker, ticker.toUpperCase()), eq(holdings.userId, userId)));
    return result[0];
  }

  async getGlobalHoldingByTicker(ticker: string): Promise<Holding | undefined> {
    const result = await db.select().from(holdings).where(eq(holdings.ticker, ticker.toUpperCase())).limit(1);
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
  async getMonthlyBudgets(userId: string, year: number, month: number): Promise<MonthlyBudget[]> {
    const userCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId));
    return await db.select()
      .from(monthlyBudgets)
      .where(and(
        eq(monthlyBudgets.year, year),
        eq(monthlyBudgets.month, month),
        inArray(monthlyBudgets.categoryId, userCategories)
      ));
  }

  async getMonthlyBudgetsByYear(userId: string, year: number): Promise<MonthlyBudget[]> {
    const userCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId));
    return await db.select()
      .from(monthlyBudgets)
      .where(and(
        eq(monthlyBudgets.year, year),
        inArray(monthlyBudgets.categoryId, userCategories)
      ));
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
  async getRecurringExpenses(userId: string): Promise<RecurringExpense[]> {
    const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
    return await db.select().from(recurringExpenses).where(inArray(recurringExpenses.accountId, userAccounts));
  }

  async getActiveRecurringExpenses(userId: string): Promise<RecurringExpense[]> {
    const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
    return await db.select().from(recurringExpenses).where(and(
      eq(recurringExpenses.active, true),
      inArray(recurringExpenses.accountId, userAccounts)
    ));
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

  async upsertRecurringExpenseCheck(check: InsertRecurringExpenseCheck): Promise<void> {
    // Check if exists
    const existing = await db.select().from(recurringExpenseChecks).where(and(
      eq(recurringExpenseChecks.recurringExpenseId, check.recurringExpenseId),
      eq(recurringExpenseChecks.month, check.month),
      eq(recurringExpenseChecks.year, check.year)
    ));

    if (existing.length > 0) {
      await db.update(recurringExpenseChecks)
        .set(check)
        .where(eq(recurringExpenseChecks.id, existing[0].id));
    } else {
      await db.insert(recurringExpenseChecks).values(check);
    }
  }

  async getRecurringExpenseChecks(userId: string, year: number, month: number): Promise<RecurringExpenseCheck[]> {
    const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
    const userExpenses = db.select({ id: recurringExpenses.id }).from(recurringExpenses).where(inArray(recurringExpenses.accountId, userAccounts));
    return await db.select().from(recurringExpenseChecks).where(and(
      eq(recurringExpenseChecks.year, year),
      eq(recurringExpenseChecks.month, month),
      inArray(recurringExpenseChecks.recurringExpenseId, userExpenses)
    ));
  }

  async getAllRecurringExpenseChecks(userId: string): Promise<RecurringExpenseCheck[]> {
    const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
    const userExpenses = db.select({ id: recurringExpenses.id }).from(recurringExpenses).where(inArray(recurringExpenses.accountId, userAccounts));
    return await db.select().from(recurringExpenseChecks).where(inArray(recurringExpenseChecks.recurringExpenseId, userExpenses));
  }

  // Planned Expenses
  async getPlannedExpensesByYear(userId: string, year: number): Promise<PlannedExpense[]> {
    const startDate = `${year}-01-01`;
    const endDate = `${year + 1}-01-01`;
    const userCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId));

    return await db.select()
      .from(plannedExpenses)
      .where(and(
        sql`${plannedExpenses.date} >= ${startDate}`,
        sql`${plannedExpenses.date} < ${endDate}`,
        inArray(plannedExpenses.categoryId, userCategories)
      ));
  }

  async getPlannedExpenses(userId: string, year: number, month: number): Promise<PlannedExpense[]> {
    // We need to filter by date range for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    // Calculate end date (start of next month)
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
    const userCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId));

    return await db.select()
      .from(plannedExpenses)
      .where(and(
        sql`${plannedExpenses.date} >= ${startDate}`,
        sql`${plannedExpenses.date} < ${endDate}`,
        inArray(plannedExpenses.categoryId, userCategories)
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

  // Bank Connections
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

  // Import Staging
  async getImportStaging(userId: string, accountId?: number): Promise<ImportStaging[]> {
    const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));

    if (accountId) {
      // additional check to ensure accountId belongs to user
      return await db.select().from(importStaging).where(and(
        eq(importStaging.accountId, accountId),
        inArray(importStaging.accountId, userAccounts)
      ));
    }
    return await db.select().from(importStaging).where(inArray(importStaging.accountId, userAccounts));
  }

  async getImportStagingByTransactionId(gcId: string): Promise<ImportStaging | undefined> {
    const result = await db.select().from(importStaging).where(eq(importStaging.gocardlessTransactionId, gcId));
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
}

export const storage = new DatabaseStorage();
