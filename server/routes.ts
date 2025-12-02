import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertAccountSchema, insertCategorySchema, insertTransactionSchema, insertHoldingSchema, insertTradeSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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

  const convertPenceToPounds = (value: number, symbol: string): number => {
    return isLondonExchange(symbol) ? value / 100 : value;
  };

  app.get("/api/stock/quote/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      
      if (!ALPHA_VANTAGE_API_KEY) {
        return res.status(500).json({ error: "Alpha Vantage API key not configured" });
      }

      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data["Error Message"]) {
        return res.status(404).json({ error: "Symbol not found" });
      }
      
      if (data["Note"]) {
        return res.status(429).json({ error: "API rate limit reached. Please try again later." });
      }

      const quote = data["Global Quote"];
      if (!quote || Object.keys(quote).length === 0) {
        return res.status(404).json({ error: "No data found for this symbol" });
      }

      res.json({
        symbol: quote["01. symbol"],
        price: convertPenceToPounds(parseFloat(quote["05. price"]), symbol),
        change: convertPenceToPounds(parseFloat(quote["09. change"]), symbol),
        changePercent: quote["10. change percent"],
        high: convertPenceToPounds(parseFloat(quote["03. high"]), symbol),
        low: convertPenceToPounds(parseFloat(quote["04. low"]), symbol),
        open: convertPenceToPounds(parseFloat(quote["02. open"]), symbol),
        previousClose: convertPenceToPounds(parseFloat(quote["08. previous close"]), symbol),
        volume: parseInt(quote["06. volume"]),
        latestTradingDay: quote["07. latest trading day"]
      });
    } catch (error) {
      console.error("Alpha Vantage API error:", error);
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
      
      for (const symbol of symbols) {
        try {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
          );
          
          const data = await response.json();
          
          if (data["Note"]) {
            return res.status(429).json({ error: "API rate limit reached. Please try again later." });
          }

          const quote = data["Global Quote"];
          if (quote && Object.keys(quote).length > 0) {
            quotes[symbol] = {
              symbol: quote["01. symbol"],
              price: convertPenceToPounds(parseFloat(quote["05. price"]), symbol),
              change: convertPenceToPounds(parseFloat(quote["09. change"]), symbol),
              changePercent: quote["10. change percent"]
            };
          }
        } catch (err) {
          console.error(`Error fetching quote for ${symbol}:`, err);
        }
      }

      res.json(quotes);
    } catch (error) {
      console.error("Batch quotes error:", error);
      res.status(500).json({ error: "Failed to fetch batch quotes" });
    }
  });

  return httpServer;
}
