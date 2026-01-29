import { useFinance, Transaction } from "@/context/FinanceContext";

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Download, ArrowLeftRight, Edit2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { RecurringExpenseCheck } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useTransactionsData } from "@/hooks/use-transactions-data";
import { usePendingStagingCount, useReconciliationChecks } from "@/hooks/queries";
import { TransactionForm, type TransactionFormValues, type BulkTransactionFormValues } from "@/components/transactions/TransactionForm";
import { TransferForm, TransferFormValues } from "@/components/transactions/TransferForm";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { BulkTagDialog } from "@/components/transactions/BulkTagDialog";
import { ImportedTransactions } from "@/components/ImportedTransactions";
import { RefreshCw, List, Tag } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Transactions() {
  const { transactions, accounts, categories, tags, addTransaction, addCategory, addTransfer, updateTransaction, updateTransactions, deleteTransaction, deleteTransactions, formatCurrency, isLoading } = useFinance();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isBulkTagDialogOpen, setIsBulkTagDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'bulk-edit'>('create');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editFormData, setEditFormData] = useState<TransactionFormValues | null>(null);

  // New state for Sync All and Review Staging
  const [reviewAccountId, setReviewAccountId] = useState<number | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const { toast } = useToast();

  const { data: pendingStagingCount = 0 } = usePendingStagingCount();

  const handleSyncAll = async () => {
    const linkedAccounts = accounts.filter(a => a.gocardlessAccountId);
    if (linkedAccounts.length === 0) {
      toast({ title: "No linked accounts", description: "Link a bank account first.", variant: "destructive" });
      return;
    }

    setIsSyncingAll(true);
    setSyncProgress(0);
    let completed = 0;
    let errors = 0;

    for (const account of linkedAccounts) {
      try {
        await apiRequest("POST", `/api/gocardless/sync/${account.id}`);
      } catch (error) {
        console.error(`Failed to sync account ${account.name}`, error);
        errors++;
      } finally {
        completed++;
        setSyncProgress((completed / linkedAccounts.length) * 100);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/transactions/staging"] });

    setIsSyncingAll(false);
    toast({
      title: "Sync Complete",
      description: `Synced ${linkedAccounts.length} accounts. ${errors > 0 ? `${errors} failed.` : "All successful."}`,
      variant: errors > 0 ? "destructive" : "default"
    });
  };

  const { data: checks } = useReconciliationChecks();

  const {
    filteredTransactions,
    sortedTransactions,
    paginatedTransactions,
    matchedTransactions,
    filterState,
    sortState,
    paginationState
  } = useTransactionsData({ transactions, accounts, categories, checks });

  const transferCategory = categories.find(c => c.name.toLowerCase() === "trasferimenti" || c.name.toLowerCase() === "transfer");

  const onSubmit = async (data: TransactionFormValues | BulkTransactionFormValues, dirtyFields?: Partial<Record<keyof TransactionFormValues, boolean>>) => {
    if (formMode === 'bulk-edit') {
      const updates: any = {};
      if (dirtyFields) {
        Object.keys(dirtyFields).forEach(key => {
          if (dirtyFields[key as keyof TransactionFormValues]) {
            const value = (data as any)[key];
            if (key === 'date' && value instanceof Date) {
              updates[key] = format(value, "yyyy-MM-dd'T'HH:mm:ss");
            } else {
              updates[key] = value;
            }
          }
        });
      }

      // Ensure we don't update amount/desc in bulk edit even if they were somehow dirty
      delete updates.amount;
      delete updates.description;

      if (Object.keys(updates).length > 0) {
        await updateTransactions(Array.from(selectedIds), updates);
        setSelectedIds(new Set());
        toast({ title: "Transactions updated", description: `${selectedIds.size} transactions updated successfully.` });
      }

      setIsDialogOpen(false);
      return;
    }

    const formData = data as TransactionFormValues;
    const formattedData = {
      ...formData,
      amount: formData.amount.toString(),
      date: format(formData.date, "yyyy-MM-dd'T'HH:mm:ss"),
    };

    if (editingId) {
      await updateTransaction(editingId, formattedData);
    } else {
      await addTransaction(formattedData);
    }
    setIsDialogOpen(false);
    setEditingId(null);
    setFormMode('create');
    setEditFormData(null);
  };

  const onTransferSubmit = async (data: TransferFormValues) => {
    let transferCategoryId = transferCategory?.id;

    // If transfer category doesn't exist, create it
    if (!transferCategory) {
      try {
        const newCategory = await addCategory({
          name: "Transfers",
          type: "transfer",
          color: "#94a3b8",
          icon: "ArrowLeftRight",
        });
        transferCategoryId = newCategory.id;
      } catch (error) {
        alert("Failed to create transfer category. Please create it manually in settings.");
        return;
      }
    }

    if (!transferCategoryId) {
      alert("Category 'Transfers' not found. Please create it first in settings.");
      return;
    }

    await addTransfer({
      amount: data.amount.toString(),
      description: data.description,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      categoryId: transferCategoryId,
      date: format(data.date, "yyyy-MM-dd'T'HH:mm:ss"),
    });

    setIsTransferDialogOpen(false);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setFormMode('edit');
    setEditFormData({
      amount: parseFloat(transaction.amount),
      description: transaction.description,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      date: new Date(transaction.date),
      type: transaction.type as "income" | "expense",
      tagIds: transaction.tags?.map(t => t.id) || [],
    });
    setIsDialogOpen(true);
  };

  const handleBulkEdit = () => {
    setFormMode('bulk-edit');
    setEditingId(null);
    setEditFormData(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      await deleteTransaction(id);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} transactions?`)) {
      await deleteTransactions(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkDeleteFiltered = async () => {
    const count = sortedTransactions.length;
    if (confirm(`Are you sure you want to delete all ${count} filtered transactions?`)) {
      const idsToDelete = sortedTransactions.map(t => t.id);
      await deleteTransactions(idsToDelete);
      setSelectedIds(new Set());
    }
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const allPageSelected = paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedIds.has(t.id));
  const somePageSelected = paginatedTransactions.some(t => selectedIds.has(t.id)) && !allPageSelected;

  const toggleAll = () => {
    if (allPageSelected) {
      const newSelected = new Set(selectedIds);
      paginatedTransactions.forEach(t => newSelected.delete(t.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      paginatedTransactions.forEach(t => newSelected.add(t.id));
      setSelectedIds(newSelected);
    }
  };

  const allFilteredSelected = sortedTransactions.length > 0 && sortedTransactions.every(t => selectedIds.has(t.id));

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const newSelected = new Set(selectedIds);
      sortedTransactions.forEach(t => newSelected.delete(t.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      sortedTransactions.forEach(t => newSelected.add(t.id));
      setSelectedIds(newSelected);
    }
  };

  const handleDownload = () => {
    const transactionsToExport = selectedIds.size > 0
      ? transactions.filter(t => selectedIds.has(t.id))
      : sortedTransactions;

    if (transactionsToExport.length === 0) {
      return;
    }

    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const headers = ['Date', 'Description', 'Account', 'Category', 'Type', 'Amount'];
    const rows = transactionsToExport.map(t => {
      const account = accounts.find(a => a.id === t.accountId);
      const category = categories.find(c => c.id === t.categoryId);
      const signedAmount = t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount);

      return [
        format(new Date(t.date), "yyyy-MM-dd"),
        escapeCSV(t.description),
        escapeCSV(account?.name || 'Unknown'),
        escapeCSV(category?.name || 'Unknown'),
        t.type,
        signedAmount.toFixed(2)
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6 h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Transactions</h1>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <Button variant="outline" className="gap-2 px-3" onClick={() => setIsBulkTagDialogOpen(true)} title={`Manage tags for ${selectedIds.size} transactions`}>
                  <Tag size={16} /> Tags
                </Button>
                {selectedIds.size > 1 && (
                  <Button variant="outline" className="gap-2 px-3" onClick={handleBulkEdit} title={`Edit ${selectedIds.size} transactions`}>
                    <Edit2 size={16} /> Edit
                  </Button>
                )}
                <Button variant="destructive" className="gap-2 px-3" onClick={handleBulkDelete} data-testid="button-bulk-delete" title={`Delete ${selectedIds.size} transactions`}>
                  <Trash2 size={16} /> Selected ({selectedIds.size})
                </Button>
              </>
            )}

            {filterState.hasActiveFilters && sortedTransactions.length > 0 && (
              <Button variant="destructive" className="gap-2 px-3" onClick={handleBulkDeleteFiltered} data-testid="button-bulk-delete-filtered" title={`Delete all ${sortedTransactions.length} filtered transactions`}>
                <Trash2 size={16} /> All Filtered Results ({sortedTransactions.length})
              </Button>
            )}

            <Button
              variant="outline"
              className="gap-2 px-3"
              onClick={handleDownload}
              disabled={selectedIds.size === 0 && sortedTransactions.length === 0}
              data-testid="button-download-transactions"
              title={`Download ${(selectedIds.size > 0 ? selectedIds.size : sortedTransactions.length)} transactions`}
            >
              <Download size={16} /> {(selectedIds.size > 0 ? selectedIds.size : sortedTransactions.length)}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setReviewAccountId(-1)} // -1 or special flag for "all"
              title="Review Staging Transactions"
              className="relative"
            >
              <List size={16} />
              {pendingStagingCount > 0 && (
                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                  {pendingStagingCount}
                </div>
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="relative overflow-hidden"
              onClick={handleSyncAll}
              disabled={isSyncingAll}
              title={isSyncingAll ? `Syncing ${Math.round(syncProgress)}%` : "Sync All Accounts"}
            >
              {isSyncingAll && (
                <div
                  className="absolute inset-0 bg-primary/10 transition-all duration-300 ease-in-out"
                  style={{ width: `${syncProgress}%` }}
                />
              )}
              <RefreshCw size={16} className={isSyncingAll ? "animate-spin" : ""} />
            </Button>

            <Button size="icon" onClick={() => { setIsDialogOpen(true); setEditingId(null); setFormMode('create'); setEditFormData(null); }} data-testid="button-add-transaction" title="Add Transaction">
              <Plus size={16} />
            </Button>

            <Button variant="outline" size="icon" onClick={() => setIsTransferDialogOpen(true)} data-testid="button-add-transfer" title="Transfer">
              <ArrowLeftRight size={16} />
            </Button>
          </div>
        </div>

        <TransactionFilters
          {...filterState}
          accounts={accounts}
          categories={categories}
          tags={tags}
          resultCount={filteredTransactions.length}
          totalCount={transactions.length}
        />

        <TransactionsTable
          paginatedTransactions={paginatedTransactions}
          sortedTransactions={sortedTransactions}
          totalTransactions={transactions.length}
          accounts={accounts}
          categories={categories}
          matchedTransactions={matchedTransactions}
          formatCurrency={formatCurrency}
          selectedIds={selectedIds}
          toggleSelection={toggleSelection}
          toggleAll={toggleAll}
          toggleAllFiltered={toggleAllFiltered}
          allPageSelected={allPageSelected}
          somePageSelected={somePageSelected}
          allFilteredSelected={allFilteredSelected}
          isFiltered={filterState.hasActiveFilters || sortedTransactions.length > paginatedTransactions.length}
          sortField={sortState.sortField}
          sortDirection={sortState.sortDirection}
          onSort={sortState.handleSort}
          currentPage={paginationState.currentPage}
          totalPages={paginationState.totalPages}
          onPageChange={paginationState.setCurrentPage}
          itemsPerPage={paginationState.itemsPerPage}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <TransactionForm
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={onSubmit}
          initialData={editFormData}
          accounts={accounts}
          categories={categories}
          mode={formMode}
        />

        <TransferForm
          isOpen={isTransferDialogOpen}
          onOpenChange={setIsTransferDialogOpen}
          onSubmit={onTransferSubmit}
          accounts={accounts}
        />

        <BulkTagDialog
          isOpen={isBulkTagDialogOpen}
          onOpenChange={setIsBulkTagDialogOpen}
          selectedIds={Array.from(selectedIds)}
        />

        {reviewAccountId !== null && (
          <ImportedTransactions
            accountId={reviewAccountId === -1 ? null : reviewAccountId}
            isOpen={reviewAccountId !== null}
            onOpenChange={(open) => !open && setReviewAccountId(null)}
          />
        )}
      </div>
    </Layout>
  );
}
