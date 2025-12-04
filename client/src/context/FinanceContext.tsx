import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import type { TransferData } from "@/lib/api";
import type { InsertAccount, InsertCategory, InsertTransaction } from "@shared/schema";

// Types
export type AccountType = "checking" | "savings" | "credit" | "investment" | "cash";

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  startingBalance: string;
  balance: number;
  currency: string;
  color: string;
  creditLimit?: string | null;
}

export interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string;
  icon?: string | null;
  budget?: string | null;
}

export interface Transaction {
  id: number;
  date: string;
  amount: string;
  description: string;
  accountId: number;
  categoryId: number;
  type: "income" | "expense";
  linkedTransactionId?: number | null;
}

// Context
interface FinanceContextType {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  isLoading: boolean;
  addAccount: (account: Omit<InsertAccount, "id">) => Promise<void>;
  updateAccount: (id: number, account: Partial<Omit<InsertAccount, "id">>) => Promise<void>;
  deleteAccount: (id: number) => Promise<void>;
  addCategory: (category: Omit<InsertCategory, "id">) => Promise<void>;
  updateCategory: (id: number, category: Partial<InsertCategory>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  addTransaction: (transaction: Omit<InsertTransaction, "id">) => Promise<void>;
  addTransactions: (transactions: Omit<InsertTransaction, "id">[]) => Promise<void>;
  addTransfer: (transfer: TransferData) => Promise<void>;
  updateTransaction: (id: number, transaction: Partial<InsertTransaction>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  deleteTransactions: (ids: number[]) => Promise<void>;
  clearTransactions: () => Promise<void>;
  getAccountBalance: (id: number) => number;
  formatCurrency: (amount: number) => string;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Fetch data
  const { data: rawAccounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.fetchAccounts,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: api.fetchCategories,
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: api.fetchTransactions,
  });

  const isLoading = accountsLoading || categoriesLoading || transactionsLoading;

  // Compute balances
  const accounts = useMemo(() => {
    return rawAccounts.map((account: any) => {
      const accountTransactions = transactions.filter((t: Transaction) => t.accountId === account.id);
      const total = accountTransactions.reduce((sum: number, t: Transaction) => {
        return sum + (t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount));
      }, 0);
      return {
        ...account,
        balance: parseFloat(account.startingBalance || "0") + total
      } as Account;
    });
  }, [rawAccounts, transactions]);

  // Mutations - Accounts
  const createAccountMutation = useMutation({
    mutationFn: api.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, account }: { id: number; account: Partial<InsertAccount> }) =>
      api.updateAccount(id, account),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  // Mutations - Categories
  const createCategoryMutation = useMutation({
    mutationFn: api.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, category }: { id: number; category: Partial<InsertCategory> }) =>
      api.updateCategory(id, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: api.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  // Mutations - Transactions
  const createTransactionMutation = useMutation({
    mutationFn: api.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const createTransactionsBulkMutation = useMutation({
    mutationFn: api.createTransactionsBulk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: api.createTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: ({ id, transaction }: { id: number; transaction: Partial<InsertTransaction> }) =>
      api.updateTransaction(id, transaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: api.deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const deleteTransactionsBulkMutation = useMutation({
    mutationFn: api.deleteTransactionsBulk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const clearTransactionsMutation = useMutation({
    mutationFn: api.clearTransactions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  // Helper functions
  const addAccount = async (account: Omit<InsertAccount, "id">) => {
    await createAccountMutation.mutateAsync(account);
  };

  const updateAccount = async (id: number, account: Partial<Omit<InsertAccount, "id">>) => {
    await updateAccountMutation.mutateAsync({ id, account });
  };

  const deleteAccount = async (id: number) => {
    await deleteAccountMutation.mutateAsync(id);
  };

  const addCategory = async (category: Omit<InsertCategory, "id">) => {
    await createCategoryMutation.mutateAsync(category);
  };

  const updateCategory = async (id: number, category: Partial<InsertCategory>) => {
    await updateCategoryMutation.mutateAsync({ id, category });
  };

  const deleteCategory = async (id: number) => {
    await deleteCategoryMutation.mutateAsync(id);
  };

  const addTransaction = async (transaction: Omit<InsertTransaction, "id">) => {
    await createTransactionMutation.mutateAsync(transaction);
  };

  const addTransactions = async (transactions: Omit<InsertTransaction, "id">[]) => {
    await createTransactionsBulkMutation.mutateAsync(transactions);
  };

  const addTransfer = async (transfer: TransferData) => {
    await createTransferMutation.mutateAsync(transfer);
  };

  const updateTransaction = async (id: number, transaction: Partial<InsertTransaction>) => {
    await updateTransactionMutation.mutateAsync({ id, transaction });
  };

  const deleteTransaction = async (id: number) => {
    await deleteTransactionMutation.mutateAsync(id);
  };

  const deleteTransactions = async (ids: number[]) => {
    await deleteTransactionsBulkMutation.mutateAsync(ids);
  };

  const clearTransactions = async () => {
    await clearTransactionsMutation.mutateAsync();
  };

  const getAccountBalance = (id: number) => {
    return accounts.find((a: Account) => a.id === id)?.balance || 0;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <FinanceContext.Provider value={{
      accounts, categories, transactions, isLoading,
      addAccount, updateAccount, deleteAccount,
      addCategory, updateCategory, deleteCategory,
      addTransaction, addTransactions, addTransfer, updateTransaction, deleteTransaction, deleteTransactions, clearTransactions,
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
