import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertAccountSchema, insertCategorySchema, insertTransactionSchema, insertHoldingSchema, insertTradeSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import { setupAuth, isAuthenticated } from "./auth";
import { sendEmail } from "./resend";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============ AUTH ============
  setupAuth(app);

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

  // Helper to parse European number format (1.234,56 -> 1234.56)
  function parseEuropeanNumber(value: string): number {
    if (!value) return 0;
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  // Helper to parse date in various formats
  function parseDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    // Try DD/MM/YYYY format
    const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try YYYY-MM-DD format
    const yyyymmdd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyymmdd) {
      return dateStr;
    }

    // Fallback: try to parse as date
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return new Date().toISOString().split('T')[0];
  }

  app.post("/api/webhooks/tally", async (req, res) => {
    try {
      console.log("Tally webhook received:", JSON.stringify(req.body, null, 2));

      // Optional signature verification (if TALLY_WEBHOOK_SECRET is set)
      const tallySecret = process.env.TALLY_WEBHOOK_SECRET;
      if (tallySecret) {
        const signature = req.headers['tally-signature'] as string;
        if (!signature) {
          console.warn("Tally webhook: Missing signature");
          return res.status(401).json({ error: "Missing signature" });
        }

        const expectedSignature = crypto
          .createHmac('sha256', tallySecret)
          .update(JSON.stringify(req.body))
          .digest('base64');

        if (signature !== expectedSignature) {
          console.warn("Tally webhook: Invalid signature");
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      const payload = req.body;

      // Tally sends data directly or wrapped in eventType for webhooks
      const fields = payload.data?.fields || [];

      if (fields.length === 0) {
        return res.status(400).json({ error: "No fields found in payload" });
      }

      // Helper to get field by label pattern
      const getField = (labelPattern: RegExp): any => {
        return fields.find((f: any) => labelPattern.test(f.label?.toLowerCase() || ''));
      };

      // Helper to get text value from a dropdown field (value is array of IDs)
      const getDropdownText = (field: any): string => {
        if (!field || !field.value || !Array.isArray(field.value) || field.value.length === 0) {
          return '';
        }
        const selectedId = field.value[0];
        const option = field.options?.find((o: any) => o.id === selectedId);
        return option?.text || '';
      };

      // Helper to get simple value (string, number, or first array element)
      const getSimpleValue = (field: any): string => {
        if (!field) return '';
        const val = field.value;
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'number') return val.toString();
        if (Array.isArray(val)) return val[0]?.toString() || '';
        return '';
      };

      // Extract fields
      const dateField = getField(/^data$/i);
      const descriptionField = getField(/^(causale|descrizione|description)$/i);
      const categoryField = getField(/^categoria$/i);
      const accountField = getField(/^conto$/i);
      const directionField = getField(/^direzione$/i);
      const incomeAmountField = getField(/^importo\s*entrata$/i);
      const expenseAmountField = getField(/^importo\s*uscita$/i);

      // Get values
      const dateValue = getSimpleValue(dateField);
      const description = getSimpleValue(descriptionField);
      const categoryName = getDropdownText(categoryField);
      const accountName = getDropdownText(accountField);
      const direction = getDropdownText(directionField);

      // Get amounts (Tally sends numbers directly for INPUT_NUMBER)
      const incomeAmount = incomeAmountField?.value ? parseFloat(incomeAmountField.value) || 0 : 0;
      const expenseAmount = expenseAmountField?.value ? parseFloat(expenseAmountField.value) || 0 : 0;

      // Determine amount and type based on direction or which amount field is filled
      let amount = 0;
      let type: 'income' | 'expense' = 'expense';

      if (direction.toLowerCase() === 'entrata' || incomeAmount > 0) {
        amount = incomeAmount > 0 ? incomeAmount : expenseAmount;
        type = 'income';
      } else {
        amount = expenseAmount > 0 ? expenseAmount : incomeAmount;
        type = 'expense';
      }

      console.log("Parsed Tally data:", { dateValue, description, categoryName, accountName, direction, amount, type });

      if (!description || amount <= 0) {
        return res.status(400).json({
          error: "Invalid transaction data",
          details: { description, amount, direction, incomeAmount, expenseAmount },
          fields: fields.map((f: any) => ({ label: f.label, value: f.value }))
        });
      }

      // Look up account by name
      const accounts = await storage.getAccounts();
      const account = accounts.find(a =>
        a.name.toLowerCase() === accountName.toLowerCase()
      );

      if (!account) {
        return res.status(400).json({
          error: "Account not found",
          accountName,
          availableAccounts: accounts.map(a => a.name)
        });
      }

      // Look up category by name
      const categories = await storage.getCategories();
      const category = categories.find(c =>
        c.name.toLowerCase() === categoryName.toLowerCase()
      );

      if (!category) {
        return res.status(400).json({
          error: "Category not found",
          categoryName,
          availableCategories: categories.map(c => c.name)
        });
      }

      // Create the transaction
      const transactionData = {
        date: parseDate(dateValue),
        description,
        amount: amount.toFixed(2),
        type,
        accountId: account.id,
        categoryId: category.id
      };

      console.log("Creating transaction from Tally:", transactionData);

      const transaction = await storage.createTransaction(transactionData);

      res.status(201).json({
        status: "ok",
        message: "Transaction created successfully",
        transaction
      });

    } catch (error) {
      console.error("Tally webhook error:", error);
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

  // ============ ALPHA VANTAGE STOCK API ============

  const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

  const isLondonExchange = (symbol: string): boolean => {
    const upper = symbol.toUpperCase();
    return upper.endsWith('.LON') || upper.endsWith('.L');
  };

  const CACHE_DURATION_24H = 24 * 60 * 60 * 1000;

  let cachedGbpEurRate: { rate: number; timestamp: number } | null = null;

  const getGbpToEurRate = async (): Promise<number> => {
    if (cachedGbpEurRate && Date.now() - cachedGbpEurRate.timestamp < CACHE_DURATION_24H) {
      return cachedGbpEurRate.rate;
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=GBP&to_currency=EUR&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      const data = await response.json();

      if (data["Realtime Currency Exchange Rate"]) {
        const rate = parseFloat(data["Realtime Currency Exchange Rate"]["5. Exchange Rate"]);
        cachedGbpEurRate = { rate, timestamp: Date.now() };
        return rate;
      }
    } catch (error) {
      console.error("Error fetching GBP/EUR rate:", error);
    }

    return cachedGbpEurRate?.rate || 1.17;
  };

  const convertToEur = async (value: number, symbol: string): Promise<number> => {
    if (!isLondonExchange(symbol)) {
      return value;
    }
    const valueInPounds = value / 100;
    const gbpEurRate = await getGbpToEurRate();
    return valueInPounds * gbpEurRate;
  };

  interface CachedQuote {
    data: {
      symbol: string;
      price: number;
      change: number;
      changePercent: string;
      high?: number;
      low?: number;
      open?: number;
      previousClose?: number;
      volume?: number;
      latestTradingDay?: string;
    };
    timestamp: number;
  }
  const quotesCache: Record<string, CachedQuote> = {};

  app.get("/api/stock/quote/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();

      if (!ALPHA_VANTAGE_API_KEY) {
        return res.status(500).json({ error: "Alpha Vantage API key not configured" });
      }

      const cached = quotesCache[symbol];
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION_24H) {
        console.log(`[cache] Returning cached quote for ${symbol}`);
        return res.json({ ...cached.data, cached: true });
      }

      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );

      const data = await response.json();

      if (data["Error Message"]) {
        return res.status(404).json({ error: "Symbol not found" });
      }

      if (data["Note"]) {
        if (cached) {
          console.log(`[cache] Rate limited, returning stale cache for ${symbol}`);
          return res.json({ ...cached.data, cached: true, stale: true });
        }
        return res.status(429).json({ error: "API rate limit reached. Please try again later." });
      }

      const quote = data["Global Quote"];
      if (!quote || Object.keys(quote).length === 0) {
        if (cached) {
          console.log(`[cache] No data, returning stale cache for ${symbol}`);
          return res.json({ ...cached.data, cached: true, stale: true });
        }
        return res.status(404).json({ error: "No data found for this symbol" });
      }

      const [price, change, high, low, open, previousClose] = await Promise.all([
        convertToEur(parseFloat(quote["05. price"]), symbol),
        convertToEur(parseFloat(quote["09. change"]), symbol),
        convertToEur(parseFloat(quote["03. high"]), symbol),
        convertToEur(parseFloat(quote["04. low"]), symbol),
        convertToEur(parseFloat(quote["02. open"]), symbol),
        convertToEur(parseFloat(quote["08. previous close"]), symbol),
      ]);

      const quoteData = {
        symbol: quote["01. symbol"],
        price,
        change,
        changePercent: quote["10. change percent"],
        high,
        low,
        open,
        previousClose,
        volume: parseInt(quote["06. volume"]),
        latestTradingDay: quote["07. latest trading day"],
        currency: isLondonExchange(symbol) ? "EUR" : undefined
      };

      quotesCache[symbol] = { data: quoteData, timestamp: Date.now() };
      console.log(`[cache] Stored fresh quote for ${symbol}`);

      res.json(quoteData);
    } catch (error) {
      console.error("Alpha Vantage API error:", error);
      const cached = quotesCache[req.params.symbol.toUpperCase()];
      if (cached) {
        return res.json({ ...cached.data, cached: true, stale: true });
      }
      res.status(500).json({ error: "Failed to fetch stock quote" });
    }
  });

  app.get("/api/stock/search/:keywords", async (req, res) => {
    try {
      const keywords = req.params.keywords;

      if (!ALPHA_VANTAGE_API_KEY) {
        return res.status(500).json({ error: "Alpha Vantage API key not configured" });
      }

      const response = await fetch(
        `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keywords)}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );

      const data = await response.json();

      if (data["Note"]) {
        return res.status(429).json({ error: "API rate limit reached. Please try again later." });
      }

      const matches = data.bestMatches || [];

      res.json(matches.map((match: any) => ({
        symbol: match["1. symbol"],
        name: match["2. name"],
        type: match["3. type"],
        region: match["4. region"],
        currency: match["8. currency"]
      })));
    } catch (error) {
      console.error("Alpha Vantage search error:", error);
      res.status(500).json({ error: "Failed to search symbols" });
    }
  });

  app.get("/api/stock/batch-quotes", async (req, res) => {
    try {
      const symbols = (req.query.symbols as string)?.split(",").map(s => s.trim().toUpperCase()) || [];

      if (symbols.length === 0) {
        return res.status(400).json({ error: "No symbols provided" });
      }

      if (!ALPHA_VANTAGE_API_KEY) {
        return res.status(500).json({ error: "Alpha Vantage API key not configured" });
      }

      const quotes: Record<string, any> = {};
      const symbolsToFetch: string[] = [];

      for (const symbol of symbols) {
        const cached = quotesCache[symbol];
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION_24H) {
          quotes[symbol] = { ...cached.data, cached: true };
          console.log(`[cache] Batch: returning cached quote for ${symbol}`);
        } else {
          symbolsToFetch.push(symbol);
        }
      }

      for (const symbol of symbolsToFetch) {
        try {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
          );

          const data = await response.json();

          if (data["Note"]) {
            const cached = quotesCache[symbol];
            if (cached) {
              quotes[symbol] = { ...cached.data, cached: true, stale: true };
              console.log(`[cache] Batch: rate limited, returning stale for ${symbol}`);
            }
            continue;
          }

          const quote = data["Global Quote"];
          if (quote && Object.keys(quote).length > 0) {
            const [price, change] = await Promise.all([
              convertToEur(parseFloat(quote["05. price"]), symbol),
              convertToEur(parseFloat(quote["09. change"]), symbol),
            ]);
            const quoteData = {
              symbol: quote["01. symbol"],
              price,
              change,
              changePercent: quote["10. change percent"]
            };
            quotes[symbol] = quoteData;
            quotesCache[symbol] = {
              data: { ...quoteData, high: 0, low: 0, open: 0, previousClose: 0, volume: 0 },
              timestamp: Date.now()
            };
            console.log(`[cache] Batch: stored fresh quote for ${symbol}`);
          } else {
            const cached = quotesCache[symbol];
            if (cached) {
              quotes[symbol] = { ...cached.data, cached: true, stale: true };
            }
          }
        } catch (err) {
          console.error(`Error fetching quote for ${symbol}:`, err);
          const cached = quotesCache[symbol];
          if (cached) {
            quotes[symbol] = { ...cached.data, cached: true, stale: true };
          }
        }
      }

      res.json(quotes);
    } catch (error) {
      console.error("Batch quotes error:", error);
      res.status(500).json({ error: "Failed to fetch batch quotes" });
    }
  });

  // ============ WEEKLY REPORT EMAIL ============

  async function generateWeeklyReport(): Promise<string> {
    const transactions = await storage.getTransactions();
    const accounts = await storage.getAccounts();
    const categories = await storage.getCategories();
    const holdingsList = await storage.getHoldings();
    const allTrades = await storage.getTrades();

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= oneWeekAgo && txDate <= now;
    });

    const totalIncome = weekTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpense = weekTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const expensesByCategory: Record<string, number> = {};
    weekTransactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const catName = cat?.name || 'Altro';
      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + parseFloat(t.amount);
    });

    const sortedCategories = Object.entries(expensesByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Calculate actual balance: startingBalance + all transactions for each account (including credit cards)
    const totalBalance = accounts.reduce((sum, account) => {
      const accountTransactions = transactions.filter(t => t.accountId === account.id);
      const transactionSum = accountTransactions.reduce((txSum, t) => {
        const amount = parseFloat(t.amount);
        // Income adds, expense subtracts
        return txSum + (t.type === 'income' ? amount : -amount);
      }, 0);
      return sum + parseFloat(account.startingBalance) + transactionSum;
    }, 0);

    // Get credit card accounts and their weekly transactions
    const creditCardAccounts = accounts.filter(a => a.type === 'credit');
    const creditCardIds = creditCardAccounts.map(a => a.id);
    const weekCreditCardTransactions = weekTransactions
      .filter(t => creditCardIds.includes(t.accountId) && t.type === 'expense')
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

    const totalCreditCardExpenses = weekCreditCardTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Top 5 highest expenses of the week
    const top5Expenses = weekTransactions
      .filter(t => t.type === 'expense')
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
      .slice(0, 5)
      .map(t => {
        const account = accounts.find(a => a.id === t.accountId);
        const category = categories.find(c => c.id === t.categoryId);
        return {
          description: t.description,
          amount: parseFloat(t.amount),
          accountName: account?.name || 'N/A',
          categoryName: category?.name || 'N/A',
          date: new Date(t.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
        };
      });

    // Calculate portfolio data
    const portfolioData: Array<{
      ticker: string;
      name: string;
      quantity: number;
      avgCost: number;
      totalInvested: number;
      currentPrice: number;
      currentValue: number;
      gainLoss: number;
      gainLossPercent: number;
    }> = [];

    // Fetch current prices for all holdings
    const tickers = holdingsList.map(h => h.ticker);
    const currentPrices: Record<string, number> = {};

    for (const ticker of tickers) {
      // Try cache first
      if (quotesCache[ticker] && (Date.now() - quotesCache[ticker].timestamp < 24 * 60 * 60 * 1000)) {
        currentPrices[ticker] = quotesCache[ticker].data.price;
      } else {
        // Fetch from API
        try {
          const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
          if (apiKey) {
            const response = await fetch(
              `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${apiKey}`
            );
            const data = await response.json();
            const quote = data["Global Quote"];
            if (quote && quote["05. price"]) {
              currentPrices[ticker] = parseFloat(quote["05. price"]);
            }
          }
        } catch (err) {
          console.error(`Failed to fetch price for ${ticker}:`, err);
        }
      }
    }

    // Calculate portfolio metrics for each holding
    for (const holding of holdingsList) {
      const holdingTrades = allTrades.filter(t => t.holdingId === holding.id);

      let totalQuantity = 0;
      let totalCost = 0;

      for (const trade of holdingTrades) {
        const qty = parseFloat(trade.quantity);
        const amount = parseFloat(trade.totalAmount);
        const fees = parseFloat(trade.fees || "0");

        if (trade.type === 'buy') {
          totalQuantity += qty;
          totalCost += amount + fees;
        } else {
          totalQuantity -= qty;
          totalCost -= amount - fees;
        }
      }

      if (totalQuantity > 0.0001) {
        const avgCost = totalCost / totalQuantity;
        const currentPrice = currentPrices[holding.ticker] || avgCost;
        const currentValue = totalQuantity * currentPrice;
        const gainLoss = currentValue - totalCost;
        const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

        portfolioData.push({
          ticker: holding.ticker,
          name: holding.name,
          quantity: totalQuantity,
          avgCost,
          totalInvested: totalCost,
          currentPrice,
          currentValue,
          gainLoss,
          gainLossPercent
        });
      }
    }

    // Portfolio totals
    const portfolioTotalInvested = portfolioData.reduce((sum, p) => sum + p.totalInvested, 0);
    const portfolioTotalValue = portfolioData.reduce((sum, p) => sum + p.currentValue, 0);
    const portfolioTotalGainLoss = portfolioTotalValue - portfolioTotalInvested;
    const portfolioTotalGainLossPercent = portfolioTotalInvested > 0 ? (portfolioTotalGainLoss / portfolioTotalInvested) * 100 : 0;

    const formatEur = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
    const formatPercent = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
    const startDate = oneWeekAgo.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
    const endDate = now.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #1a1a1a; margin-bottom: 5px; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
    .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .summary-card.income { background: #ecfdf5; }
    .summary-card.expense { background: #fef2f2; }
    .summary-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .summary-value { font-size: 24px; font-weight: 700; margin-top: 5px; }
    .summary-value.income { color: #059669; }
    .summary-value.expense { color: #dc2626; }
    .category-list { margin: 20px 0; }
    .category-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
    .category-name { color: #333; }
    .category-amount { font-weight: 600; color: #dc2626; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
    .balance-card { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 25px; }
    .balance-label { font-size: 14px; opacity: 0.9; }
    .balance-value { font-size: 32px; font-weight: 700; margin-top: 5px; }
    .expense-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .expense-table th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #eee; font-size: 11px; color: #666; text-transform: uppercase; }
    .expense-table td { padding: 12px 8px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
    .expense-table .amount { font-weight: 600; color: #dc2626; text-align: right; }
    .expense-table .desc { color: #333; }
    .expense-table .meta { color: #888; font-size: 11px; }
    .credit-card-section { background: #fef3c7; border-radius: 8px; padding: 20px; margin-top: 25px; }
    .credit-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .credit-card-title { font-weight: 600; color: #92400e; }
    .credit-card-total { font-weight: 700; color: #dc2626; }
    .portfolio-section { background: #f0fdf4; border-radius: 8px; padding: 20px; margin-top: 25px; }
    .portfolio-header { margin-bottom: 15px; }
    .portfolio-title { font-weight: 600; color: #166534; font-size: 16px; }
    .portfolio-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .portfolio-table th { text-align: left; padding: 8px 6px; border-bottom: 2px solid #86efac; font-size: 10px; color: #166534; text-transform: uppercase; }
    .portfolio-table td { padding: 10px 6px; border-bottom: 1px solid #dcfce7; font-size: 12px; }
    .portfolio-table .ticker { font-weight: 600; color: #166534; }
    .portfolio-table .number { text-align: right; }
    .portfolio-table .gain { color: #059669; font-weight: 600; }
    .portfolio-table .loss { color: #dc2626; font-weight: 600; }
    .portfolio-table tfoot td { border-top: 2px solid #86efac; font-weight: 700; background: #dcfce7; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Report Settimanale</h1>
    <p class="subtitle">${startDate} - ${endDate}</p>
    
    <div class="balance-card">
      <div class="balance-label">Saldo Totale Conti</div>
      <div class="balance-value">${formatEur(totalBalance)}</div>
    </div>
    
    ${top5Expenses.length > 0 ? `
    <h3>💸 Top 5 Spese Più Alte</h3>
    <table class="expense-table">
      <thead>
        <tr>
          <th>Descrizione</th>
          <th>Conto</th>
          <th>Categoria</th>
          <th style="text-align: right;">Importo</th>
        </tr>
      </thead>
      <tbody>
        ${top5Expenses.map(e => `
          <tr>
            <td class="desc">${e.description}</td>
            <td class="meta">${e.accountName}</td>
            <td class="meta">${e.categoryName}</td>
            <td class="amount">${formatEur(e.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}
    
    <div class="summary-grid">
      <div class="summary-card income">
        <div class="summary-label">Entrate</div>
        <div class="summary-value income">+${formatEur(totalIncome)}</div>
      </div>
      <div class="summary-card expense">
        <div class="summary-label">Uscite</div>
        <div class="summary-value expense">-${formatEur(totalExpense)}</div>
      </div>
    </div>
    
    <p style="text-align: center; margin-bottom: 25px;">
      <strong>Bilancio Settimanale:</strong> 
      <span style="color: ${totalIncome - totalExpense >= 0 ? '#059669' : '#dc2626'}; font-weight: 700;">
        ${totalIncome - totalExpense >= 0 ? '+' : ''}${formatEur(totalIncome - totalExpense)}
      </span>
    </p>
    
    <h3>🏷️ Top 5 Categorie Spese</h3>
    <div class="category-list">
      ${sortedCategories.length > 0
        ? sortedCategories.map(([name, amount]) => `
          <div class="category-item">
            <span class="category-name">${name}</span>
            <span class="category-amount">${formatEur(amount)}</span>
          </div>
        `).join('')
        : '<p style="color: #999; text-align: center;">Nessuna spesa questa settimana</p>'
      }
    </div>
    
    ${portfolioData.length > 0 ? `
    <div class="portfolio-section">
      <div class="portfolio-header">
        <span class="portfolio-title">📈 Portafoglio Titoli</span>
      </div>
      <table class="portfolio-table">
        <thead>
          <tr>
            <th>Titolo</th>
            <th class="number">Investito</th>
            <th class="number">Valore Attuale</th>
            <th class="number">Gain/Loss</th>
          </tr>
        </thead>
        <tbody>
          ${portfolioData.map(p => `
            <tr>
              <td class="ticker">${p.ticker}</td>
              <td class="number">${formatEur(p.totalInvested)}</td>
              <td class="number">${formatEur(p.currentValue)}</td>
              <td class="number ${p.gainLoss >= 0 ? 'gain' : 'loss'}">${p.gainLoss >= 0 ? '+' : ''}${formatEur(p.gainLoss)} (${formatPercent(p.gainLossPercent)})</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td><strong>TOTALE</strong></td>
            <td class="number">${formatEur(portfolioTotalInvested)}</td>
            <td class="number">${formatEur(portfolioTotalValue)}</td>
            <td class="number ${portfolioTotalGainLoss >= 0 ? 'gain' : 'loss'}">${portfolioTotalGainLoss >= 0 ? '+' : ''}${formatEur(portfolioTotalGainLoss)} (${formatPercent(portfolioTotalGainLossPercent)})</td>
          </tr>
        </tfoot>
      </table>
    </div>
    ` : ''}
    
    ${weekCreditCardTransactions.length > 0 ? `
    <div class="credit-card-section">
      <div class="credit-card-header">
        <span class="credit-card-title">💳 Spese Carta di Credito</span>
        <span class="credit-card-total">Totale: ${formatEur(totalCreditCardExpenses)}</span>
      </div>
      <table class="expense-table" style="margin: 0;">
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrizione</th>
            <th>Categoria</th>
            <th style="text-align: right;">Importo</th>
          </tr>
        </thead>
        <tbody>
          ${weekCreditCardTransactions.map(t => {
        const category = categories.find(c => c.id === t.categoryId);
        const account = accounts.find(a => a.id === t.accountId);
        return `
              <tr>
                <td class="meta">${new Date(t.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</td>
                <td class="desc">${t.description}${creditCardAccounts.length > 1 ? ` <span class="meta">(${account?.name})</span>` : ''}</td>
                <td class="meta">${category?.name || 'N/A'}</td>
                <td class="amount">${formatEur(parseFloat(t.amount))}</td>
              </tr>
            `;
      }).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <div class="footer">
      <p>Questo report è stato generato automaticamente da FinTrack</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  app.post("/api/reports/weekly/send", async (req, res) => {
    try {
      const email = req.body.email || "tommasominuto@gmail.com";
      const html = await generateWeeklyReport();

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
      const html = await generateWeeklyReport();
      res.send(html);
    } catch (error) {
      console.error("Error generating report preview:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // Weekly report scheduler - checks every hour if it's Sunday 9 AM
  let lastSentWeek = -1;
  setInterval(async () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const currentWeek = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));

    if (dayOfWeek === 0 && hour === 9 && currentWeek !== lastSentWeek) {
      console.log("[scheduler] Sending weekly report...");
      try {
        const html = await generateWeeklyReport();
        await sendEmail(
          "tommasominuto@gmail.com",
          `📊 Report Settimanale FinTrack - ${now.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`,
          html
        );
        lastSentWeek = currentWeek;
        console.log("[scheduler] Weekly report sent successfully");
      } catch (error) {
        console.error("[scheduler] Failed to send weekly report:", error);
      }
    }
  }, 60 * 60 * 1000);

  return httpServer;
}
