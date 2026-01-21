/**
 * Storage Facade
 * This file implements the IStorage interface by delegating to domain-specific repositories.
 * The repositories contain the actual database logic, while this facade maintains
 * backwards compatibility with existing code that uses IStorage.
 */

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
  type MonthlyBudget,
  type InsertMonthlyBudget,
  type RecurringExpense,
  type InsertRecurringExpense,
  type RecurringExpenseCheck,
  type InsertRecurringExpenseCheck,
  type PlannedExpense,
  type InsertPlannedExpense,
  type BankConnection,
  type InsertBankConnection,
  type ImportStaging,
  type InsertImportStaging,
  type Webhook,
  type InsertWebhook,
  type WebhookLog,
  type InsertWebhookLog,
  accounts,
  categories,
  transactions,
  holdings,
  trades,
  users,
  monthlyBudgets,
  recurringExpenses,
  recurringExpenseChecks,
  plannedExpenses,
  bankConnections,
  importStaging,
} from "@shared/schema";
import { db } from "./db";
import { eq, inArray } from "drizzle-orm";

// Import repositories
import {
  UserRepository,
  AccountRepository,
  CategoryRepository,
  TransactionRepository,
  HoldingRepository,
  TradeRepository,
  BudgetRepository,
  RecurringExpenseRepository,
  PlannedExpenseRepository,
  BankConnectionRepository,
  ImportStagingRepository,
  WebhookRepository,
} from "./repositories";

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
  getTransactionsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Transaction[]>;
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
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  updateTransactions(ids: number[], transaction: Partial<InsertTransaction> & { tagIds?: number[] }): Promise<Transaction[]>;
  deleteTransaction(id: number): Promise<void>;
  deleteTransactions(ids: number[]): Promise<void>;
  clearTransactions(): Promise<void>;
  clearTransactionsForUser(userId: string): Promise<void>;

  // Holdings
  getHoldings(userId: string): Promise<Holding[]>;
  getHolding(id: number, userId: string): Promise<Holding | undefined>;
  getHoldingByTicker(ticker: string, userId: string): Promise<Holding | undefined>;
  getGlobalHoldingByTicker(ticker: string): Promise<Holding | undefined>;
  createHolding(holding: InsertHolding): Promise<Holding>;
  updateHolding(id: number, userId: string, holding: Partial<InsertHolding>): Promise<Holding | undefined>;
  deleteHolding(id: number, userId: string): Promise<void>;

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
  upsertMonthlyBudget(userId: string, budget: InsertMonthlyBudget): Promise<MonthlyBudget>;

  // Recurring Expenses
  getRecurringExpenses(userId: string): Promise<RecurringExpense[]>;
  getActiveRecurringExpenses(userId: string): Promise<RecurringExpense[]>;
  createRecurringExpense(expense: InsertRecurringExpense): Promise<RecurringExpense>;
  updateRecurringExpense(id: number, userId: string, expense: Partial<InsertRecurringExpense>): Promise<RecurringExpense | undefined>;
  deleteRecurringExpense(id: number, userId: string): Promise<boolean>;
  upsertRecurringExpenseCheck(check: InsertRecurringExpenseCheck, userId: string): Promise<void>;
  getRecurringExpenseChecks(userId: string, year: number, month: number): Promise<RecurringExpenseCheck[]>;
  getAllRecurringExpenseChecks(userId: string): Promise<RecurringExpenseCheck[]>;

  // Planned Expenses
  getPlannedExpenses(userId: string, year: number, month: number): Promise<PlannedExpense[]>;
  getPlannedExpensesByYear(userId: string, year: number): Promise<PlannedExpense[]>;
  getAllPlannedExpenses(userId: string): Promise<PlannedExpense[]>;
  createPlannedExpense(expense: InsertPlannedExpense): Promise<PlannedExpense>;
  updatePlannedExpense(id: number, userId: string, expense: Partial<InsertPlannedExpense>): Promise<PlannedExpense | undefined>;
  deletePlannedExpense(id: number, userId: string): Promise<boolean>;

  // Bank Connections
  getBankConnections(userId: string): Promise<BankConnection[]>;
  getBankConnectionByRequisitionId(requisitionId: string): Promise<BankConnection | undefined>;
  createBankConnection(connection: InsertBankConnection): Promise<BankConnection>;
  updateBankConnection(id: number, connection: Partial<InsertBankConnection>): Promise<BankConnection | undefined>;
  deleteBankConnection(id: number): Promise<void>;

  // Import Staging
  getImportStaging(userId: string, accountId?: number): Promise<ImportStaging[]>;
  getImportStagingByTransactionId(gcId: string, userId: string): Promise<ImportStaging | undefined>;
  createImportStaging(staging: InsertImportStaging): Promise<ImportStaging>;
  deleteImportStaging(id: number, userId: string): Promise<void>;
  clearImportStaging(accountId: number, userId: string): Promise<void>;
  updateImportStagingStatus(id: number, userId: string, status: string): Promise<void>;

  // Webhooks
  getWebhook(id: string): Promise<Webhook | undefined>;
  getWebhooks(userId: string): Promise<Webhook[]>;
  createWebhook(webhook: InsertWebhook): Promise<Webhook>;
  updateWebhook(id: string, webhook: Partial<InsertWebhook>): Promise<Webhook | undefined>;
  deleteWebhook(id: string): Promise<void>;
  updateWebhookLastUsed(id: string): Promise<void>;
  getWebhookLogs(webhookId: string, limit?: number): Promise<WebhookLog[]>;
  createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog>;

  // Data Management
  deleteUser(id: string): Promise<void>;
  exportUserData(userId: string, tables?: string[]): Promise<any>;
}

