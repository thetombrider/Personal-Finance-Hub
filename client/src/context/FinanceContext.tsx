import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { startOfMonth, endOfMonth, isWithinInterval, subMonths, parseISO } from "date-fns";

// Types
export type AccountType = "checking" | "savings" | "credit" | "investment" | "cash";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  startingBalance: number;
  balance: number; // Computed: startingBalance + transactions
  currency: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  icon?: string;
}

export interface Transaction {
  id: string;
  date: string; // ISO string
  amount: number;
  description: string;
  accountId: string;
  categoryId: string;
  type: "income" | "expense";
}

// Mock Data
const INITIAL_ACCOUNTS: Omit<Account, "balance">[] = [
  { id: "1", name: "Main Checking", type: "checking", startingBalance: 200.50, currency: "EUR", color: "#3b82f6" },
  { id: "2", name: "High Yield Savings", type: "savings", startingBalance: 12000.00, currency: "EUR", color: "#10b981" },
  { id: "3", name: "Amex Gold", type: "credit", startingBalance: -330.20, currency: "EUR", color: "#f59e0b" },
  { id: "4", name: "Wallet Cash", type: "cash", startingBalance: 85.00, currency: "EUR", color: "#6366f1" },
];

const INITIAL_CATEGORIES: Category[] = [
  { id: "1", name: "Salary", type: "income", color: "#10b981" },
  { id: "2", name: "Freelance", type: "income", color: "#34d399" },
  { id: "3", name: "Groceries", type: "expense", color: "#f472b6" },
  { id: "4", name: "Rent", type: "expense", color: "#fb7185" },
  { id: "5", name: "Utilities", type: "expense", color: "#fbbf24" },
  { id: "6", name: "Dining Out", type: "expense", color: "#f87171" },
  { id: "7", name: "Transport", type: "expense", color: "#60a5fa" },
  { id: "8", name: "Entertainment", type: "expense", color: "#818cf8" },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "1", date: new Date().toISOString(), amount: 50.00, description: "Grocery Shopping", accountId: "1", categoryId: "3", type: "expense" },
  { id: "2", date: new Date(Date.now() - 86400000 * 2).toISOString(), amount: 1200.00, description: "Monthly Rent", accountId: "1", categoryId: "4", type: "expense" },
  { id: "3", date: new Date(Date.now() - 86400000 * 5).toISOString(), amount: 3500.00, description: "Salary Deposit", accountId: "1", categoryId: "1", type: "income" },
  { id: "4", date: new Date(Date.now() - 86400000 * 1).toISOString(), amount: 35.00, description: "Uber Ride", accountId: "3", categoryId: "7", type: "expense" },
  { id: "5", date: new Date(Date.now() - 86400000 * 3).toISOString(), amount: 85.00, description: "Dinner with friends", accountId: "3", categoryId: "6", type: "expense" },
];

// Context
interface FinanceContextType {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  addAccount: (account: Omit<Account, "id" | "balance">) => void;
  updateAccount: (id: string, account: Partial<Omit<Account, "balance">>) => void;
  deleteAccount: (id: string) => void;
  addCategory: (category: Omit<Category, "id">) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, "id">) => void;
  addTransactions: (transactions: Omit<Transaction, "id">[]) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  getAccountBalance: (id: string) => number;
  formatCurrency: (amount: number) => string;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  // Load from local storage or use initial data
  // We store "raw" accounts without the computed balance
  const [rawAccounts, setRawAccounts] = useState<Omit<Account, "balance">[]>(() => {
    const saved = localStorage.getItem("accounts");
    // Migration: If saved data doesn't have startingBalance (old version), use balance as startingBalance
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0 && parsed[0].startingBalance === undefined) {
        return parsed.map((acc: any) => ({ ...acc, startingBalance: acc.balance || 0 }));
      }
      return parsed;
    }
    return INITIAL_ACCOUNTS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem("categories");
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("transactions");
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  // Save to local storage on change
  useEffect(() => { localStorage.setItem("accounts", JSON.stringify(rawAccounts)); }, [rawAccounts]);
  useEffect(() => { localStorage.setItem("categories", JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem("transactions", JSON.stringify(transactions)); }, [transactions]);

  // Compute balances
  const accounts = useMemo(() => {
    return rawAccounts.map(account => {
      const accountTransactions = transactions.filter(t => t.accountId === account.id);
      const total = accountTransactions.reduce((sum, t) => {
        return sum + (t.type === 'income' ? t.amount : -t.amount);
      }, 0);
      return {
        ...account,
        balance: (account.startingBalance || 0) + total
      } as Account;
    });
  }, [rawAccounts, transactions]);

  const addAccount = (account: Omit<Account, "id" | "balance">) => {
    const newAccount = { ...account, id: Math.random().toString(36).substr(2, 9) };
    setRawAccounts([...rawAccounts, newAccount]);
  };

  const updateAccount = (id: string, updated: Partial<Omit<Account, "balance">>) => {
    setRawAccounts(rawAccounts.map(acc => acc.id === id ? { ...acc, ...updated } : acc));
  };

  const deleteAccount = (id: string) => {
    setRawAccounts(rawAccounts.filter(acc => acc.id !== id));
  };

  const addCategory = (category: Omit<Category, "id">) => {
    const newCategory = { ...category, id: Math.random().toString(36).substr(2, 9) };
    setCategories([...categories, newCategory]);
  };

  const updateCategory = (id: string, updated: Partial<Category>) => {
    setCategories(categories.map(cat => cat.id === id ? { ...cat, ...updated } : cat));
  };

  const deleteCategory = (id: string) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  const addTransaction = (transaction: Omit<Transaction, "id">) => {
    const newTransaction = { ...transaction, id: Math.random().toString(36).substr(2, 9) };
    setTransactions([newTransaction, ...transactions]);
  };

  const addTransactions = (newTransactions: Omit<Transaction, "id">[]) => {
    const transactionsWithIds = newTransactions.map(t => ({
      ...t,
      id: Math.random().toString(36).substr(2, 9)
    }));
    setTransactions(prev => [...transactionsWithIds, ...prev]);
  };

  const updateTransaction = (id: string, updated: Partial<Transaction>) => {
    setTransactions(transactions.map(tx => tx.id === id ? { ...tx, ...updated } : tx));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(tx => tx.id !== id));
  };

  const getAccountBalance = (id: string) => {
    return accounts.find(a => a.id === id)?.balance || 0;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <FinanceContext.Provider value={{
      accounts, categories, transactions,
      addAccount, updateAccount, deleteAccount,
      addCategory, updateCategory, deleteCategory,
      addTransaction, addTransactions, updateTransaction, deleteTransaction,
      getAccountBalance, formatCurrency
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
}
