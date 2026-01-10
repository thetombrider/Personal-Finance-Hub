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

  // Data Management
  deleteUser(id: string): Promise<void>;
  exportUserData(userId: string): Promise<any>;
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

    // 1. Get unique accounts involved
    const accountIds = [...new Set(txs.map(t => t.accountId))];

    // 2. Fetch existing transactions for these accounts to check duplicates
    // Optimization: We could filter by date range if inputs are sorted/ranged, 
    // but for now fetching all for these accounts is safer and usually fast enough for personal finance scale.
    const existing = await db.select()
      .from(transactions)
      .where(inArray(transactions.accountId, accountIds));

    // 3. Filter out duplicates
    // Match criteria: Same Account, Date, Amount (exact), and Description (normalized?)
    const toInsert = txs.filter(newTx => {
      const isDuplicate = existing.some(existingTx => {
        if (existingTx.accountId !== newTx.accountId) return false;

        // Date compare (assuming string format YYYY-MM-DDT...)
        const d1 = new Date(existingTx.date).getTime();
        const d2 = new Date(newTx.date).getTime();
        if (Math.abs(d1 - d2) > 86400000) return false; // allow 1 day drift? Or exact? 
        // Let's stick to EXACT date string for CSV imports usually match exactly what they exported.
        // Actually, db stores as ISO string. newTx comes as string. 
        // Ideally strict equality on date string if formats align. 
        // Let's parse to ensure safety.
        if (new Date(existingTx.date).toISOString().split('T')[0] !== new Date(newTx.date).toISOString().split('T')[0]) return false;

        // Amount compare
        if (Math.abs(parseFloat(existingTx.amount) - parseFloat(newTx.amount.toString())) > 0.001) return false;

        // Description compare (exact match for now, maybe case insensitive?)
        if (existingTx.description.toLowerCase().trim() !== newTx.description.toLowerCase().trim()) return false;

        return true;
      });
      return !isDuplicate;
    });

    if (toInsert.length === 0) return [];

    const result = await db.insert(transactions).values(toInsert).returning();
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
    await db.transaction(async (tx) => {
      // Unlink any trades that reference this transaction
      await tx.update(trades)
        .set({ transactionId: null })
        .where(eq(trades.transactionId, id));

      // Delete the transaction
      await tx.delete(transactions).where(eq(transactions.id, id));
    });
  }

  async deleteTransactions(ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    await db.transaction(async (tx) => {
      // Unlink any trades that reference these transactions
      await tx.update(trades)
        .set({ transactionId: null })
        .where(inArray(trades.transactionId, ids));

      // Delete the transactions
      await tx.delete(transactions).where(inArray(transactions.id, ids));
    });
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
    return await db.transaction(async (tx) => {
      let transactionId: number | undefined;
      // If we have an account ID, creating a linked transaction
      if (trade.accountId) {
        // Get userId from holding to ensure we pick/create the right category for THIS user
        const holding = await tx.select().from(holdings).where(eq(holdings.id, trade.holdingId)).limit(1);
        const userId = holding[0]?.userId;

        if (userId) {
          // Find category for transaction (lookup by specific name "Investimenti")
          const cats = await tx.select().from(categories).where(and(eq(categories.name, 'Investimenti'), eq(categories.userId, userId))).limit(1);
          let categoryId = cats[0]?.id;

          // If no "Investimenti" category exists for this user, create one
          if (!categoryId) {
            const [newCat] = await tx.insert(categories).values({
              name: "Investimenti",
              type: "expense",
              color: "#0ea5e9", // Sky blue
              icon: "TrendingUp",
              userId: userId
            }).returning();
            categoryId = newCat.id;
          }

          if (categoryId) {
            // Determine transaction details
            const holdingTicker = holding[0]?.ticker || 'Unknown';
            const description = `${trade.type === 'buy' ? 'Buy' : 'Sell'} ${parseFloat(trade.quantity.toString()).toFixed(4)} ${holdingTicker} @ ${parseFloat(trade.pricePerUnit.toString()).toFixed(2)}`;
            const type = trade.type === 'buy' ? 'expense' : 'income';

            // Create transaction
            const [newTx] = await tx.insert(transactions).values({
              date: trade.date,
              amount: trade.totalAmount.toString(),
              description: description,
              accountId: trade.accountId,
              categoryId: categoryId,
              type: type
            }).returning();
            transactionId = newTx.id;
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
      results.push(await this.createTrade(trade));
    }
    return results;
  }

  async updateTrade(id: number, trade: Partial<InsertTrade>): Promise<Trade | undefined> {
    return await db.transaction(async (tx) => {
      console.log(`[updateTrade] Updating trade ${id} with data:`, trade);
      // Get existing trade first to see if we need to update/create linked transaction
      const existingTrades = await tx.select().from(trades).where(eq(trades.id, id));
      if (existingTrades.length === 0) return undefined;
      const existingTrade = existingTrades[0];

      let transactionId = existingTrade.transactionId;
      const accountId = trade.accountId !== undefined ? trade.accountId : existingTrade.accountId;

      if (accountId) {
        // Get userId from holding (needed for category lookup/creation)
        const holdingId = trade.holdingId || existingTrade.holdingId;
        const holding = await tx.select().from(holdings).where(eq(holdings.id, holdingId)).limit(1);
        const userId = holding[0]?.userId;
        const ticker = holding[0]?.ticker || 'Unknown';

        if (userId) {
          // Find category for transaction (lookup by specific name "Investimenti")
          const cats = await tx.select().from(categories).where(and(eq(categories.name, 'Investimenti'), eq(categories.userId, userId))).limit(1);
          let categoryId = cats[0]?.id;

          // If no "Investimenti" category exists for this user, create one
          if (!categoryId) {
            const [newCat] = await tx.insert(categories).values({
              name: "Investimenti",
              type: "expense",
              color: "#0ea5e9", // Sky blue
              icon: "TrendingUp",
              userId: userId
            }).returning();
            categoryId = newCat.id;
          } if (categoryId) {
            // Determine transaction details
            // Merge existing trade data with updates to calculate final values
            const finalType = trade.type || existingTrade.type;
            // Use new date if provided, valid, and not empty; otherwise fallback to existing
            const finalDate = (trade.date !== undefined && trade.date !== null && trade.date !== "")
              ? trade.date
              : existingTrade.date;

            console.log(`[updateTrade] Transaction Date Logic: Input='${trade.date}', Existing='${existingTrade.date}', Final='${finalDate}'`);

            const finalQty = trade.quantity !== undefined ? parseFloat(trade.quantity.toString()) : parseFloat(existingTrade.quantity.toString());
            const finalPrice = trade.pricePerUnit !== undefined ? parseFloat(trade.pricePerUnit.toString()) : parseFloat(existingTrade.pricePerUnit.toString());
            const finalFees = trade.fees !== undefined ? parseFloat(trade.fees.toString()) : parseFloat(existingTrade.fees.toString());

            // Recalculate total amount if not provided explicitly
            const finalTotalAmount = trade.totalAmount !== undefined ? trade.totalAmount.toString() : existingTrade.totalAmount.toString();

            const description = `${finalType === 'buy' ? 'Buy' : 'Sell'} ${finalQty.toFixed(4)} ${ticker} @ ${finalPrice.toFixed(2)}`;
            const type = finalType === 'buy' ? 'expense' : 'income';

            if (transactionId) {
              // Update existing transaction
              await tx.update(transactions).set({
                date: finalDate,
                amount: finalTotalAmount,
                description: description,
                accountId: accountId,
                categoryId: categoryId,
                type: type
              }).where(eq(transactions.id, transactionId));
            } else {
              // Create new transaction
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
        // If accountId is specifically set to null (if that were allowed) or we are removing it...
        // But trade.accountId comes as number | null.
        // If it is explicitly nullify, we might want to delete the transaction?
        // Current schema has accountId as optional.
        // If user unlinks account, we should probably delete the transaction?
        if (trade.accountId === null && transactionId) {
          await tx.delete(transactions).where(eq(transactions.id, transactionId));
          transactionId = null; // Remove link
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

      // Delete trade first (child) to satisfy FK constraint
      await tx.delete(trades).where(eq(trades.id, id));

      // Then delete associated transaction (parent)
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

      // Delete trades first (children)
      await tx.delete(trades).where(inArray(trades.id, ids));

      // Then delete associated transactions (parents)
      if (transactionIds.length > 0) {
        await tx.delete(transactions).where(inArray(transactions.id, transactionIds));
      }
    });
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
    const result = await db.select().from(importStaging).where(eq(importStaging.externalId, gcId));
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

  // Data Management
  async deleteUser(id: string): Promise<void> {
    // 1. Get user's resources to query child tables
    const userAccounts = await this.getAccounts(id);
    const userAccountIds = userAccounts.map(a => a.id);
    const userCategories = await this.getCategories(id);
    const userCategoryIds = userCategories.map(c => c.id);
    const userHoldings = await this.getHoldings(id);
    const userHoldingIds = userHoldings.map(h => h.id);

    // 2. Delete deepest children first

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

    // 3. Delete middle layer
    // Holdings
    await db.delete(holdings).where(eq(holdings.userId, id));

    // Bank Connections
    await db.delete(bankConnections).where(eq(bankConnections.userId, id));

    // Accounts
    await db.delete(accounts).where(eq(accounts.userId, id));

    // Categories
    await db.delete(categories).where(eq(categories.userId, id));

    // 4. Delete User
    await db.delete(users).where(eq(users.id, id));
  }

  async exportUserData(userId: string): Promise<any> {
    // Fetch all data for the user
    // We can use existing getters but some might filter too much or join.
    // Raw selects are safer for full dump.

    const _accounts = await this.getAccounts(userId);
    const _categories = await this.getCategories(userId);
    const _transactions = await this.getTransactions(userId);
    const _holdings = await this.getHoldings(userId);
    const _trades = await this.getTrades(userId);
    const _bankConnections = await this.getBankConnections(userId);
    const _recurringExpenses = await this.getRecurringExpenses(userId);

    // Check tables not covered by simple getters or where we want raw data
    // Monthly Budgets - getMonthlyBudgetsByYear needs a year. We want ALL.
    // We need to implement a "getAll" private or inline query.

    const userCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId));
    const _monthlyBudgets = await db.select().from(monthlyBudgets).where(inArray(monthlyBudgets.categoryId, userCategories));
    const _plannedExpenses = await db.select().from(plannedExpenses).where(inArray(plannedExpenses.categoryId, userCategories));

    // Recurring Expense Checks - tricky, linked to recurring expenses
    const userAccounts = db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId));
    const userRecurringExpenses = db.select({ id: recurringExpenses.id }).from(recurringExpenses).where(inArray(recurringExpenses.accountId, userAccounts));
    const _recurringExpenseChecks = await db.select().from(recurringExpenseChecks).where(inArray(recurringExpenseChecks.recurringExpenseId, userRecurringExpenses));

    return {
      Accounts: _accounts,
      Categories: _categories,
      Transactions: _transactions,
      Holdings: _holdings,
      Trades: _trades,
      BankConnections: _bankConnections,
      RecurringExpenses: _recurringExpenses,
      RecurringExpenseChecks: _recurringExpenseChecks,
      MonthlyBudgets: _monthlyBudgets,
      PlannedExpenses: _plannedExpenses
    };
  }
}

export const storage = new DatabaseStorage();
