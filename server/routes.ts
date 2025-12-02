import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertAccountSchema, insertCategorySchema, insertTransactionSchema } from "@shared/schema";
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
      
      // Tally sends: { eventType: "FORM_RESPONSE", data: { fields: [...], submissionId: ... } }
      if (payload.eventType !== "FORM_RESPONSE") {
        return res.status(200).json({ status: "ignored", reason: "Not a form response" });
      }

      const fields = payload.data?.fields || [];
      
      // Extract field values by label (case-insensitive)
      const getFieldValue = (labelPattern: RegExp): string => {
        const field = fields.find((f: any) => labelPattern.test(f.label?.toLowerCase() || ''));
        if (!field) return '';
        
        // Handle different field types
        if (field.value) {
          if (typeof field.value === 'string') return field.value;
          if (Array.isArray(field.value)) return field.value[0] || '';
          if (typeof field.value === 'object' && field.value.raw) return field.value.raw;
        }
        return '';
      };

      // Extract transaction data from Tally fields
      // Expected field labels: Data/Date, Descrizione/Description, Importo/Amount, 
      // Entrata/Income, Uscita/Expense, Conto/Account, Categoria/Category
      const dateValue = getFieldValue(/^(data|date)$/i);
      const description = getFieldValue(/^(descrizione|description|desc)$/i);
      const amountValue = getFieldValue(/^(importo|amount|ammontare)$/i);
      const incomeValue = getFieldValue(/^(entrata|income|entrate)$/i);
      const expenseValue = getFieldValue(/^(uscita|expense|uscite|spesa)$/i);
      const accountName = getFieldValue(/^(conto|account)$/i);
      const categoryName = getFieldValue(/^(categoria|category)$/i);

      // Determine amount and type
      let amount = 0;
      let type: 'income' | 'expense' = 'expense';
      
      if (incomeValue && parseEuropeanNumber(incomeValue) > 0) {
        amount = parseEuropeanNumber(incomeValue);
        type = 'income';
      } else if (expenseValue && parseEuropeanNumber(expenseValue) > 0) {
        amount = parseEuropeanNumber(expenseValue);
        type = 'expense';
      } else if (amountValue) {
        amount = parseEuropeanNumber(amountValue);
        // If single amount field, check for a type field
        const typeValue = getFieldValue(/^(tipo|type)$/i);
        if (typeValue && /^(entrata|income)$/i.test(typeValue)) {
          type = 'income';
        }
      }

      if (!description || amount <= 0) {
        return res.status(400).json({ 
          error: "Invalid transaction data", 
          details: { description, amount, fields: fields.map((f: any) => f.label) }
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

  return httpServer;
}
