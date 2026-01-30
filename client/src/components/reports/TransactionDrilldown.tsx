
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { useTransactionsData } from "@/hooks/use-transactions-data";
import { useFinance, Transaction } from "@/context/FinanceContext";
import { RecurringExpenseCheck } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { TransactionForm, TransactionFormValues } from "@/components/transactions/TransactionForm";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface TransactionDrilldownProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    initialFilters: {
        accountId?: string;
        categoryId?: string;
        type?: string; // 'income' | 'expense'
        status?: string;
        dateFrom?: Date;
        dateTo?: Date;
        tagIds?: number[];

        untagged?: boolean;
        excludeTransfers?: boolean;
    };
}

export function TransactionDrilldown({ isOpen, onClose, title, initialFilters }: TransactionDrilldownProps) {
    const { transactions, accounts, categories, updateTransaction, deleteTransaction, formatCurrency } = useFinance();
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null);

    // Fetch checks for recurring expense matching logic (reuse from Transactions page)
    const { data: checks } = useQuery<RecurringExpenseCheck[]>({
        queryKey: ['reconciliation', 'all'],
        queryFn: async () => {
            const res = await fetch('/api/reconciliation/checks');
            if (!res.ok) throw new Error('Failed to fetch checks');
            return res.json();
        },
        enabled: isOpen, // Only fetch when open
    });

    const {
        filteredTransactions,
        sortedTransactions,
        paginatedTransactions,
        matchedTransactions,
        filterState,
        sortState,
        paginationState
    } = useTransactionsData({
        transactions,
        accounts,
        categories,
        checks,
        initialFilters,
        itemsPerPage: 20
    });

    const handleEdit = (transaction: Transaction) => {
        setEditingId(transaction.id);
        setIsEditOpen(true);
    };

    const handleDelete = async () => {
        if (transactionToDelete !== null) {
            await deleteTransaction(transactionToDelete);
            setTransactionToDelete(null);
        }
    };

    // We can just omit Delete for now or implement it fully.
    // Let's pass a dummy onDelete or implement it if we import deleteTransaction.

    // deleteTransaction is now destructured from the first useFinance() call above

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onEditSubmit = async (data: TransactionFormValues | any) => {
        if (editingId) {
            const formattedData = {
                ...data,
                amount: data.amount.toString(),
                date: format(data.date, "yyyy-MM-dd'T'HH:mm:ss"),
            };
            await updateTransaction(editingId, formattedData);
            setIsEditOpen(false);
            setEditingId(null);
        }
    }


    const toggleSelection = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleAll = () => {
        if (selectedIds.size === paginatedTransactions.length) {
            setSelectedIds(new Set());
        } else {
            const newSet = new Set<number>();
            paginatedTransactions.forEach(t => newSet.add(t.id));
            setSelectedIds(newSet);
        }
    };

    const toggleAllFiltered = () => {
        // Logic for toggle all filtered
        if (selectedIds.size === sortedTransactions.length) {
            setSelectedIds(new Set());
        } else {
            const newSet = new Set<number>();
            sortedTransactions.forEach(t => newSet.add(t.id));
            setSelectedIds(newSet);
        }
    }


    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[1200px] h-[80vh] flex flex-col">
                <DialogHeader className="px-1">
                    <DialogTitle>{title || "Transactions Detail"}</DialogTitle>
                    <DialogDescription>
                        {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 mt-4 flex flex-col">
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
                        allPageSelected={paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedIds.has(t.id))}
                        somePageSelected={paginatedTransactions.some(t => selectedIds.has(t.id)) && !(paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedIds.has(t.id)))}
                        allFilteredSelected={selectedIds.size > 0 && selectedIds.size === sortedTransactions.length}
                        isFiltered={filterState.hasActiveFilters}
                        sortField={sortState.sortField}
                        sortDirection={sortState.sortDirection}
                        onSort={sortState.handleSort}
                        currentPage={paginationState.currentPage}
                        totalPages={paginationState.totalPages}
                        onPageChange={paginationState.setCurrentPage}
                        itemsPerPage={paginationState.itemsPerPage}
                        onEdit={handleEdit}
                        onDelete={(id) => setTransactionToDelete(id)} // Enable delete
                    />
                </div>
            </DialogContent>

            <TransactionForm
                isOpen={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSubmit={onEditSubmit}
                initialData={editingId ? transactions.find(t => t.id === editingId) ? {
                    amount: parseFloat(transactions.find(t => t.id === editingId)!.amount),
                    description: transactions.find(t => t.id === editingId)!.description,
                    accountId: transactions.find(t => t.id === editingId)!.accountId,
                    categoryId: transactions.find(t => t.id === editingId)!.categoryId,
                    date: new Date(transactions.find(t => t.id === editingId)!.date),
                    type: transactions.find(t => t.id === editingId)!.type as "income" | "expense",
                } : null : null}
                accounts={accounts}
                categories={categories}
                mode={editingId ? "edit" : "create"}
            />

            <ConfirmDialog
                open={transactionToDelete !== null}
                onOpenChange={(open) => !open && setTransactionToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Transaction"
                description="Are you sure you want to delete this transaction?"
                confirmText="Delete"
                variant="destructive"
            />

        </Dialog>
    );
}
