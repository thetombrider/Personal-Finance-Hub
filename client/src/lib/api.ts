import { InsertAccount, InsertCategory, InsertTransaction, InsertHolding, InsertTrade, Holding, Trade } from "@shared/schema";

const API_BASE = "/api";

// ============ ACCOUNTS ============

export async function fetchAccounts() {
  const res = await fetch(`${API_BASE}/accounts`);
  if (!res.ok) throw new Error("Failed to fetch accounts");
  return res.json();
}

export async function createAccount(account: InsertAccount) {
  const res = await fetch(`${API_BASE}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(account),
  });
  if (!res.ok) throw new Error("Failed to create account");
  return res.json();
}

export async function updateAccount(id: number, account: Partial<InsertAccount>) {
  const res = await fetch(`${API_BASE}/accounts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(account),
  });
  if (!res.ok) throw new Error("Failed to update account");
  return res.json();
}

export async function deleteAccount(id: number) {
  const res = await fetch(`${API_BASE}/accounts/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete account");
}

// ============ CATEGORIES ============

export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function createCategory(category: InsertCategory) {
  const res = await fetch(`${API_BASE}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(category),
  });
  if (!res.ok) throw new Error("Failed to create category");
  return res.json();
}

export async function updateCategory(id: number, category: Partial<InsertCategory>) {
  const res = await fetch(`${API_BASE}/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(category),
  });
  if (!res.ok) throw new Error("Failed to update category");
  return res.json();
}

export async function deleteCategory(id: number) {
  const res = await fetch(`${API_BASE}/categories/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete category");
}

// ============ TRANSACTIONS ============

export async function fetchTransactions() {
  const res = await fetch(`${API_BASE}/transactions`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

export async function createTransaction(transaction: InsertTransaction) {
  const res = await fetch(`${API_BASE}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction),
  });
  if (!res.ok) throw new Error("Failed to create transaction");
  return res.json();
}

export async function createTransactionsBulk(transactions: InsertTransaction[]) {
  const res = await fetch(`${API_BASE}/transactions/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transactions),
  });
  if (!res.ok) throw new Error("Failed to create transactions");
  return res.json();
}

export async function updateTransaction(id: number, transaction: Partial<InsertTransaction>) {
  const res = await fetch(`${API_BASE}/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction),
  });
  if (!res.ok) throw new Error("Failed to update transaction");
  return res.json();
}

export async function deleteTransaction(id: number) {
  const res = await fetch(`${API_BASE}/transactions/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete transaction");
}

export async function deleteTransactionsBulk(ids: number[]) {
  const res = await fetch(`${API_BASE}/transactions/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to delete transactions");
}

export async function clearTransactions() {
  const res = await fetch(`${API_BASE}/transactions`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to clear transactions");
}

// ============ HOLDINGS ============

export async function fetchHoldings(): Promise<Holding[]> {
  const res = await fetch(`${API_BASE}/holdings`);
  if (!res.ok) throw new Error("Failed to fetch holdings");
  return res.json();
}

export async function createHolding(holding: InsertHolding): Promise<Holding> {
  const res = await fetch(`${API_BASE}/holdings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(holding),
  });
  if (!res.ok) {
    const error = await res.json();
    if (res.status === 409) {
      return error.holding;
    }
    throw new Error("Failed to create holding");
  }
  return res.json();
}

export async function updateHolding(id: number, holding: Partial<InsertHolding>): Promise<Holding> {
  const res = await fetch(`${API_BASE}/holdings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(holding),
  });
  if (!res.ok) throw new Error("Failed to update holding");
  return res.json();
}

export async function deleteHolding(id: number) {
  const res = await fetch(`${API_BASE}/holdings/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete holding");
}

// ============ TRADES ============

export async function fetchTrades(): Promise<Trade[]> {
  const res = await fetch(`${API_BASE}/trades`);
  if (!res.ok) throw new Error("Failed to fetch trades");
  return res.json();
}

export async function fetchTradesByHolding(holdingId: number): Promise<Trade[]> {
  const res = await fetch(`${API_BASE}/trades/holding/${holdingId}`);
  if (!res.ok) throw new Error("Failed to fetch trades");
  return res.json();
}

export async function createTrade(trade: InsertTrade): Promise<Trade> {
  const res = await fetch(`${API_BASE}/trades`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(trade),
  });
  if (!res.ok) throw new Error("Failed to create trade");
  return res.json();
}

export async function updateTrade(id: number, trade: Partial<InsertTrade>): Promise<Trade> {
  const res = await fetch(`${API_BASE}/trades/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(trade),
  });
  if (!res.ok) throw new Error("Failed to update trade");
  return res.json();
}

export async function deleteTrade(id: number) {
  const res = await fetch(`${API_BASE}/trades/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete trade");
}

// ============ STOCK API ============

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  latestTradingDay: string;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
}

export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  const res = await fetch(`${API_BASE}/stock/quote/${encodeURIComponent(symbol)}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch stock quote");
  }
  return res.json();
}

export async function searchStocks(keywords: string): Promise<StockSearchResult[]> {
  const res = await fetch(`${API_BASE}/stock/search/${encodeURIComponent(keywords)}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to search stocks");
  }
  return res.json();
}

export async function fetchBatchQuotes(symbols: string[]): Promise<Record<string, { symbol: string; price: number; change: number; changePercent: string }>> {
  const res = await fetch(`${API_BASE}/stock/batch-quotes?symbols=${symbols.join(",")}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch batch quotes");
  }
  return res.json();
}
