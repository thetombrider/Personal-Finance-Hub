import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import * as api from "@/lib/api";
import { invalidationHelpers } from "@/lib/queryInvalidation";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import type { TransferData } from "@/lib/api";
import type { InsertAccount, InsertCategory, InsertTransaction, Account as DbAccount, Category as DbCategory, Transaction as DbTransaction, Tag as DbTag, InsertTag } from "@shared/schema";

// Types
export type AccountType = "checking" | "savings" | "credit" | "investment" | "cash";

export interface Account extends Omit<DbAccount, "type"> {
  type: AccountType;
  balance: number;
}

export interface Category extends Omit<DbCategory, "type"> {
  type: "income" | "expense" | "transfer";
}

export interface Tag extends DbTag { }

export interface Transaction extends Omit<DbTransaction, "type"> {
  type: "income" | "expense";
  tags?: Tag[];
}

// Context
interface FinanceContextType {
  accounts: Account[];
  categories: Category[];
  tags: Tag[];
  transactions: Transaction[];
  isLoading: boolean;
  addAccount: (account: Omit<InsertAccount, "id">) => Promise<any>;
  addAccounts: (accounts: Omit<InsertAccount, "id">[]) => Promise<any>;
  updateAccount: (id: number, account: Partial<Omit<InsertAccount, "id">>) => Promise<void>;
  deleteAccount: (id: number) => Promise<void>;
  addCategory: (category: Omit<InsertCategory, "id">) => Promise<any>;
  addCategories: (categories: Omit<InsertCategory, "id">[]) => Promise<any>;
  updateCategory: (id: number, category: Partial<InsertCategory>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  addTag: (tag: Omit<InsertTag, "id" | "userId">) => Promise<any>;
  updateTag: (id: number, tag: Partial<InsertTag>) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
  addTransaction: (transaction: Omit<InsertTransaction, "id"> & { tagIds?: number[] }) => Promise<any>;
  addTransactions: (transactions: Omit<InsertTransaction, "id">[]) => Promise<any>;
  addTransfer: (transfer: TransferData) => Promise<void>;
  updateTransaction: (id: number, transaction: Partial<InsertTransaction> & { tagIds?: number[] }) => Promise<void>;
  updateTransactions: (ids: number[], updates: Partial<InsertTransaction>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  deleteTransactions: (ids: number[]) => Promise<void>;
  clearTransactions: () => Promise<void>;
  batchAssignTags: (transactionIds: number[], tagIds: number[]) => Promise<void>;
  batchRemoveTags: (transactionIds: number[], tagIds: number[]) => Promise<void>;
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

  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tags");
      return res.json();
    },
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: api.fetchTransactions,
  });

  const isLoading = accountsLoading || categoriesLoading || transactionsLoading || tagsLoading;

  // Compute balances
  const accounts = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      invalidationHelpers.accounts(queryClient);
    },
  });

  const createAccountsBulkMutation = useMutation({
    mutationFn: api.createAccountsBulk,
    onSuccess: () => {
      invalidationHelpers.accounts(queryClient);
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, account }: { id: number; account: Partial<InsertAccount> }) =>
      api.updateAccount(id, account),
    onSuccess: () => {
      invalidationHelpers.accounts(queryClient);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => {
      invalidationHelpers.accounts(queryClient);
    },
  });

  // Mutations - Categories
  const createCategoryMutation = useMutation({
    mutationFn: api.createCategory,
    onSuccess: () => {
      invalidationHelpers.categories(queryClient);
    },
  });

  const createCategoriesBulkMutation = useMutation({
    mutationFn: api.createCategoriesBulk,
    onSuccess: () => {
      invalidationHelpers.categories(queryClient);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, category }: { id: number; category: Partial<InsertCategory> }) =>
      api.updateCategory(id, category),
    onSuccess: () => {
      invalidationHelpers.categories(queryClient);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: api.deleteCategory,
    onSuccess: () => {
      invalidationHelpers.categories(queryClient);
    },
  });

  // Mutations - Tags
  const createTagMutation = useMutation({
    mutationFn: async (tag: Omit<InsertTag, "id" | "userId">) => {
      const res = await apiRequest("POST", "/api/tags", tag);
      return res.json();
    },
    onSuccess: () => {
      invalidationHelpers.tags(queryClient);
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, tag }: { id: number; tag: Partial<InsertTag> }) => {
      const res = await apiRequest("PATCH", `/api/tags/${id}`, tag);
      return res.json();
    },
    onSuccess: () => {
      invalidationHelpers.tags(queryClient);
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tags/${id}`);
    },
    onSuccess: () => {
      invalidationHelpers.tags(queryClient);
    },
  });

  const batchAssignTagsMutation = useMutation({
    mutationFn: async ({ transactionIds, tagIds }: { transactionIds: number[], tagIds: number[] }) => {
      await apiRequest("POST", "/api/tags/batch", { transactionIds, tagIds });
    },
    onSuccess: () => {
      invalidationHelpers.transactions(queryClient);
    },
  });

  const batchRemoveTagsMutation = useMutation({
    mutationFn: async ({ transactionIds, tagIds }: { transactionIds: number[], tagIds: number[] }) => {
      await apiRequest("POST", "/api/tags/batch-delete", { transactionIds, tagIds });
    },
    onSuccess: () => {
      invalidationHelpers.transactions(queryClient);
    },
  });

  // Mutations - Transactions
  const createTransactionMutation = useMutation({
    mutationFn: async (transaction: Omit<InsertTransaction, "id"> & { tagIds?: number[] }) => {
      // Create transaction first
      const { tagIds, ...txData } = transaction;
      const newTx = await api.createTransaction(txData);

      // If tags provided, associate them
      if (tagIds && tagIds.length > 0) {
        await apiRequest("POST", `/api/transactions/${newTx.id}/tags`, { tagIds });
      }
      return newTx;
    },
    onSuccess: () => {
      invalidationHelpers.transactions(queryClient);
    },
  });

  const createTransactionsBulkMutation = useMutation({
    mutationFn: api.createTransactionsBulk,
    onSuccess: () => {
      invalidationHelpers.transactions(queryClient);
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: api.createTransfer,
    onSuccess: () => {
      invalidationHelpers.transactions(queryClient);
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, transaction }: { id: number; transaction: Partial<InsertTransaction> & { tagIds?: number[] } }) => {
      const { tagIds, ...txData } = transaction;
      await api.updateTransaction(id, txData);

      if (tagIds !== undefined) {
        await apiRequest("POST", `/api/transactions/${id}/tags`, { tagIds });
      }
    },
    onSuccess: () => {
      invalidationHelpers.transactions(queryClient);
    },
  });

  const updateTransactionsBulkMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: number[]; updates: Partial<InsertTransaction> }) => {
      await api.updateTransactionsBulk(ids, updates);
    },
    onSuccess: () => {
      invalidationHelpers.transactions(queryClient);
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: api.deleteTransaction,
    onSuccess: () => {
      invalidationHelpers.transactions(queryClient);
    },
  });

  const deleteTransactionsBulkMutation = useMutation({
    mutationFn: api.deleteTransactionsBulk,
    onSuccess: () => {
      invalidationHelpers.transactions(queryClient);
    },
  });

  const clearTransactionsMutation = useMutation({
    mutationFn: api.clearTransactions,
    onSuccess: () => {
      invalidationHelpers.transactions(queryClient);
    },
  });

  // Helper functions
  const addAccount = async (account: Omit<InsertAccount, "id">) => {
    return await createAccountMutation.mutateAsync(account);
  };

  const addAccounts = async (accounts: Omit<InsertAccount, "id">[]) => {
    return await createAccountsBulkMutation.mutateAsync(accounts);
  };

  const updateAccount = async (id: number, account: Partial<Omit<InsertAccount, "id">>) => {
    await updateAccountMutation.mutateAsync({ id, account });
  };

  const deleteAccount = async (id: number) => {
    await deleteAccountMutation.mutateAsync(id);
  };

  const addCategory = async (category: Omit<InsertCategory, "id">) => {
    return await createCategoryMutation.mutateAsync(category);
  };

  const addCategories = async (categories: Omit<InsertCategory, "id">[]) => {
    return await createCategoriesBulkMutation.mutateAsync(categories);
  };

  const updateCategory = async (id: number, category: Partial<InsertCategory>) => {
    await updateCategoryMutation.mutateAsync({ id, category });
  };

  const deleteCategory = async (id: number) => {
    await deleteCategoryMutation.mutateAsync(id);
  };

  const addTag = async (tag: Omit<InsertTag, "id" | "userId">) => {
    return await createTagMutation.mutateAsync(tag);
  };

  const updateTag = async (id: number, tag: Partial<InsertTag>) => {
    await updateTagMutation.mutateAsync({ id, tag });
  };

  const deleteTag = async (id: number) => {
    await deleteTagMutation.mutateAsync(id);
  };

  const batchAssignTags = async (transactionIds: number[], tagIds: number[]) => {
    await batchAssignTagsMutation.mutateAsync({ transactionIds, tagIds });
  };

  const batchRemoveTags = async (transactionIds: number[], tagIds: number[]) => {
    await batchRemoveTagsMutation.mutateAsync({ transactionIds, tagIds });
  };

  const addTransaction = async (transaction: Omit<InsertTransaction, "id"> & { tagIds?: number[] }) => {
    return await createTransactionMutation.mutateAsync(transaction);
  };

  const addTransactions = async (transactions: Omit<InsertTransaction, "id">[]) => {
    return await createTransactionsBulkMutation.mutateAsync(transactions);
  };

  const addTransfer = async (transfer: TransferData) => {
    await createTransferMutation.mutateAsync(transfer);
  };

  const updateTransaction = async (id: number, transaction: Partial<InsertTransaction> & { tagIds?: number[] }) => {
    await updateTransactionMutation.mutateAsync({ id, transaction });
  };

  const updateTransactions = async (ids: number[], updates: Partial<InsertTransaction>) => {
    await updateTransactionsBulkMutation.mutateAsync({ ids, updates });
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

  const formatCurrencyValue = (amount: number) => {
    return formatCurrencyUtil(amount);
  };

  return (
    <FinanceContext.Provider value={{
      accounts, categories, tags, transactions, isLoading,
      addAccount, addAccounts, updateAccount, deleteAccount,
      addCategory, addCategories, updateCategory, deleteCategory,
      addTag, updateTag, deleteTag, batchAssignTags, batchRemoveTags,
      addTransaction, addTransactions, addTransfer, updateTransaction, updateTransactions, deleteTransaction, deleteTransactions, clearTransactions,
      getAccountBalance, formatCurrency: formatCurrencyValue
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