/**
 * DatabaseStorage implements IStorage by delegating to domain-specific repositories.
 * Complex cross-domain operations (deleteUser, exportUserData) remain in this class.
 */
export class DatabaseStorage implements IStorage {
  // Repository instances
  private userRepo = new UserRepository();
  private accountRepo = new AccountRepository();
  private categoryRepo = new CategoryRepository();
  private transactionRepo = new TransactionRepository();
  private holdingRepo = new HoldingRepository();
  private tradeRepo = new TradeRepository();
  private budgetRepo = new BudgetRepository();
  private recurringExpenseRepo = new RecurringExpenseRepository();
  private plannedExpenseRepo = new PlannedExpenseRepository();
  private bankConnectionRepo = new BankConnectionRepository();
  private importStagingRepo = new ImportStagingRepository();
  private webhookRepo = new WebhookRepository();

  // User operations - delegate to UserRepository
  getUser = (id: string) => this.userRepo.getUser(id);
  getUserByUsername = (username: string) => this.userRepo.getUserByUsername(username);
  getUserByEmail = (email: string) => this.userRepo.getUserByEmail(email);
  getUserByOidcId = (oidcId: string) => this.userRepo.getUserByOidcId(oidcId);
  createUser = (user: UpsertUser) => this.userRepo.createUser(user);
  updateUser = (id: string, user: Partial<UpsertUser>) => this.userRepo.updateUser(id, user);

  // Account operations - delegate to AccountRepository
  getAccounts = (userId: string) => this.accountRepo.getAccounts(userId);
  getAccount = (id: number) => this.accountRepo.getAccount(id);
  createAccount = (account: InsertAccount) => this.accountRepo.createAccount(account);
  createAccounts = (accountsData: InsertAccount[]) => this.accountRepo.createAccounts(accountsData);
  updateAccount = (id: number, account: Partial<InsertAccount>) => this.accountRepo.updateAccount(id, account);
  deleteAccount = (id: number) => this.accountRepo.deleteAccount(id);
  getAllAccounts = () => this.accountRepo.getAllAccounts();

  // Category operations - delegate to CategoryRepository
  getCategories = (userId: string) => this.categoryRepo.getCategories(userId);
  getCategory = (id: number) => this.categoryRepo.getCategory(id);
  createCategory = (category: InsertCategory) => this.categoryRepo.createCategory(category);
  createCategories = (categoriesData: InsertCategory[]) => this.categoryRepo.createCategories(categoriesData);
  updateCategory = (id: number, category: Partial<InsertCategory>) => this.categoryRepo.updateCategory(id, category);
  deleteCategory = (id: number) => this.categoryRepo.deleteCategory(id);
  getAllCategories = () => this.categoryRepo.getAllCategories();

