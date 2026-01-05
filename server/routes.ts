import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertAccountSchema, insertCategorySchema, insertTransactionSchema, insertHoldingSchema, insertTradeSchema, insertMonthlyBudgetSchema, insertRecurringExpenseSchema, insertPlannedExpenseSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import { setupAuth, isAuthenticated } from "./auth";
import { sendEmail } from "./resend";
import cron from "node-cron";
import { TallyService } from "./services/tally";
import { marketDataService } from "./services/marketData";
import { ReportService } from "./services/reportService";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============ AUTH ============
  setupAuth(app);

  const tallyService = new TallyService(storage);
  const reportService = new ReportService(storage, marketDataService);

  // endpoint for backward compatibility or if frontend expects this path
  app.get('/api/auth/user', isAuthenticated, (req, res) => {
    res.json(req.user);
  });

  // ============ ACCOUNTS ============

  app.get("/api/accounts", async (req, res) => {
    try {
      const accounts = await storage.getAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  app.get("/api/accounts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const account = await storage.getAccount(id);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch account" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const validated = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(validated);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/accounts/bulk", async (req, res) => {
    try {
      const validated = z.array(insertAccountSchema).parse(req.body);
      const accounts = await storage.createAccounts(validated);
      res.status(201).json(accounts);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create accounts" });
    }
  });

  app.patch("/api/accounts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertAccountSchema.partial().parse(req.body);
      const account = await storage.updateAccount(id, validated);
      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update account" });
    }
  });

  app.delete("/api/accounts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAccount(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // ============ CATEGORIES ============

  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getCategory(id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const validated = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validated);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.post("/api/categories/bulk", async (req, res) => {
    try {
      const validated = z.array(insertCategorySchema).parse(req.body);
      const categories = await storage.createCategories(validated);
      res.status(201).json(categories);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create categories" });
    }
  });

  app.patch("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, validated);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCategory(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // ============ TRANSACTIONS ============

  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validated = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validated);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  app.post("/api/transactions/bulk", async (req, res) => {
    try {
      const validated = z.array(insertTransactionSchema).parse(req.body);
      const transactions = await storage.createTransactions(validated);
      res.status(201).json(transactions);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create transactions" });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertTransactionSchema.partial().parse(req.body);
      const transaction = await storage.updateTransaction(id, validated);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update transaction" });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTransaction(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  app.post("/api/transactions/bulk-delete", async (req, res) => {
    try {
      const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
      await storage.deleteTransactions(ids);
      res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to delete transactions" });
    }
  });

  app.delete("/api/transactions", async (req, res) => {
    try {
      await storage.clearTransactions();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to clear transactions" });
    }
  });

  // ============ TRANSFERS ============

  const transferSchema = z.object({
    date: z.string(),
    amount: z.string(),
    description: z.string(),
    fromAccountId: z.number(),
    toAccountId: z.number(),
    categoryId: z.number(),
  });

  app.post("/api/transfers", async (req, res) => {
    try {
      const validated = transferSchema.parse(req.body);
      if (validated.fromAccountId === validated.toAccountId) {
        return res.status(400).json({ error: "Source and destination accounts must be different" });
      }
      const result = await storage.createTransfer(validated);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create transfer" });
    }
  });

  // ============ TALLY WEBHOOK ============

  app.post("/api/webhooks/tally", async (req, res) => {
    try {
      console.log("Tally webhook received:", JSON.stringify(req.body, null, 2));

      // Optional signature verification (if TALLY_WEBHOOK_SECRET is set)
      const tallySecret = process.env.TALLY_WEBHOOK_SECRET;
      if (tallySecret) {
        const signature = req.headers['tally-signature'] as string;
        if (!tallyService.verifySignature(req.body, signature, tallySecret)) {
          console.warn("Tally webhook: Invalid or missing signature");
          return res.status(401).json({ error: "Invalid or missing signature" });
        }
      }

      const transaction = await tallyService.processWebhook(req.body);

      res.status(201).json({
        status: "ok",
        message: "Transaction created successfully",
        transaction
      });

    } catch (error: any) {
      console.error("Tally webhook error:", error);
      if (error.message && (error.message === "Account not found" || error.message === "Category not found" || error.message === "Invalid transaction data")) {
        return res.status(400).json({ error: error.message, ...error });
      }
      res.status(500).json({ error: "Failed to process Tally webhook" });
    }
  });

  // GET endpoint to verify webhook is working
  app.get("/api/webhooks/tally", async (req, res) => {
    const accounts = await storage.getAccounts();
    const categories = await storage.getCategories();

    res.json({
      status: "Tally webhook is ready",
      instructions: {
        method: "POST",
        contentType: "application/json",
        expectedFields: [
          "Data (or Date) - DD/MM/YYYY format",
          "Descrizione (or Description) - transaction description",
          "Entrata (or Income) - income amount (European format: 1.234,56)",
          "Uscita (or Expense) - expense amount (European format: 1.234,56)",
          "Conto (or Account) - account name",
          "Categoria (or Category) - category name"
        ],
        availableAccounts: accounts.map(a => a.name),
        availableCategories: categories.map(c => ({ name: c.name, type: c.type }))
      }
    });
  });

  // ============ HOLDINGS ============

  app.get("/api/holdings", async (req, res) => {
    try {
      const holdings = await storage.getHoldings();
      res.json(holdings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch holdings" });
    }
  });

  app.get("/api/holdings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const holding = await storage.getHolding(id);
      if (!holding) {
        return res.status(404).json({ error: "Holding not found" });
      }
      res.json(holding);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch holding" });
    }
  });

  app.post("/api/holdings", async (req, res) => {
    try {
      const validated = insertHoldingSchema.parse(req.body);
      const existing = await storage.getHoldingByTicker(validated.ticker);
      if (existing) {
        return res.status(409).json({ error: "Holding with this ticker already exists", holding: existing });
      }
      const holding = await storage.createHolding(validated);
      res.status(201).json(holding);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create holding" });
    }
  });

  app.patch("/api/holdings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertHoldingSchema.partial().parse(req.body);
      const holding = await storage.updateHolding(id, validated);
      if (!holding) {
        return res.status(404).json({ error: "Holding not found" });
      }
      res.json(holding);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update holding" });
    }
  });

  app.delete("/api/holdings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteHolding(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete holding" });
    }
  });

  // ============ TRADES ============

  app.get("/api/trades", async (req, res) => {
    try {
      const trades = await storage.getTrades();
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trades" });
    }
  });

  app.get("/api/trades/holding/:holdingId", async (req, res) => {
    try {
      const holdingId = parseInt(req.params.holdingId);
      const trades = await storage.getTradesByHolding(holdingId);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trades for holding" });
    }
  });

  app.get("/api/trades/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const trade = await storage.getTrade(id);
      if (!trade) {
        return res.status(404).json({ error: "Trade not found" });
      }
      res.json(trade);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trade" });
    }
  });

  app.post("/api/trades", async (req, res) => {
    try {
      const validated = insertTradeSchema.parse(req.body);
      const holding = await storage.getHolding(validated.holdingId);
      if (!holding) {
        return res.status(400).json({ error: "Holding not found" });
      }
      const trade = await storage.createTrade(validated);
      res.status(201).json(trade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create trade" });
    }
  });

  app.post("/api/trades/bulk", async (req, res) => {
    try {
      const tradesData = req.body;
      if (!Array.isArray(tradesData)) {
        return res.status(400).json({ error: "Expected an array of trades" });
      }

      const validatedTrades = tradesData.map(t => insertTradeSchema.parse(t));
      const trades = await storage.createTrades(validatedTrades);
      res.status(201).json(trades);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to create trades:", error);
      res.status(500).json({ error: "Failed to create trades" });
    }
  });

  app.patch("/api/trades/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertTradeSchema.partial().parse(req.body);
      const trade = await storage.updateTrade(id, validated);
      if (!trade) {
        return res.status(404).json({ error: "Trade not found" });
      }
      res.json(trade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update trade" });
    }
  });

  app.delete("/api/trades/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTrade(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete trade" });
    }
  });

  app.post("/api/trades/bulk-delete", async (req, res) => {
    try {
      const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
      await storage.deleteTrades(ids);
      res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to delete trades" });
    }
  });

  // ============ REPORTS ============

  app.get("/api/reports/income-statement/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year, 10);
      const month = parseInt(req.params.month, 10);

      const currentYear = new Date().getFullYear();
      if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12 ||
        year < 1970 ||
        year > currentYear + 1
      ) {
        return res.status(400).json({ error: "Invalid year or month" });
      }

      const data = await reportService.getMonthlyIncomeStatement(year, month);
      res.json(data);
    } catch (error) {
      console.error("Failed to fetch income statement:", error);
      res.status(500).json({ error: "Failed to fetch income statement" });
    }
  });

  app.get("/api/reports/balance-sheet", async (req, res) => {
    try {
      const data = await reportService.getBalanceSheet();
      res.json(data);
    } catch (error) {
      console.error("Failed to fetch balance sheet:", error);
      res.status(500).json({ error: "Failed to fetch balance sheet" });
    }
  });

  // ============ BUDGET ============

  app.get("/api/budget/:year", async (req, res) => {
    try {
      const year = parseInt(req.params.year);

      const [categories, monthlyBudgets, plannedExpenses, recurringExpenses] = await Promise.all([
        storage.getCategories(),
        storage.getMonthlyBudgetsByYear(year),
        storage.getPlannedExpensesByYear(year),
        storage.getActiveRecurringExpenses()
      ]);

      // Initialize response structure
      // budgetData: map of categoryId -> map of month (1-12) -> { baseline, planned, recurring, total }
      const budgetData: Record<number, Record<number, { baseline: number; planned: number; recurring: number; total: number }>> = {};

      // Initialize all categories and months with 0
      categories.forEach(cat => {
        budgetData[cat.id] = {};
        for (let m = 1; m <= 12; m++) {
          budgetData[cat.id][m] = { baseline: 0, planned: 0, recurring: 0, total: 0 };
        }
      });

      // Fill Baselines
      monthlyBudgets.forEach(mb => {
        if (budgetData[mb.categoryId] && budgetData[mb.categoryId][mb.month]) {
          budgetData[mb.categoryId][mb.month].baseline = parseFloat(mb.amount.toString());
        }
      });

      // Fill Planned
      plannedExpenses.forEach(pe => {
        const date = new Date(pe.date);
        // Ensure the date is in the requested year (should be filtered by DB but double check)
        if (date.getFullYear() === year) {
          const m = date.getMonth() + 1;
          if (budgetData[pe.categoryId] && budgetData[pe.categoryId][m]) {
            budgetData[pe.categoryId][m].planned += parseFloat(pe.amount.toString());
          }
        }
      });

      // Fill Recurring
      // Note: Recurring expenses are tricky because they might start/end mid-year.
      // Simple logic: If active and start_date <= month_end, add to month.
      // TODO: Handle end_date if implemented in schema later.
      recurringExpenses.forEach(re => {
        const startDate = new Date(re.startDate);
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1;

        for (let m = 1; m <= 12; m++) {
          // If the recurring expense started before or during this month (considering years)
          if (startYear < year || (startYear === year && startMonth <= m)) {
            if (budgetData[re.categoryId]) {
              budgetData[re.categoryId][m].recurring += parseFloat(re.amount.toString());
            }
          }
        }
      });

      // Calculate Totals per cell
      for (const catId in budgetData) {
        for (let m = 1; m <= 12; m++) {
          const cell = budgetData[catId][m];
          cell.total = cell.baseline + cell.planned + cell.recurring;
        }
      }

      res.json({
        categories,
        budgetData, // Structured as { [categoryId]: { [month]: { baseline, planned, recurring, total } } }
        plannedExpenses, // Return raw list for the Planned Table
        recurringExpenses // Return raw list for the Recurring Table
      });
    } catch (error) {
      console.error("Failed to fetch yearly budget data:", error);
      res.status(500).json({ error: "Failed to fetch yearly budget data" });
    }
  });

  app.get("/api/budget/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month); // 1-12

      const budgetData = await reportService.getMonthlyBudget(year, month);
      res.json(budgetData);
    } catch (error) {
      console.error("Failed to fetch budget data:", error);
      res.status(500).json({ error: "Failed to fetch budget data" });
    }
  });

  app.post("/api/budget", async (req, res) => {
    try {
      const validated = insertMonthlyBudgetSchema.parse(req.body);
      const budget = await storage.upsertMonthlyBudget(validated);
      res.json(budget);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to save monthly budget" });
    }
  });

  // Recurring Expenses
  app.get("/api/budget/recurring", async (req, res) => {
    try {
      const expenses = await storage.getRecurringExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recurring expenses" });
    }
  });

  app.post("/api/budget/recurring", async (req, res) => {
    try {
      console.log("Receiving recurring expense payload:", req.body);
      const validated = insertRecurringExpenseSchema.parse(req.body);
      const expense = await storage.createRecurringExpense(validated);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating recurring expense:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create recurring expense" });
    }
  });

  app.patch("/api/budget/recurring/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertRecurringExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateRecurringExpense(id, validated);
      if (!expense) {
        return res.status(404).json({ error: "Recurring expense not found" });
      }
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update recurring expense" });
    }
  });

  app.delete("/api/budget/recurring/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRecurringExpense(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete recurring expense" });
    }
  });

  // Planned Expenses
  app.get("/api/budget/planned/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const expenses = await storage.getPlannedExpenses(year, month);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch planned expenses" });
    }
  });

  app.post("/api/budget/planned", async (req, res) => {
    try {
      const validated = insertPlannedExpenseSchema.parse(req.body);
      const expense = await storage.createPlannedExpense(validated);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create planned expense" });
    }
  });

  app.patch("/api/budget/planned/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertPlannedExpenseSchema.partial().parse(req.body);
      const expense = await storage.updatePlannedExpense(id, validated);
      if (!expense) {
        return res.status(404).json({ error: "Planned expense not found" });
      }
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update planned expense" });
    }
  });

  app.delete("/api/budget/planned/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePlannedExpense(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete planned expense" });
    }
  });

  // ============ ALPHA VANTAGE STOCK API ============
  // Refactored to use MarketDataService

  app.get("/api/stock/quote/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const quote = await marketDataService.getQuote(symbol);
      if (quote) {
        res.json(quote.data);
      } else {
        res.status(404).json({ error: "Stock not found" });
      }
    } catch (error) {
      console.error("Stock API error:", error);
      res.status(500).json({ error: "Failed to fetch stock data" });
    }
  });

  app.get("/api/stock/search/:keywords", async (req, res) => {
    try {
      const results = await marketDataService.search(req.params.keywords);
      res.json(results);
    } catch (error: any) {
      if (error.message && error.message.includes("rate limit")) {
        return res.status(429).json({ error: "API rate limit reached" });
      }
      res.status(500).json({ error: "Failed to search symbols" });
    }
  });

  app.get("/api/stock/batch-quotes", async (req, res) => {
    try {
      const symbols = (req.query.symbols as string)?.split(",").map(s => s.trim().toUpperCase()) || [];
      if (symbols.length === 0) return res.status(400).json({ error: "No symbols provided" });

      const quotes = await marketDataService.getBatchQuotes(symbols);
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch batch quotes" });
    }
  });

  app.get("/api/stock/convert/:amount/:symbol", async (req, res) => {
    try {
      const amount = parseFloat(req.params.amount);
      const symbol = req.params.symbol;
      const converted = await marketDataService.convertToEur(amount, symbol);
      res.json({ amount: converted });
    } catch (error) {
      res.status(500).json({ error: "Failed to convert currency" });
    }
  });

  // ============ WEEKLY REPORT EMAIL ============

  app.post("/api/reports/weekly/send", async (req, res) => {
    try {
      const email = req.body.email || "tommasominuto@gmail.com";
      const data = await reportService.getWeeklyReportData();
      const html = reportService.generateHtml(data);

      const now = new Date();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const subject = `📊 Report Settimanale FinTrack - ${weekStart.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} / ${now.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`;

      const result = await sendEmail(email, subject, html);

      console.log(`[email] Weekly report sent to ${email}`);
      res.json({ success: true, result });
    } catch (error: any) {
      console.error("Error sending weekly report:", error);
      res.status(500).json({ error: error.message || "Failed to send report" });
    }
  });

  app.get("/api/reports/weekly/preview", async (req, res) => {
    try {
      const data = await reportService.getWeeklyReportData();
      const html = reportService.generateHtml(data);
      res.send(html);
    } catch (error) {
      console.error("Error generating report preview:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // Weekly report scheduler - Runs every Sunday at 9:00 AM Europe/Rome
  cron.schedule('0 9 * * 0', async () => {
    console.log("[scheduler] Sending weekly report...");
    try {
      const data = await reportService.getWeeklyReportData();
      const html = reportService.generateHtml(data);
      const now = new Date();
      await sendEmail(
        "tommasominuto@gmail.com",
        `📊 Report Settimanale FinTrack - ${now.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        html
      );
      console.log("[scheduler] Weekly report sent successfully");
    } catch (error) {
      console.error("[scheduler] Failed to send weekly report:", error);
    }
  }, {
    timezone: "Europe/Rome"
  });

  return httpServer;
}