  // Transaction operations - delegate to TransactionRepository
  getTransactions = (userId: string) => this.transactionRepo.getTransactions(userId);
  getTransactionsByDateRange = (userId: string, startDate: Date, endDate: Date) => this.transactionRepo.getTransactionsByDateRange(userId, startDate, endDate);
  getTransaction = (id: number) => this.transactionRepo.getTransaction(id);
  createTransaction = (transaction: InsertTransaction) => this.transactionRepo.createTransaction(transaction);
  createTransactions = (txs: InsertTransaction[]) => this.transactionRepo.createTransactions(txs);
  createTransfer = (data: { date: string; amount: string; description: string; fromAccountId: number; toAccountId: number; categoryId: number }) => this.transactionRepo.createTransfer(data);
  updateTransaction = (id: number, transaction: Partial<InsertTransaction>) => this.transactionRepo.updateTransaction(id, transaction);
  updateTransaction = (id: number, transaction: Partial<InsertTransaction>) => this.transactionRepo.updateTransaction(id, transaction);
  updateTransactions = (ids: number[], transaction: Partial<InsertTransaction> & { tagIds?: number[] }) => this.transactionRepo.updateTransactions(ids, transaction);
  deleteTransaction = (id: number) => this.transactionRepo.deleteTransaction(id);
  deleteTransactions = (ids: number[]) => this.transactionRepo.deleteTransactions(ids);
  clearTransactions = () => this.transactionRepo.clearTransactions();
  clearTransactionsForUser = (userId: string) => this.transactionRepo.clearTransactionsForUser(userId);

  // Holding operations - delegate to HoldingRepository
  getHoldings = (userId: string) => this.holdingRepo.getHoldings(userId);
  getHolding = (id: number, userId: string) => this.holdingRepo.getHolding(id, userId);
  getHoldingByTicker = (ticker: string, userId: string) => this.holdingRepo.getHoldingByTicker(ticker, userId);
  getGlobalHoldingByTicker = (ticker: string) => this.holdingRepo.getGlobalHoldingByTicker(ticker);
  createHolding = (holding: InsertHolding) => this.holdingRepo.createHolding(holding);
  updateHolding = (id: number, userId: string, holding: Partial<InsertHolding>) => this.holdingRepo.updateHolding(id, userId, holding);
  deleteHolding = (id: number, userId: string) => this.holdingRepo.deleteHolding(id, userId);

  // Trade operations - delegate to TradeRepository
  getTrades = (userId: string) => this.tradeRepo.getTrades(userId);
  getTradesByHolding = (holdingId: number) => this.tradeRepo.getTradesByHolding(holdingId);
  getTrade = (id: number) => this.tradeRepo.getTrade(id);
  createTrade = (trade: InsertTrade) => this.tradeRepo.createTrade(trade);
  createTrades = (tradesData: InsertTrade[]) => this.tradeRepo.createTrades(tradesData);
  updateTrade = (id: number, trade: Partial<InsertTrade>) => this.tradeRepo.updateTrade(id, trade);
  deleteTrade = (id: number) => this.tradeRepo.deleteTrade(id);
  deleteTrades = (ids: number[]) => this.tradeRepo.deleteTrades(ids);

  // Budget operations - delegate to BudgetRepository
  getMonthlyBudgets = (userId: string, year: number, month: number) => this.budgetRepo.getMonthlyBudgets(userId, year, month);
  getMonthlyBudgetsByYear = (userId: string, year: number) => this.budgetRepo.getMonthlyBudgetsByYear(userId, year);
  upsertMonthlyBudget = (userId: string, budget: InsertMonthlyBudget) => this.budgetRepo.upsertMonthlyBudget(userId, budget);

  // Recurring Expense operations - delegate to RecurringExpenseRepository
  getRecurringExpenses = (userId: string) => this.recurringExpenseRepo.getRecurringExpenses(userId);
  getActiveRecurringExpenses = (userId: string) => this.recurringExpenseRepo.getActiveRecurringExpenses(userId);
  createRecurringExpense = (expense: InsertRecurringExpense) => this.recurringExpenseRepo.createRecurringExpense(expense);
  updateRecurringExpense = (id: number, userId: string, expense: Partial<InsertRecurringExpense>) => this.recurringExpenseRepo.updateRecurringExpense(id, userId, expense);
  deleteRecurringExpense = (id: number, userId: string) => this.recurringExpenseRepo.deleteRecurringExpense(id, userId);
  upsertRecurringExpenseCheck = (check: InsertRecurringExpenseCheck, userId: string) => this.recurringExpenseRepo.upsertRecurringExpenseCheck(check, userId);
  getRecurringExpenseChecks = (userId: string, year: number, month: number) => this.recurringExpenseRepo.getRecurringExpenseChecks(userId, year, month);
  getAllRecurringExpenseChecks = (userId: string) => this.recurringExpenseRepo.getAllRecurringExpenseChecks(userId);

  // Planned Expense operations - delegate to PlannedExpenseRepository
  getPlannedExpenses = (userId: string, year: number, month: number) => this.plannedExpenseRepo.getPlannedExpenses(userId, year, month);
  getPlannedExpensesByYear = (userId: string, year: number) => this.plannedExpenseRepo.getPlannedExpensesByYear(userId, year);
  getAllPlannedExpenses = (userId: string) => this.plannedExpenseRepo.getAllPlannedExpenses(userId);
  createPlannedExpense = (expense: InsertPlannedExpense) => this.plannedExpenseRepo.createPlannedExpense(expense);
  updatePlannedExpense = (id: number, userId: string, expense: Partial<InsertPlannedExpense>) => this.plannedExpenseRepo.updatePlannedExpense(id, userId, expense);
  deletePlannedExpense = (id: number, userId: string) => this.plannedExpenseRepo.deletePlannedExpense(id, userId);

  // Bank Connection operations - delegate to BankConnectionRepository
  getBankConnections = (userId: string) => this.bankConnectionRepo.getBankConnections(userId);
  getBankConnectionByRequisitionId = (requisitionId: string) => this.bankConnectionRepo.getBankConnectionByRequisitionId(requisitionId);
  createBankConnection = (connection: InsertBankConnection) => this.bankConnectionRepo.createBankConnection(connection);
  updateBankConnection = (id: number, connection: Partial<InsertBankConnection>) => this.bankConnectionRepo.updateBankConnection(id, connection);
  deleteBankConnection = (id: number) => this.bankConnectionRepo.deleteBankConnection(id);

  // Import Staging operations - delegate to ImportStagingRepository
  getImportStaging = (userId: string, accountId?: number) => this.importStagingRepo.getImportStaging(userId, accountId);
  getImportStagingByTransactionId = (gcId: string, userId: string) => this.importStagingRepo.getImportStagingByTransactionId(gcId, userId);
  createImportStaging = (staging: InsertImportStaging) => this.importStagingRepo.createImportStaging(staging);
  deleteImportStaging = (id: number, userId: string) => this.importStagingRepo.deleteImportStaging(id, userId);
  clearImportStaging = (accountId: number, userId: string) => this.importStagingRepo.clearImportStaging(accountId, userId);
  updateImportStagingStatus = (id: number, userId: string, status: string) => this.importStagingRepo.updateImportStagingStatus(id, userId, status);

  // Webhook operations - delegate to WebhookRepository
  getWebhook = (id: string) => this.webhookRepo.getWebhook(id);
  getWebhooks = (userId: string) => this.webhookRepo.getWebhooks(userId);
  createWebhook = (webhook: InsertWebhook) => this.webhookRepo.createWebhook(webhook);
  updateWebhook = (id: string, webhook: Partial<InsertWebhook>) => this.webhookRepo.updateWebhook(id, webhook);
  deleteWebhook = (id: string) => this.webhookRepo.deleteWebhook(id);
  updateWebhookLastUsed = (id: string) => this.webhookRepo.updateWebhookLastUsed(id);
  getWebhookLogs = (webhookId: string, limit?: number) => this.webhookRepo.getWebhookLogs(webhookId, limit);
  createWebhookLog = (log: InsertWebhookLog) => this.webhookRepo.createWebhookLog(log);

  // Complex cross-domain operations remain in this facade

  async deleteUser(id: string): Promise<void> {
    // Get user's resources to query child tables
    const userAccounts = await this.getAccounts(id);
    const userAccountIds = userAccounts.map(a => a.id);
    const userCategories = await this.getCategories(id);
    const userCategoryIds = userCategories.map(c => c.id);
    const userHoldings = await this.getHoldings(id);
    const userHoldingIds = userHoldings.map(h => h.id);

    // Delete deepest children first

    // Trades (linked to Holdings)
    if (userHoldingIds.length > 0) {
      await db.delete(trades).where(inArray(trades.holdingId, userHoldingIds));
    }

    // Staging and Transactions (linked to Accounts)
    if (userAccountIds.length > 0) {
      await db.delete(importStaging).where(inArray(importStaging.accountId, userAccountIds));
      await db.delete(transactions).where(inArray(transactions.accountId, userAccountIds));

      // Recurring Expenses (linked to Accounts)
      const userRecurringExpenses = await db.select({ id: recurringExpenses.id })
        .from(recurringExpenses)
        .where(inArray(recurringExpenses.accountId, userAccountIds));
      const recurringExpenseIds = userRecurringExpenses.map(r => r.id);

      if (recurringExpenseIds.length > 0) {
        await db.delete(recurringExpenseChecks).where(inArray(recurringExpenseChecks.recurringExpenseId, recurringExpenseIds));
        await db.delete(recurringExpenses).where(inArray(recurringExpenses.accountId, userAccountIds));
      }
    }

    // Budget items (linked to Categories)
    if (userCategoryIds.length > 0) {
      await db.delete(monthlyBudgets).where(inArray(monthlyBudgets.categoryId, userCategoryIds));
      await db.delete(plannedExpenses).where(inArray(plannedExpenses.categoryId, userCategoryIds));
    }

    // Delete middle layer
    await db.delete(holdings).where(eq(holdings.userId, id));
    await db.delete(bankConnections).where(eq(bankConnections.userId, id));
    await db.delete(accounts).where(eq(accounts.userId, id));
    await db.delete(categories).where(eq(categories.userId, id));

    // Delete User
    await db.delete(users).where(eq(users.id, id));
  }

  async exportUserData(userId: string, tables?: string[]): Promise<any> {
    const data: any = {};

    const shouldExport = (table: string) => !tables || tables.includes(table);

    // 1. User Profile
    if (shouldExport('User')) {
      const user = await this.getUser(userId);
      if (user) {
        // Exclude sensitive data
        const { password, ...safeUser } = user;
        data.User = [safeUser];
      }
    }

    // 2. Core Entities
    if (shouldExport('Accounts')) {
      data.Accounts = await this.accountRepo.getExportableAccounts(userId);
    }

    if (shouldExport('Categories')) {
      data.Categories = await this.getCategories(userId);
    }

    // 3. Transactions & Imports
    if (shouldExport('Transactions')) {
      data.Transactions = await this.transactionRepo.getExportableTransactions(userId);
    }

    if (shouldExport('ImportStaging')) {
      data.ImportStaging = await this.getImportStaging(userId);
    }

    // 4. Portfolio
    if (shouldExport('Holdings')) {
      data.Holdings = await this.getHoldings(userId);
    }

    if (shouldExport('Trades')) {
      data.Trades = await this.tradeRepo.getExportableTrades(userId);
    }

    // 5. Connections
    if (shouldExport('BankConnections')) {
      data.BankConnections = await this.getBankConnections(userId);
    }

    if (shouldExport('Webhooks')) {
      data.Webhooks = await this.getWebhooks(userId);
    }

    // 6. Budgets
    if (shouldExport('MonthlyBudgets') || shouldExport('PlannedExpenses')) {
      if (shouldExport('MonthlyBudgets')) {
        data.MonthlyBudgets = await this.budgetRepo.getExportableMonthlyBudgets(userId);
      }

      if (shouldExport('PlannedExpenses')) {
        data.PlannedExpenses = await this.plannedExpenseRepo.getExportablePlannedExpenses(userId);
      }
    }

    // 7. Recurring Expenses
    if (shouldExport('RecurringExpenses') || shouldExport('RecurringExpenseChecks')) {
      if (shouldExport('RecurringExpenses')) {
        data.RecurringExpenses = await this.recurringExpenseRepo.getExportableRecurringExpenses(userId);
      }

      if (shouldExport('RecurringExpenseChecks')) {
        data.RecurringExpenseChecks = await this.recurringExpenseRepo.getAllRecurringExpenseChecks(userId);
      }
    }

    return data;
  }
}

export const storage = new DatabaseStorage();
